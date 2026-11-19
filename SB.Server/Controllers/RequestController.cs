using Microsoft.AspNetCore.Mvc;
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
            var result = await _requestServices.GetLichBanAsync(CurrentUserId, id, tuNgay, denNgay);
            return Ok(result);
        }

        // =====================================================================
        // Ghi
        // =====================================================================

        [HttpPost("[action]")]
        public async Task<IActionResult> Tao([FromBody] TaoYeuCauRequest req)
        {
            if (req.TepDinhKems.Any(t => !t.DuongDan.StartsWith("yeu-cau/") || t.DuongDan.Contains("..")))
                return BadRequest(new { message = "Tệp đính kèm không hợp lệ." });
            var result = await _requestServices.TaoAsync(CurrentUserId, req);

            // Lưu nháp thì TroLyCanBao rỗng, không có gì để báo
            await NotifyAsync(
                result.TroLyCanBao.Select(x => x.UserId),
                result.TroLyCanBao.Count == 1
                    ? $"Có yêu cầu {result.TroLyCanBao[0].MaYeuCau} mới cần xử lý"
                    : "Có yêu cầu mới cần xử lý");

            return Ok(result.DaTao);
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> SendYeuCau(int id)
        {
            var rows = await _requestServices.GuiAsync(CurrentUserId, id);

            var ma = rows.FirstOrDefault()?.MaYeuCau;
            await NotifyAsync(rows.Select(x => x.TroLyUserId), $"Có yêu cầu {ma} mới cần xử lý");

            return Ok();
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> CancelYeuCau(int id, [FromBody] HuyYeuCauRequest req)
        {
            var rows = await _requestServices.HuyAsync(CurrentUserId, id, req.LyDo);

            // Rỗng nếu hủy bản nháp. Chỉ báo lãnh đạo khi yêu cầu đã được xếp lịch
            var ma = rows.FirstOrDefault()?.MaYeuCau;
            var nguoiNhan = rows.Select(x => x.TroLyUserId)
                .Concat(rows.Where(x => x.CoLich).Select(x => x.LanhDaoUserId));
            await NotifyAsync(nguoiNhan, $"Yêu cầu {ma} đã bị nhân viên hủy");

            return Ok();
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> BoSung(int id, [FromBody] BoSungRequest req)
        {
            var rows = await _requestServices.BoSungAsync(CurrentUserId, id, req);

            // Ưu tiên trợ lý đang xử lý yêu cầu, chưa có thì báo tất cả trợ lý của lãnh đạo
            var troLyXuLy = rows.FirstOrDefault()?.TroLyXuLyId;
            var nguoiNhan = troLyXuLy.HasValue
                ? new[] { troLyXuLy.Value }
                : rows.Select(x => x.TroLyUserId).ToArray();

            await NotifyAsync(nguoiNhan, $"Yêu cầu {rows.FirstOrDefault()?.MaYeuCau} đã được bổ sung thông tin");

            return Ok();
        }
        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> Sua(int id, [FromBody] SuaYeuCauRequest req)
        {
            if (req.TepDinhKems.Any(t => !t.DuongDan.StartsWith("yeu-cau/") || t.DuongDan.Contains("..")))
                return BadRequest(new { message = "Tệp đính kèm không hợp lệ." });

            var rows = await _requestServices.SuaAsync(CurrentUserId, id, req);   // rỗng nếu chỉ lưu nháp
            await NotifyAsync(rows.Select(x => x.TroLyUserId), $"Có yêu cầu {rows.FirstOrDefault()?.MaYeuCau} mới cần xử lý");
            return Ok();
        }
        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> PhanHoiDeXuat(int id, [FromBody] PhanHoiDeXuatRequest req)
        {
            var rows = await _requestServices.PhanHoiDeXuatAsync(CurrentUserId, id, req);

            var ma = rows.FirstOrDefault()?.MaYeuCau;
            var noiDung = req.DongY
                ? $"Nhân viên đã đồng ý khung giờ đề xuất của yêu cầu {ma}, lịch đã được chốt"
                : $"Nhân viên không đồng ý khung giờ đề xuất của yêu cầu {ma}, cần đề xuất lại";
            await NotifyAsync(rows.Select(x => x.TroLyUserId), noiDung);

            return Ok();
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
            var result = await _requestServices.GetChiTietAsync(CurrentUserId, id);
            return Ok(result);
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
            var ids = nguoiNhanIds.Distinct().ToList();
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
