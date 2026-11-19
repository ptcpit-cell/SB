using System.Text.Json.Serialization;

namespace SB_Services.DTO
{
    public class LoginRequest
    {
        public string UserName { get; set; }
        public string Password { get; set; }
    }

    public class AuthResponse
    {
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string TenNguoiDung { get; set; }
        public string TenChiNhanh { get; set; }
        public string TenChucVu { get; set; }
        public string TenPhongBan { get; set; }
        public int ChiNhanhId { get; set; }
        public List<string> Permissions { get; set; }
        public string AccessToken { get; set; }
        [JsonIgnore] public string? RefreshToken { get; set; }
        [JsonIgnore] public DateTime? RefreshTokenExpiry { get; set; }
    }
    public class ChangePasswordRequest
    {
        public int Id { get; set; }
        public string OldPassword { get; set; }
        public string NewPassword { get; set; }
    }
}
