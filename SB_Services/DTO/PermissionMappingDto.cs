namespace SB_Services.DTO
{
    public class PermissionMappingDto
    {
        public string PermissionName { get; set; } = string.Empty;
    }
    public class ResultId
    {
        public int PermissionId { get; set; }
    }
    public class ResultType
    {
        public int UserId { get; set; }
    }
    public class SingleValue<T>
    {
        public T Value { get; set; }
    }
    public class UserSaveRequest
    {
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string? TenNguoiDung { get; set; }
        public string? Password { get; set; }
        public string? Email { get; set; } = string.Empty;
        public string? Phone { get; set; } = string.Empty;
        public int? PhongBanId { get; set; } = null;
        public int? ChucVuId { get; set; } = null;
        public int ChiNhanhId { get; set; }
        public List<int> RoleIds { get; set; }
    }
    public class RoleSaveRequest
    {
        public int RoleId { get; set; }
        public string TenRole { get; set; }
        public List<int> PermissionIds { get; set; }
        public List<int> UserIds { get; set; }
    }
}
