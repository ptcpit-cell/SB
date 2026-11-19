
using System.Data.Entity;
namespace SB_Services.EF
{
    public class Db : DbContext
    {
        public Db() : base("DefaultConnection")
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Permission> Permission { get; set; }
        public DbSet<UserRoles> UserRoles { get; set; }
        public DbSet<RolePermission> RolePermission { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<ChiNhanh> ChiNhanh { get; set; }
        public DbSet<ThongBao> ThongBao { get; set; }
        public DbSet<DocThongBao> DocThongBao { get; set; }
    }
}

