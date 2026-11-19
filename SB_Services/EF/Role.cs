namespace SB_Services.EF
{
    public class Role
    {
        public int RoleId { get; set; }
        public string TenRole { get; set; }
        public bool IsActived { get; set; }
        public bool IsDeleted { get; set; }
    }
    public class Permission
    {
        public int PermissionId { get; set; }
        public string PermissionName { get; set; }
        public string Component { get; set; }
        public bool IsActived { get; set; }
    }
    public class RolePermission
    {
        public int RoleId { get; set; }
        public int PermissionId { get; set; }
    }
}