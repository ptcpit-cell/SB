using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SB_Services.DTO;
using SB_Services.Services.Admin;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController(IAdminServices adminServices) : BaseController
    {
        private readonly IAdminServices _adminServices = adminServices;

        private IActionResult? CheckAdminPermission()
        {
            if (!HasPermission("View admin"))
                return Forbid();
            return null;
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetDashboard()
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            var result = await _adminServices.GetDashboardAsync();
            return Ok(result);
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetLanhDaos()
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            var result = await _adminServices.GetLanhDaosAsync();
            return Ok(result);
        }

        [HttpPost("[action]")]
        public async Task<IActionResult> SaveLanhDao([FromBody] SaveLanhDaoRequest req)
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            try
            {
                var id = await _adminServices.SaveLanhDaoAsync(CurrentUserId, CurrentChiNhanhId, req);
                return Ok(new { id, message = "Lưu cấu hình lãnh đạo & trợ lý thành công." });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (SqlException ex) when (ex.Number >= 50000) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> DeleteLanhDao(int id)
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            await _adminServices.DeleteLanhDaoAsync(id);
            return Ok(new { message = "Đã xóa cấu hình lãnh đạo." });
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetLoaiYeuCaus()
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            var result = await _adminServices.GetLoaiYeuCausAsync();
            return Ok(result);
        }

        [HttpPost("[action]")]
        public async Task<IActionResult> SaveLoaiYeuCau([FromBody] SaveLoaiYeuCauRequest req)
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            try
            {
                var id = await _adminServices.SaveLoaiYeuCauAsync(CurrentUserId, CurrentChiNhanhId, req);
                return Ok(new { id, message = "Lưu loại yêu cầu thành công." });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> DeleteLoaiYeuCau(int id)
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            await _adminServices.DeleteLoaiYeuCauAsync(CurrentUserId, id);
            return Ok(new { message = "Đã xóa loại yêu cầu." });
        }

        [HttpGet("[action]")]
        public async Task<IActionResult> GetMucUuTiens()
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            var result = await _adminServices.GetMucUuTiensAsync();
            return Ok(result);
        }

        [HttpPost("[action]")]
        public async Task<IActionResult> SaveMucUuTien([FromBody] SaveMucUuTienRequest req)
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            try
            {
                var id = await _adminServices.SaveMucUuTienAsync(CurrentChiNhanhId, req);
                return Ok(new { id, message = "Lưu mức ưu tiên thành công." });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("[action]/{id}")]
        public async Task<IActionResult> DeleteMucUuTien(int id)
        {
            if (CheckAdminPermission() is IActionResult denied) return denied;
            await _adminServices.DeleteMucUuTienAsync(id);
            return Ok(new { message = "Đã xóa mức ưu tiên." });
        }
    }
}
