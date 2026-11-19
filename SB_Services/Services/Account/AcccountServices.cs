using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SB_DAL.DapperContext;
using SB_Services.DTO;
using SB_Services.EF;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SB_Services.Services.Account
{
    public class AcccountServices : IAccountServices
    {
        private readonly IDapperContext _dapper;
        private readonly IConfiguration _config;

        public AcccountServices(IDapperContext dapper, IConfiguration config)
        {
            _dapper = dapper;
            _config = config;
        }
        public async Task<AuthResponse?> LoginAsync(LoginRequest request)
        {
            string sqlUser = @"SELECT u.UserId, u.UserName, u.Password, u.ChiNhanhId, u.ChucVuId, u.PhongBanId, u.IsDeleted, u.TenNguoiDung, u.IsActived, u.RefreshToken, u.ExpiryToken, cv.TenChucVu, pb.TenPhongBan, cn.TenChiNhanh FROM Users u
                                LEFT JOIN ChucVu cv ON u.ChucVuId = cv.Id
                                LEFT JOIN PhongBan pb ON u.PhongBanId = pb.Id
                                LEFT JOIN ChiNhanh cn ON u.ChiNhanhId = cn.ChiNhanhId
                                WHERE u.UserName = @UserName AND u.IsDeleted = 0 AND u.IsActived = 1";
            var users = await _dapper.GetSQLAsync<User>(sqlUser, new { request.UserName });
            var user = users.FirstOrDefault();

            if (user == null) return null;
            bool isValid = BCrypt.Net.BCrypt.Verify(request.Password, user.Password);

            if (!isValid) return null;

            return await GenerateAuthResponse(user);
        }

        public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
        {
            string sql = @"SELECT u.UserId, u.UserName, u.Password, u.ChiNhanhId, u.ChucVuId, u.PhongBanId, u.IsDeleted, u.TenNguoiDung, u.IsActived, u.RefreshToken, u.ExpiryToken, cv.TenChucVu, pb.TenPhongBan, cn.TenChiNhanh FROM Users u
                                LEFT JOIN ChucVu cv ON u.ChucVuId = cv.Id
                                LEFT JOIN PhongBan pb ON u.PhongBanId = pb.Id
                                LEFT JOIN ChiNhanh cn ON u.ChiNhanhId = cn.ChiNhanhId 
                            WHERE RefreshToken = @refreshToken AND ExpiryToken > GETDATE()";
            var users = await _dapper.GetSQLAsync<User>(sql, new { refreshToken });
            var user = users.FirstOrDefault();

            if (user == null) return null;

            return await GenerateAuthResponse(user, rotate: false);
        }

        private async Task<AuthResponse?> GenerateAuthResponse(User user, bool rotate = true)
        {
            string sqlPerms = @"
                SELECT PermissionName
                FROM Permissions p
                INNER JOIN RolePermissions rp ON p.PermissionId = rp.PermissionId
                INNER JOIN UserRoles ur ON rp.RoleId = ur.RoleId
                WHERE ur.UserId = @UserId";

            var permsDto = await _dapper.GetSQLAsync<PermissionMappingDto>(sqlPerms, new { user.UserId });
            List<string> permissions = permsDto.Select(x => x.PermissionName).ToList();
            var accessToken = GenerateJwtToken(user, permissions);
            var refreshToken = user.RefreshToken;
            var expiry = user.ExpiryToken;

            if (rotate || string.IsNullOrEmpty(refreshToken))
            {
                refreshToken = Guid.NewGuid().ToString();
                expiry = DateTime.UtcNow.AddDays(14);
                await _dapper.ExecuteSQLAsync(
                    "UPDATE Users SET RefreshToken = @refreshToken, ExpiryToken = @expiry WHERE UserId = @UserId",
                    new { refreshToken, expiry, user.UserId });
            }
            return new AuthResponse
            {
                UserId = user.UserId,
                UserName = user.UserName,
                TenNguoiDung = user.TenNguoiDung,
                ChiNhanhId = user.ChiNhanhId,
                TenChiNhanh = user.TenChiNhanh,
                TenChucVu = user.TenChucVu,
                TenPhongBan = user.TenPhongBan,
                Permissions = permissions,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                RefreshTokenExpiry = expiry
            };

        }

        private string GenerateJwtToken(User user, List<string> permissions)
        {
            var jwtSettings = _config.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim> {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.UserName),
            new Claim("ChiNhanhId", user.ChiNhanhId.ToString())
        };
            // Add roles/permissions vào claims
            permissions.ForEach(p => claims.Add(new Claim("permissions", p)));

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                expires: DateTime.Now.AddMinutes(30),
                claims: claims,
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request)
        {
            // 1. Lấy thông tin User hiện tại từ DB để kiểm tra mật khẩu cũ
            string sqlUser = "SELECT * FROM Users WHERE UserId = @UserId AND IsDeleted = 0";
            var users = await _dapper.GetSQLAsync<User>(sqlUser, new { UserId = userId });
            var user = users.FirstOrDefault();

            // Nếu không tìm thấy user hoặc tài khoản bị khóa/xóa
            if (user == null) return false;

            // 2. Kiểm tra mật khẩu cũ nhập vào xem có khớp với mật khẩu đã mã hóa trong DB không
            bool isOldPasswordValid = BCrypt.Net.BCrypt.Verify(request.OldPassword, user.Password);
            if (!isOldPasswordValid) return false; // Mật khẩu cũ không chính xác

            // 3. Mã hóa (Hash) mật khẩu mới trước khi lưu vào database
            string hashedNewPassword = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            // 4. Cập nhật mật khẩu mới và làm trống luôn cả RefreshToken cũ để bắt các thiết bị khác phải đăng nhập lại (Tăng tính bảo mật)
            string sqlUpdate = @"
                UPDATE Users 
                SET Password = @hashedNewPassword, 
                    RefreshToken = NULL, 
                    ExpiryToken = NULL 
                WHERE UserId = @UserId";

            int rowsAffected = await _dapper.ExecuteSQLAsync(sqlUpdate, new
            {
                hashedNewPassword,
                UserId = userId
            });

            return rowsAffected > 0;
        }
        public async Task RevokeRefreshTokenAsync(string refreshToken)
        {
            string sql = "UPDATE Users SET RefreshToken = NULL, ExpiryToken = NULL WHERE RefreshToken = @refreshToken";
            await _dapper.ExecuteSQLAsync(sql, new { refreshToken });
        }
        public async Task MigratePasswordsToHashAsync()
        {
            string sqlSelect = "SELECT UserId, Password FROM Users WHERE Password NOT LIKE '$2a$%'";
            var users = await _dapper.GetSQLAsync<User>(sqlSelect);

            foreach (var user in users)
            {
                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password);

                string sqlUpdate = "UPDATE Users SET Password = @hashedPassword WHERE UserId = @UserId";
                await _dapper.ExecuteSQLAsync(sqlUpdate, new { hashedPassword, user.UserId });
            }
        }
    }
    //public class PasswordMigrationService : IHostedService
    //{
    //    private readonly IServiceProvider _serviceProvider;
    //    private readonly ILogger<PasswordMigrationService> _logger;

    //    public PasswordMigrationService(IServiceProvider serviceProvider, ILogger<PasswordMigrationService> logger)
    //    {
    //        _serviceProvider = serviceProvider;
    //        _logger = logger;
    //    }

    //    public async Task StartAsync(CancellationToken cancellationToken)
    //    {
    //        _logger.LogInformation("Đang kiểm tra và chuyển đổi mật khẩu cũ...");

    //        using (var scope = _serviceProvider.CreateScope())
    //        {
    //            var context = scope.ServiceProvider.GetRequiredService<IDapperContext>();

    //            try
    //            {
    //                // 1. Lấy danh sách user có mật khẩu chưa băm 
    //                // BCrypt hash luôn bắt đầu bằng $2a$, $2b$ hoặc $2y$
    //                string sqlSelect = "SELECT UserId, Password FROM Users WHERE Password NOT LIKE '$2a$%' AND IsDeleted = 0";
    //                var users = await context.GetSQLAsync<User>(sqlSelect);

    //                int count = 0;
    //                foreach (var user in users)
    //                {
    //                    // 2. Thực hiện băm mật khẩu
    //                    string hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password);

    //                    // 3. Cập nhật lại vào DB
    //                    string sqlUpdate = "UPDATE Users SET Password = @hashedPassword WHERE UserId = @UserId";
    //                    await context.ExecuteSQLAsync(sqlUpdate, new { hashedPassword, user.UserId });
    //                    count++;
    //                }

    //                if (count > 0)
    //                    _logger.LogInformation($"Đã chuyển đổi thành công {count} mật khẩu sang định dạng BCrypt.");
    //            }
    //            catch (Exception ex)
    //            {
    //                _logger.LogError($"Lỗi khi chuyển đổi mật khẩu: {ex.Message}");
    //            }
    //        }
    //    }

    //    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    //}
}
