using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SB_Services.DTO;
using SB_Services.Services.Requests;
using SB_Services.Services.TroLy;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TroLyController(
        ITroLyServices troLyServices,
        IThongBaoNotifier notifier,
        ILogger<TroLyController> logger) : BaseController
    {
        private readonly ITroLyServices _troLyServices = troLyServices;
        private readonly IThongBaoNotifier _notifier = notifier;
        private readonly ILogger<TroLyController> _logger = logger;

        private IActionResult? CheckTroLyPermission()
        {
            if (!HasPermission("View trợ lý") && !HasPermission("View admin"))
                return Forbid();
            return null;
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetDashboard([FromQuery] DateTime? ngay)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var targetDate = ngay ?? DateTime.Today;
                var result = await _troLyServices.GetDashboardAsync(CurrentUserId, targetDate);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetLichTuan([FromQuery] DateTime? tuNgay, [FromQuery] DateTime? denNgay)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var start = (tuNgay ?? DateTime.Today).Date;
                var end = (denNgay ?? start.AddDays(6)).Date;
                var result = await _troLyServices.GetLichTuanAsync(CurrentUserId, start, end);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> TiepNhan(int id, [FromBody] TiepNhanRequest? req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _troLyServices.TiepNhanAsync(CurrentUserId, id, req ?? new TiepNhanRequest());

                await SafeNotifyBasicAsync(
                    new[] { res.NguoiTaoId },
                    $"Yêu cầu {res.MaYeuCau} vừa được tiếp nhận");

                await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                {
                    ChiNhanhId = CurrentChiNhanhId,
                    NguoiNhanId = res.NguoiTaoId,
                    TieuDe = "Yêu cầu đã được tiếp nhận",
                    NoiDung = $"Trợ lý đã tiếp nhận xem xét yêu cầu \"{res.TieuDe}\" ({res.MaYeuCau}).",
                    LoaiSuKien = "TIEP_NHAN",
                    YeuCauId = res.YeuCauId,
                    RouteUrl = $"/nhan-vien/detail-request/{res.YeuCauId}",
                    CreatedBy = CurrentUserId
                });

                return Ok(res);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> CapNhatUuTien(int id, [FromBody] CapNhatUuTienRequest req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _troLyServices.CapNhatUuTienAsync(CurrentUserId, id, req);
                return Ok(res);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> XepLich(int id, [FromBody] XepLichRequest req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _troLyServices.XepLichAsync(CurrentUserId, id, req);
                string timeLabel = $"{req.BatDau:HH:mm} - {req.KetThuc:HH:mm} ngày {req.BatDau:dd/MM/yyyy}";
                string trangThaiText = req.YeuCauXacNhanNV
                    ? "đề xuất lịch trình"
                    : (res.LaCapNhat ? "dời lịch trình" : "duyệt xếp lịch");

                await SafeNotifyBasicAsync(
                    new[] { res.NguoiTaoId, res.LanhDaoUserId },
                    $"Yêu cầu {res.MaYeuCau} vừa được {trangThaiText}");

                await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                {
                    ChiNhanhId = CurrentChiNhanhId,
                    NguoiNhanId = res.NguoiTaoId,
                    TieuDe = req.YeuCauXacNhanNV ? "Đề xuất khung giờ trình" : "Lịch trình đã được xếp",
                    NoiDung = $"Yêu cầu \"{res.TieuDe}\" được xếp lúc {timeLabel}. Nhấn để xem chi tiết.",
                    LoaiSuKien = req.YeuCauXacNhanNV ? "DE_XUAT_DOI_LICH" : "DA_XEP_LICH",
                    YeuCauId = res.YeuCauId,
                    LichTrinhId = res.LichTrinhId,
                    RouteUrl = $"/nhan-vien/detail-request/{res.YeuCauId}",
                    CreatedBy = CurrentUserId
                });

                if (!req.YeuCauXacNhanNV && res.LanhDaoUserId > 0)
                {
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = res.LanhDaoUserId,
                        TieuDe = "Lịch trình sắp tới",
                        NoiDung = $"Buổi trình \"{res.TieuDe}\" ({res.MaYeuCau}) vào lúc {timeLabel}.",
                        LoaiSuKien = "LICH_SAP_TRINH_LANH_DAO",
                        YeuCauId = res.YeuCauId,
                        LichTrinhId = res.LichTrinhId,
                        RouteUrl = "/lanh-dao",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok(res);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (SqlException ex) when (ex.Number >= 50000) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> YeuCauBoSung(int id, [FromBody] YeuCauBoSungRequest req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _troLyServices.YeuCauBoSungAsync(CurrentUserId, id, req);

                await SafeNotifyBasicAsync(
                    new[] { res.NguoiTaoId },
                    $"Yêu cầu {res.MaYeuCau} vừa được yêu cầu bổ sung");

                await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                {
                    ChiNhanhId = CurrentChiNhanhId,
                    NguoiNhanId = res.NguoiTaoId,
                    TieuDe = "Cần bổ sung hồ sơ yêu cầu",
                    NoiDung = $"Trợ lý yêu cầu bổ sung cho \"{res.TieuDe}\": {req.NoiDung}",
                    LoaiSuKien = "YEU_CAU_BO_SUNG",
                    YeuCauId = res.YeuCauId,
                    RouteUrl = $"/nhan-vien/detail-request/{res.YeuCauId}",
                    CreatedBy = CurrentUserId
                });

                return Ok(res);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> TuChoi(int id, [FromBody] TuChoiYeuCauRequest req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _troLyServices.TuChoiAsync(CurrentUserId, id, req);

                await SafeNotifyBasicAsync(
                    new[] { res.NguoiTaoId },
                    $"Yêu cầu {res.MaYeuCau} vừa bị từ chối");

                await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                {
                    ChiNhanhId = CurrentChiNhanhId,
                    NguoiNhanId = res.NguoiTaoId,
                    TieuDe = "Yêu cầu đã bị từ chối",
                    NoiDung = $"Yêu cầu \"{res.TieuDe}\" bị từ chối. Lý do: {req.LyDo}",
                    LoaiSuKien = "TU_CHOI",
                    YeuCauId = res.YeuCauId,
                    RouteUrl = $"/nhan-vien/detail-request/{res.YeuCauId}",
                    CreatedBy = CurrentUserId
                });

                return Ok(res);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]/{lichTrinhId}")]
        public async Task<IActionResult> CapNhatTrangThaiLich(int lichTrinhId, [FromBody] CapNhatTrangThaiLichRequest req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _troLyServices.CapNhatTrangThaiLichAsync(CurrentUserId, lichTrinhId, req);

                string statusLabel = req.TrangThaiYeuCau switch
                {
                    6 => "xác nhận đã trình",
                    7 => "hoàn thành",
                    9 => "hủy lịch",
                    10 => "hoãn lịch",
                    11 => "đánh dấu vắng",
                    _ => "cập nhật trạng thái"
                };

                await SafeNotifyBasicAsync(
                    new[] { res.NguoiTaoId },
                    $"Yêu cầu {res.MaYeuCau} vừa được {statusLabel}");

                await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                {
                    ChiNhanhId = CurrentChiNhanhId,
                    NguoiNhanId = res.NguoiTaoId,
                    TieuDe = "Cập nhật trạng thái lịch trình",
                    NoiDung = $"Lịch trình của yêu cầu \"{res.TieuDe}\" vừa được {statusLabel}.",
                    LoaiSuKien = "CAP_NHAT_LICH",
                    YeuCauId = res.YeuCauId,
                    LichTrinhId = lichTrinhId,
                    RouteUrl = $"/nhan-vien/detail-request/{res.YeuCauId}",
                    CreatedBy = CurrentUserId
                });

                return Ok(res);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (SqlException ex) when (ex.Number >= 50000) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPut("[action]")]
        public async Task<IActionResult> CapNhatCauHinhLanhDao([FromBody] LanhDaoCauHinhDto req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var result = await _troLyServices.CapNhatCauHinhLanhDaoAsync(CurrentUserId, req);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]")]
        public async Task<IActionResult> TaoSuKienLanhDao([FromBody] SuKienLanhDaoInput req)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var result = await _troLyServices.TaoSuKienLanhDaoAsync(CurrentUserId, req);

                if (result.NotifyTargetUserId.HasValue && result.NotifyTargetUserId.Value > 0)
                {
                    string loaiText = result.Loai switch
                    {
                        3 => "nghỉ phép",
                        2 => "công tác",
                        1 => "họp riêng",
                        _ => "lịch bận"
                    };
                    string rangeLabel = result.BatDau.Date != result.KetThuc.Date
                        ? $"{result.BatDau:dd/MM/yyyy} - {result.KetThuc:dd/MM/yyyy}"
                        : $"{result.BatDau:dd/MM/yyyy}";

                    await SafeNotifyBasicAsync(
                        new[] { result.NotifyTargetUserId.Value },
                        $"Trợ lý vừa thêm lịch {loaiText}: {result.TieuDe} ({rangeLabel})");

                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = result.NotifyTargetUserId.Value,
                        TieuDe = result.Loai == 3 ? "Trợ lý cập nhật lịch nghỉ phép" : "Trợ lý vừa thêm lịch bận mới",
                        NoiDung = $"Trợ lý vừa thêm lịch {loaiText} \"{result.TieuDe}\" ({rangeLabel}) vào lịch trình của bạn.",
                        LoaiSuKien = "LICH_MOI",
                        RouteUrl = "/lanh-dao",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> XoaSuKienLanhDao(int id)
        {
            if (CheckTroLyPermission() is IActionResult denied) return denied;
            try
            {
                var ok = await _troLyServices.XoaSuKienLanhDaoAsync(CurrentUserId, id);
                return Ok(ok);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        private async Task SafeNotifyBasicAsync(IEnumerable<int> receiverIds, string noiDung)
        {
            try
            {
                await _notifier.GuiAsync(receiverIds, noiDung, CurrentChiNhanhId, CurrentUserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không gửi được thông báo cơ bản: {NoiDung}", noiDung);
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
    }
}
