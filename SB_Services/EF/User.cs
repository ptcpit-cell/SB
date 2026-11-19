namespace SB_Services.EF
{
    public class User
    {
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string Password { get; set; }
        public string TenNguoiDung { get; set; }
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } // Trường ảo, không có cột db
        public string TenChucVu { get; set; } // Trường ảo, không có cột db
        public string TenPhongBan { get; set; } // Trường ảo, không có cột db
        public int PhongBanId { get; set; }
        public int ChucVuId { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public int ZaloId { get; set; }
        public bool IsDeleted { get; set; }
        public string TrangThai { get; set; }
        public string RefreshToken { get; set; }
        public DateTime? ExpiryToken { get; set; }
        public bool IsActived { get; set; }
    }
    public class UserRoles
    {
        public int UserId { get; set; }
        public int RoleId { get; set; }
    }
}

