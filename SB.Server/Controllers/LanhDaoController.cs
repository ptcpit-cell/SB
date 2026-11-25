using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SB_Services.DTO;
using SB_Services.Services.LanhDao;
using SB_Services.Services.Requests;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LanhDaoController(
        ILanhDaoServices lanhDaoServices,
        IThongBaoNotifier notifier,
        ILogger<LanhDaoController> logger) : BaseController
    {
        private readonly ILanhDaoServices _lanhDaoServices = lanhDaoServices;
        private readonly IThongBaoNotifier _notifier = notifier;
        private readonly ILogger<LanhDaoController> _logger = logger;

        private IActionResult? CheckLanhDaoPermission()
        {
            if (!HasPermission("View lãnh đạo") && !HasPermission("View admin"))
                return Forbid();
            return null;
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetLichNgay([FromQuery] DateTime? ngay)
        {
            if (CheckLanhDaoPermission() is IActionResult denied) return denied;
            try
            {
                var targetDate = ngay ?? DateTime.Today;
                var result = await _lanhDaoServices.GetLichNgayAsync(CurrentUserId, targetDate);
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
            if (CheckLanhDaoPermission() is IActionResult denied) return denied;
            try
            {
                var start = (tuNgay ?? DateTime.Today).Date;
                var end = (denNgay ?? start.AddDays(6)).Date;
                var result = await _lanhDaoServices.GetLichTuanAsync(CurrentUserId, start, end);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        [HttpPost("[action]/{lichTrinhId}")]
        public async Task<IActionResult> CapNhatPhanHoi(int lichTrinhId, [FromBody] PhanHoiLanhDaoRequest req)
        {
            if (CheckLanhDaoPermission() is IActionResult denied) return denied;
            try
            {
                var res = await _lanhDaoServices.CapNhatPhanHoiAsync(CurrentUserId, lichTrinhId, req);

                // 1. ThongBao cơ bản cho nhân viên
                await SafeNotifyBasicAsync(
                    new[] { res.NguoiTaoId },
                    $"Yêu cầu {res.MaYeuCau} vừa được phản hồi");

                // 2. ThongBaoLichTrinh có thể nhấp để chuyển đến trang chi tiết yêu cầu
                await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                {
                    ChiNhanhId = CurrentChiNhanhId,
                    NguoiNhanId = res.NguoiTaoId,
                    TieuDe = "Lãnh đạo vừa phản hồi yêu cầu",
                    NoiDung = $"Sếp {res.TenLanhDao} vừa phản hồi yêu cầu {res.TieuDe} của bạn",
                    LoaiSuKien = "PHAN_HOI_LANH_DAO",
                    YeuCauId = res.YeuCauId,
                    LichTrinhId = res.LichTrinhId,
                    RouteUrl = $"/nhan-vien/detail-request/{res.YeuCauId}",
                    CreatedBy = CurrentUserId
                });

                // 3. Gửi thông báo lịch trình cho trợ lý (có hoặc không có ghi chú riêng)
                if (res.TroLyUserId.HasValue && res.TroLyUserId.Value > 0)
                {
                    bool hasNote = !string.IsNullOrWhiteSpace(req.GhiChuLanhDao);
                    await SafeNotifyScheduleAsync(new ThongBaoLichTrinhCreateInput
                    {
                        ChiNhanhId = CurrentChiNhanhId,
                        NguoiNhanId = res.TroLyUserId.Value,
                        TieuDe = hasNote ? "Ghi chú mới từ lãnh đạo" : "Lãnh đạo vừa phản hồi buổi trình",
                        NoiDung = hasNote
                            ? $"Sếp {res.TenLanhDao} để lại ghi chú cho yêu cầu {res.MaYeuCau}: {req.GhiChuLanhDao!.Trim()}"
                            : $"Sếp {res.TenLanhDao} vừa cập nhật phản hồi cho yêu cầu \"{res.TieuDe}\" ({res.MaYeuCau}).",
                        LoaiSuKien = hasNote ? "GHI_CHU_TRO_LY" : "PHAN_HOI_LANH_DAO_TRO_LY",
                        YeuCauId = res.YeuCauId,
                        LichTrinhId = res.LichTrinhId,
                        RouteUrl = "/tro-ly",
                        CreatedBy = CurrentUserId
                    });
                }

                return Ok(res);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (SqlException ex) when (ex.Number >= 50000) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpPost("[action]")]
        public async Task<IActionResult> TaoSuKien([FromBody] SuKienLanhDaoInput req)
        {
            if (CheckLanhDaoPermission() is IActionResult denied) return denied;
            try
            {
                var result = await _lanhDaoServices.TaoSuKienAsync(CurrentUserId, req);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> XoaSuKien(int id)
        {
            if (CheckLanhDaoPermission() is IActionResult denied) return denied;
            try
            {
                var ok = await _lanhDaoServices.XoaSuKienAsync(CurrentUserId, id);
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
