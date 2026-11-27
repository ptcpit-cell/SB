using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SB_Services.DTO;
using SB_Services.Services.Requests;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequestController(
    IRequestServices requestServices,
    IThongBaoNotifier notifier,
    ILogger<RequestController> logger,
    IHostEnvironment env) : BaseController
    {
        private readonly IRequestServices _requestServices = requestServices;
        private readonly IThongBaoNotifier _notifier = notifier;
        private readonly ILogger<RequestController> _logger = logger;
        private readonly IHostEnvironment _env = env;
        // =====================================================================
        // Form tạo yêu cầu
        // =====================================================================
        private static readonly HashSet<string> AllowedExt = new()
            { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".zip" };
        [HttpGet("[action]")]
        public async Task<IActionResult> GetLanhDaoChon()
        {
            var result = await _requestServices.GetLanhDaoChonAsync(CurrentUserId);
            return Ok(result);
        }

        // id = LanhDaoId; tuNgay, denNgay trong query
        [HttpGet("[action]/{id}")]
        public async Task<IActionResult> GetLichBan(int id, [FromQuery] DateTime tuNgay, [FromQuery] DateTime denNgay)
        {
            try
            {
                var result = await _requestServices.GetLichBanAsync(CurrentUserId, id, tuNgay, denNgay);
                return Ok(result);
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =====================================================================
        // Ghi
        // =====================================================================

        [HttpPost("[action]")]
        public async Task<IActionResult> Tao([FromBody] TaoYeuCauRequest req)
        {
            if (req.TepDinhKems.Any(t => !t.DuongDan.StartsWith("yeu-cau/") || t.DuongDan.Contains("..")))
                return BadRequest(new { message = "Tệp đính kèm không hợp lệ." });

            try
            {
                var result = await _requestServices.TaoAsync(CurrentUserId, req);

                // Lưu nháp thì TroLyCanBao rỗng, không có gì để báo
                await NotifyAsync(
                    result.TroLyCanBao.Select(x => x.UserId),
                    result.TroLyCanBao.Count == 1
                        ? $"Có yêu cầu {result.TroLyCanBao[0].MaYeuCau} mới cần xử lý"
                        : "Có yêu cầu mới cần xử lý");

                foreach (var item in result.TroLyCanBao.Where(x => x.UserId > 0))
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = item.UserId,
                        TieuDe = "Yêu cầu trình mới cần xếp lịch",
                        NoiDung = $"Có yêu cầu \"{req.TieuDe}\" ({item.MaYeuCau}) mới gửi tới hàng chờ.",
                        LoaiSuKien = "YEUCAU_MOI",
                        YeuCauId = item.YeuCauId,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok(result.DaTao);
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> SendYeuCau(int id)
        {
            try
            {
                var rows = await _requestServices.GuiAsync(CurrentUserId, id);

                var first = rows.FirstOrDefault();
                var ma = first?.MaYeuCau;
                var troLyIds = rows.Select(x => x.TroLyUserId).Where(x => x > 0).Distinct().ToList();
                await NotifyAsync(troLyIds, $"Có yêu cầu {ma} mới cần xử lý");

                foreach (var tlId in troLyIds)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = tlId,
                        TieuDe = "Yêu cầu trình mới cần xếp lịch",
                        NoiDung = $"Nhân viên vừa gửi yêu cầu \"{first?.TieuDe}\" ({ma}) tới hàng chờ.",
                        LoaiSuKien = "YEUCAU_MOI",
                        YeuCauId = first?.YeuCauId ?? id,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok();
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> CancelYeuCau(int id, [FromBody] HuyYeuCauRequest req)
        {
            try
            {
                var rows = await _requestServices.HuyAsync(CurrentUserId, id, req.LyDo);

                // Rỗng nếu hủy bản nháp. Chỉ báo lãnh đạo khi yêu cầu đã được xếp lịch
                var first = rows.FirstOrDefault();
                var ma = first?.MaYeuCau;
                var troLyIds = rows.Select(x => x.TroLyUserId).Where(x => x > 0).Distinct().ToList();
                var lanhDaoIds = rows.Where(x => x.CoLich && x.LanhDaoUserId > 0).Select(x => x.LanhDaoUserId).Distinct().ToList();

                await NotifyAsync(troLyIds.Concat(lanhDaoIds), $"Yêu cầu {ma} đã bị nhân viên hủy");

                foreach (var tlId in troLyIds)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = tlId,
                        TieuDe = "Nhân viên đã hủy yêu cầu",
                        NoiDung = $"Yêu cầu \"{first?.TieuDe}\" ({ma}) đã bị hủy." + (string.IsNullOrWhiteSpace(req.LyDo) ? "" : $" Lý do: {req.LyDo.Trim()}"),
                        LoaiSuKien = "DA_HUY_TRO_LY",
                        YeuCauId = first?.YeuCauId ?? id,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                foreach (var ldId in lanhDaoIds)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = ldId,
                        TieuDe = "Buổi trình đã bị hủy",
                        NoiDung = $"Yêu cầu \"{first?.TieuDe}\" ({ma}) đã bị nhân viên hủy." + (string.IsNullOrWhiteSpace(req.LyDo) ? "" : $" Lý do: {req.LyDo.Trim()}"),
                        LoaiSuKien = "DA_HUY_LANH_DAO",
                        YeuCauId = first?.YeuCauId ?? id,
                        RouteUrl = "/lanh-dao",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok();
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> DeleteYeuCau(int id)
        {
            try
            {
                await _requestServices.XoaAsync(CurrentUserId, id);
                return Ok();
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> BoSung(int id, [FromBody] BoSungRequest req)
        {
            try
            {
                var rows = await _requestServices.BoSungAsync(CurrentUserId, id, req);

                // Ưu tiên trợ lý đang xử lý yêu cầu, chưa có thì báo tất cả trợ lý của lãnh đạo
                var first = rows.FirstOrDefault();
                var troLyXuLy = first?.TroLyXuLyId;
                var nguoiNhan = troLyXuLy.HasValue && troLyXuLy.Value > 0
                    ? new[] { troLyXuLy.Value }
                    : rows.Select(x => x.TroLyUserId).Where(x => x > 0).Distinct().ToArray();

                await NotifyAsync(nguoiNhan, $"Yêu cầu {first?.MaYeuCau} đã được bổ sung thông tin");

                foreach (var tlId in nguoiNhan)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = tlId,
                        TieuDe = "Nhân viên đã bổ sung hồ sơ",
                        NoiDung = $"Yêu cầu \"{first?.TieuDe}\" ({first?.MaYeuCau}) đã được bổ sung thông tin.",
                        LoaiSuKien = "BO_SUNG",
                        YeuCauId = first?.YeuCauId ?? id,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok();
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> Sua(int id, [FromBody] SuaYeuCauRequest req)
        {
            if (req.TepDinhKems.Any(t => !t.DuongDan.StartsWith("yeu-cau/") || t.DuongDan.Contains("..")))
                return BadRequest(new { message = "Tệp đính kèm không hợp lệ." });

            try
            {
                var rows = await _requestServices.SuaAsync(CurrentUserId, id, req);   // rỗng nếu chỉ lưu nháp
                var first = rows.FirstOrDefault();
                var troLyIds = rows.Select(x => x.TroLyUserId).Where(x => x > 0).Distinct().ToList();
                await NotifyAsync(troLyIds, $"Có yêu cầu {first?.MaYeuCau} mới cần xử lý");

                foreach (var tlId in troLyIds)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = tlId,
                        TieuDe = "Yêu cầu trình mới cần xếp lịch",
                        NoiDung = $"Nhân viên vừa gửi yêu cầu \"{first?.TieuDe}\" ({first?.MaYeuCau}) tới hàng chờ.",
                        LoaiSuKien = "YEUCAU_MOI",
                        YeuCauId = first?.YeuCauId ?? id,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok();
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> PhanHoiDeXuat(int id, [FromBody] PhanHoiDeXuatRequest req)
        {
            try
            {
                var rows = await _requestServices.PhanHoiDeXuatAsync(CurrentUserId, id, req);

                var first = rows.FirstOrDefault();
                var ma = first?.MaYeuCau;
                var noiDung = req.DongY
                    ? $"Nhân viên đã đồng ý khung giờ đề xuất của yêu cầu {ma}, lịch đã được chốt"
                    : $"Nhân viên không đồng ý khung giờ đề xuất của yêu cầu {ma}, cần đề xuất lại";
                var troLyIds = rows.Select(x => x.TroLyUserId).Where(x => x > 0).Distinct().ToList();
                await NotifyAsync(troLyIds, noiDung);

                foreach (var tlId in troLyIds)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = tlId,
                        TieuDe = req.DongY ? "Nhân viên đã đồng ý lịch đề xuất" : "Nhân viên từ chối lịch đề xuất",
                        NoiDung = noiDung,
                        LoaiSuKien = req.DongY ? "DONG_Y_DE_XUAT" : "TU_CHOI_DE_XUAT",
                        YeuCauId = first?.YeuCauId ?? id,
                        LichTrinhId = first?.LichTrinhId,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok();
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetLoaiYeuCau()
        {
            var result = await _requestServices.GetLoaiYeuCauChonAsync(CurrentUserId);
            return Ok(result);
        }
        // =====================================================================
        // Đọc
        // =====================================================================

        [HttpGet("[action]")]
        public async Task<IActionResult> GetYeuCau([FromQuery] YeuCauQuery query)
        {
            var result = await _requestServices.GetDanhSachAsync(CurrentUserId, query);
            return Ok(result);
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetThongKe()
        {
            var result = await _requestServices.GetThongKeAsync(CurrentUserId);
            return Ok(result);
        }

        [HttpGet("[action]/{id}")]
        public async Task<IActionResult> GetChiTiet(int id)
        {
            try
            {
                var result = await _requestServices.GetChiTietAsync(CurrentUserId, id);
                return Ok(result);
            }
            catch (SqlException ex) when (ex.Number >= 50000)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetPhanHoi([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _requestServices.GetPhanHoiAsync(CurrentUserId, page, pageSize);
            return Ok(result);
        }

        // =====================================================================
        // Nội bộ
        // =====================================================================

        // SP đã commit trước khi tới đây, nên lỗi SignalR chỉ ghi log, không làm hỏng response
        private async Task NotifyAsync(IEnumerable<int> nguoiNhanIds, string noiDung)
        {
            var ids = nguoiNhanIds.Where(id => id > 0).Distinct().ToList();
            if (ids.Count == 0) return;

            try
            {
                await _notifier.GuiAsync(ids, noiDung, CurrentChiNhanhId, CurrentUserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không gửi được thông báo: {NoiDung}", noiDung);
            }
        }

        private async Task SafeNotifyScheduleAsync(ThongBaoLichTrinhCreateInput input)
        {
            try
            {
                await _notifier.GuiLichTrinhAsync(input);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không gửi được thông báo lịch trình: {TieuDe}", input.TieuDe);
            }
        }
        [HttpPost("[action]")]
        [RequestSizeLimit(20 * 1024 * 1024)]
        public async Task<IActionResult> UploadTep(IFormFile file)
        {
            if (file is null || file.Length == 0) return BadRequest(new { message = "Tệp rỗng." });
            if (file.Length > 20 * 1024 * 1024) return BadRequest(new { message = "Tệp vượt quá 20MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExt.Contains(ext)) return BadRequest(new { message = "Định dạng tệp không được hỗ trợ." });

            var now = DateTime.Now;
            var rel = $"yeu-cau/{now:yyyy}/{now:MM}/{Guid.NewGuid():N}{ext}";     // tên do server sinh, không dùng tên client
            var full = Path.Combine(_env.ContentRootPath, "wwwroot", "Files", rel);
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);

            await using (var fs = System.IO.File.Create(full))
                await file.CopyToAsync(fs);

            string checksum;
            await using (var rs = System.IO.File.OpenRead(full))
                checksum = Convert.ToHexString(await System.Security.Cryptography.SHA256.HashDataAsync(rs));

            return Ok(new TepDinhKemInput
            {
                TenFile = Path.GetFileName(file.FileName),
                DuongDan = rel,
                ContentType = file.ContentType,
                KichThuoc = file.Length,
                Checksum = checksum
            });
        }
    }
}
