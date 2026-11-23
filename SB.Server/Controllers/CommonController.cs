using Microsoft.AspNetCore.Mvc;
using SB_Services.EF;
using SB_Services.Services.Common;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommonController(ICommonServices commonServices) : BaseController
    {
        private readonly ICommonServices _commonServices = commonServices;

        [HttpGet("[action]")]
        public async Task<IActionResult> GetChiNhanh()
        {
            var result = await _commonServices.GetChiNhanhsAsync();
            return Ok(result);
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                var result = await _commonServices.GetDanhSachThongBaoAsync(CurrentChiNhanhId, CurrentUserId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }
        [HttpPost("[action]")]
        public async Task<IActionResult> MarkAsReadBulk([FromBody] List<int> thongBaoIds)
        {
            try
            {
                await _commonServices.MarkReadAsync(CurrentUserId, thongBaoIds);
                return Ok(new { message = "Đã cập nhật trạng thái đọc thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống khi cập nhật trạng thái đọc: {ex.Message}");
            }
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetThongBaoLichTrinh()
        {
            var result = await _commonServices.GetThongBaoLichTrinhAsync(CurrentUserId);
            return Ok(result);
        }

        [HttpPost("[action]/{id}")]
        public async Task<IActionResult> MarkThongBaoLichTrinhRead(int id)
        {
            await _commonServices.MarkThongBaoLichTrinhReadAsync(CurrentUserId, id);
            return Ok(new { message = "Đã đánh dấu đã đọc." });
        }

        [HttpPost("[action]")]
        public async Task<IActionResult> MarkAllThongBaoLichTrinhRead()
        {
            await _commonServices.MarkAllThongBaoLichTrinhReadAsync(CurrentUserId);
            return Ok(new { message = "Đã đánh dấu tất cả là đã đọc." });
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetPhongBan()
        {
            var result = await _commonServices.GetPhongBansAsync();
            return Ok(result);
        }
        [HttpPost("[action]")]
        public async Task<IActionResult> CreatePhongBan([FromBody] PhongBan phongBan)
        {
            var result = await _commonServices.CreatePhongBanAsync(phongBan);
            return Ok(result);
        }
        [HttpPut("[action]")]
        public async Task<IActionResult> UpdatePhongBan([FromBody] PhongBan phongBan)
        {
            var result = await _commonServices.UpdatePhongBanAsync(phongBan);
            return Ok(result);
        }
        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> DeletePhongBan(int id)
        {
            var result = await _commonServices.DeletePhongBanAsync(id);
            return Ok(result);
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetChucVu()
        {
            var result = await _commonServices.GetChucVusAsync();
            return Ok(result);
        }
    }
}
