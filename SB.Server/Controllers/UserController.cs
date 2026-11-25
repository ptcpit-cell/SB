using Microsoft.AspNetCore.Mvc;
using SB_Services.DTO;
using SB_Services.EF;
using SB_Services.Services.Users;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : BaseController
    {
        private readonly IUserServices _userServices;

        public UserController(IUserServices userServices)
        {
            _userServices = userServices;
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetPermission()
        {
            var data = await _userServices.GetAllPermissionsAsync();
            return Ok(data);
        }
        [HttpPost("[action]/{permissionId}")]
        public async Task<IActionResult> UpdatePermissionStatus(int permissionId, [FromBody] bool isActived)
        {
            var result = await _userServices.UpdatePermissionStatusAsync(permissionId, isActived);
            if (result) return Ok(new { message = "Cập nhật trạng thái quyền thành công" });
            return StatusCode(500, new { message = "Có lỗi xảy ra trong quá trình cập nhật" });
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetRole()
        {
            var data = await _userServices.GetAllRolesAsync();
            return Ok(data);
        }
        [HttpPost("[action]/{roleId}")]
        public async Task<IActionResult> UpdateRoleStatus(int roleId, [FromBody] bool isActived)
        {
            var result = await _userServices.UpdateRoleStatusAsync(roleId, isActived);
            if (result) return Ok(new { message = "Cập nhật trạng thái nhóm quyền thành công" });
            return StatusCode(500, new { message = "Có lỗi xảy ra trong quá trình cập nhật" });
        }
        [HttpGet("[action]/{roleId}")]
        public async Task<IActionResult> GetPermissionIdsByRoleId(int roleId)
        {
            var data = await _userServices.GetPermissionIdsByRoleIdAsync(roleId);
            return Ok(data);
        }
        [HttpPost("[action]")]
        public async Task<IActionResult> UpdatePermissions([FromBody] RoleSaveRequest request)
        {
            if (string.IsNullOrEmpty(request.TenRole))
                return BadRequest(new { message = "Tên nhóm quyền không được để trống" });

            var result = await _userServices.UpdateRolePermissionsAsync(request);
            if (result) return Ok(new { message = "Lưu cấu hình quyền thành công" });

            return StatusCode(500, new { message = "Có lỗi xảy ra trong quá trình lưu" });
        }
        [HttpDelete("[action]/{roleId}")]
        public async Task<IActionResult> DeleteRole(int roleId)
        {
            var result = await _userServices.SoftDeleteRoleAsync(roleId);
            return Ok(result);
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetAllUsers()
        {
            var data = await _userServices.GetAllUsersAsync();
            return Ok(data);
        }
        [HttpPost("[action]/{userId}")]
        public async Task<IActionResult> UpdateUserStatus(int userId, [FromBody] bool isActived)
        {

            var result = await _userServices.UpdateUserStatusAsync(userId, isActived);
            if (result) return Ok(new { message = "Cập nhật trạng thái người dùng thành công" });
            return StatusCode(500, new { message = "Có lỗi xảy ra trong quá trình cập nhật" });
        }
        [HttpGet("[action]")]
        public async Task<IActionResult> GetAllUserRoles()
        {
            var data = await _userServices.GetAllUserRolesAsync();
            return Ok(data);
        }
        [HttpPost("CreateUser")]
        public async Task<IActionResult> CreateUser([FromBody] UserSaveRequest request)
        {
            var result = await _userServices.CreateUserAsync(request);
            if (!result) return BadRequest(new { message = "Tên tài khoản đã tồn tại hoặc có lỗi xảy ra." });

            return Ok(new { message = "Thêm mới thành công" });
        }

        [HttpPut("UpdateUser")]
        public async Task<IActionResult> UpdateUser([FromBody] UserSaveRequest request)
        {
            var result = await _userServices.UpdateUserAsync(request);
            if (!result) return BadRequest(new { message = "Không thể cập nhật người dùng." });

            return Ok(new { message = "Cập nhật thành công" });
        }

        [HttpDelete("[action]/{userId}")]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            var result = await _userServices.SoftDeleteUserAsync(userId);
            return Ok(result);
        }
    }
}
