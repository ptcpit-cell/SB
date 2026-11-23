namespace SB_Services.DTO
{
    public class UserRoleSimpleDto
    {
        public int RoleId { get; set; }
        public string TenRole { get; set; } = string.Empty;
    }

    public class UserProfileDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string TenNguoiDung { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string ZaloId { get; set; } = string.Empty;
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } = string.Empty;
        public int? PhongBanId { get; set; }
        public string TenPhongBan { get; set; } = string.Empty;
        public int? ChucVuId { get; set; }
        public string TenChucVu { get; set; } = string.Empty;
        public List<UserRoleSimpleDto> Roles { get; set; } = new();
        public List<string> Permissions { get; set; } = new();
    }

    public class UpdateProfileRequest
    {
        public string TenNguoiDung { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? ZaloId { get; set; }
        public int? PhongBanId { get; set; }
        public int? ChucVuId { get; set; }
    }

    public class UpdateProfileResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public UserProfileDto Profile { get; set; } = new();
    }
}
