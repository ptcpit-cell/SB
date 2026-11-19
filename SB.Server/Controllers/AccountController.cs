using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SB_Services.DTO;
using SB_Services.Services.Account;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IAccountServices _accountServices;

        public AccountController(IAccountServices accountServices)
        {
            _accountServices = accountServices;
        }
        private const string RefreshCookie = "sb_refreshToken";
        private string RefreshCookiePath => $"{Request.PathBase}/api/Account";
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _accountServices.LoginAsync(request);
            if (result == null) return Unauthorized("Tài khoản hoặc mật khẩu không đúng.");

            SetRefreshCookie(result);

            return Ok(result);
        }
        [AllowAnonymous]
        [HttpPost("refresh-token")]
        public async Task<IActionResult> Refresh()
        {
            var refreshToken = Request.Cookies[RefreshCookie];
            if (string.IsNullOrEmpty(refreshToken)) return Unauthorized();

            var result = await _accountServices.RefreshTokenAsync(refreshToken);
            if (result == null)
            {
                Response.Cookies.Delete(RefreshCookie, new CookieOptions { Path = RefreshCookiePath });
                return Unauthorized();
            }

            SetRefreshCookie(result);   // DB vừa đổi sang token mới, cookie cũng phải đổi theo
            return Ok(result);
        }
        [AllowAnonymous]
        [HttpPost("[action]/{userId}")]
        public async Task<IActionResult> ChangePassword(int userId, [FromBody] ChangePasswordRequest request)
        {
            try
            {
                // Kiểm tra dữ liệu đầu vào cơ bản
                if (request == null || string.IsNullOrEmpty(request.OldPassword) || string.IsNullOrEmpty(request.NewPassword))
                {
                    return BadRequest("Dữ liệu mật khẩu không được để trống.");
                }

                if (request.OldPassword == request.NewPassword)
                {
                    return BadRequest("Mật khẩu mới không được trùng với mật khẩu cũ.");
                }

                // Gọi hàm xử lý logic đổi mật khẩu ở Service
                bool isSuccess = await _accountServices.ChangePasswordAsync(userId, request);
                if (!isSuccess)
                {
                    return BadRequest("Mật khẩu cũ không chính xác hoặc tài khoản không tồn tại trên hệ thống.");
                }

                return Ok(new { message = "Thay đổi mật khẩu thành công!" });
            }
            catch (Exception ex)
            {
                // Log lỗi hệ thống nếu có biến cố
                return StatusCode(500, $"Lỗi hệ thống khi đổi mật khẩu: {ex.Message}");
            }
        }
        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies[RefreshCookie];
            if (!string.IsNullOrEmpty(refreshToken))
                await _accountServices.RevokeRefreshTokenAsync(refreshToken);

            Response.Cookies.Delete(RefreshCookie, new CookieOptions { Path = RefreshCookiePath });
            return NoContent();
        }
        private void SetRefreshCookie(AuthResponse auth)
        {
            if (string.IsNullOrEmpty(auth.RefreshToken)) return;

            Response.Cookies.Append(RefreshCookie, auth.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,          // chạy http nội bộ thì vẫn nhận cookie
                SameSite = SameSiteMode.Lax,
                Path = RefreshCookiePath,
                Expires = auth.RefreshTokenExpiry  // có ngày hết hạn nên còn sau khi đóng trình duyệt
            });
        }

    }
}
