using SB_Services.DTO;
using SB_Services.EF;

namespace SB_Services.Services.Users
{
    public interface IUserServices
    {
        Task<IEnumerable<Permission>> GetAllPermissionsAsync();
        Task<bool> UpdatePermissionStatusAsync(int permissionId, bool isActive);
        Task<IEnumerable<Role>> GetAllRolesAsync();
        Task<bool> UpdateRoleStatusAsync(int roleId, bool isActive);
        Task<IEnumerable<ResultId>> GetPermissionIdsByRoleIdAsync(int roleId);
        Task<bool> SoftDeleteRoleAsync(int roleId);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<bool> UpdateUserStatusAsync(int userId, bool isActive);
        Task<IEnumerable<UserRoles>> GetAllUserRolesAsync();
        Task<bool> UpdateRolePermissionsAsync(RoleSaveRequest request);
        Task<bool> SoftDeleteUserAsync(int userId);
        Task<bool> UpdateUserAsync(UserSaveRequest request);
        Task<bool> CreateUserAsync(UserSaveRequest request);
    }
}
