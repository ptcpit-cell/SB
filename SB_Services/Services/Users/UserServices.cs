using Dapper;
using SB_DAL.DapperContext;
using SB_Services.DTO;
using SB_Services.EF;
using System.Transactions;

namespace SB_Services.Services.Users
{
    public class UserServices : IUserServices
    {
        private readonly IDapperContext _dapperContext;

        public UserServices(IDapperContext dapperContext)
        {
            _dapperContext = dapperContext;
        }
        public async Task<IEnumerable<Permission>> GetAllPermissionsAsync()
        {
            string sql = @"SELECT * FROM Permissions";
            return await _dapperContext.GetSQLAsync<Permission>(sql);
        }
        public async Task<bool> UpdatePermissionStatusAsync(int permissionId, bool isActive)
        {
            string sql = @"UPDATE Permissions SET IsActived = @isActive WHERE PermissionId = @permissionId";
            await _dapperContext.ExecuteSQLAsync(sql, new { permissionId, isActive });
            return true;
        }
        public async Task<IEnumerable<Role>> GetAllRolesAsync()
        {
            string sql = @"SELECT * FROM Roles WHERE IsDeleted = 0";
            return await _dapperContext.GetSQLAsync<Role>(sql);
        }
        public async Task<IEnumerable<ResultId>> GetPermissionIdsByRoleIdAsync(int roleId)
        {
            string sql = @"SELECT PermissionId FROM RolePermissions 
                       WHERE RoleId = @roleId";
            return await _dapperContext.GetSQLAsync<ResultId>(sql, new { roleId });
        }
        public async Task<bool> UpdateRolePermissionsAsync(RoleSaveRequest request)
        {
            using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
            {
                try
                {
                    int roleId = request.RoleId;
                    if (roleId == 0)
                    {
                        string sqlInsertRole = @"INSERT INTO Roles (TenRole, IsDeleted, IsActived) VALUES (@TenRole, 0, 1);
                                         SELECT CAST(SCOPE_IDENTITY() as int) AS UserId;";

                        var res = await _dapperContext.GetSQLAsync<ResultType>(sqlInsertRole, new { request.TenRole });
                        roleId = res.FirstOrDefault()?.UserId ?? 0;
                    }
                    else
                    {
                        string sqlUpdateRole = "UPDATE Roles SET TenRole = @TenRole WHERE RoleId = @RoleId";
                        await _dapperContext.ExecuteSQLAsync(sqlUpdateRole, new { request.TenRole, RoleId = roleId });
                    }

                    if (roleId <= 0) return false;
                    string sqlDelete = "DELETE FROM RolePermissions WHERE RoleId = @roleId";
                    await _dapperContext.ExecuteSQLAsync(sqlDelete, new { roleId });

                    if (request.PermissionIds != null && request.PermissionIds.Any())
                    {
                        string sqlInsertPerm = "INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@roleId, @pId)";
                        foreach (var pId in request.PermissionIds)
                        {
                            await _dapperContext.ExecuteSQLAsync(sqlInsertPerm, new { roleId, pId });
                        }
                    }
                    if (request.UserIds != null && request.UserIds.Any())
                    {
                        string sqlDeleteUserRoles = "DELETE FROM UserRoles WHERE RoleId = @roleId";
                        await _dapperContext.ExecuteSQLAsync(sqlDeleteUserRoles, new { roleId });
                        string sqlInsertUserRoles = "INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId)";
                        foreach (var uId in request.UserIds)
                        {
                            await _dapperContext.ExecuteSQLAsync(sqlInsertUserRoles, new { userId = uId, roleId });
                        }
                    }
                    scope.Complete();
                    return true;
                }
                catch (Exception)
                {
                    return false;
                }
            }
        }
        public async Task<bool> UpdateRoleStatusAsync(int roleId, bool isActive)
        {
            string sql = @"UPDATE Roles SET IsActived = @isActive WHERE RoleId = @roleId";
            await _dapperContext.ExecuteSQLAsync(sql, new { roleId, isActive });
            return true;
        }
        public async Task<bool> SoftDeleteRoleAsync(int roleId)
        {
            string sql = @"UPDATE Roles SET IsDeleted = 1 WHERE RoleId = @roleId";
            await _dapperContext.ExecuteSQLAsync(sql, new { roleId });
            return true;
        }
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            string sql = @"SELECT u.UserId, u.UserName, u.TenNguoiDung, u.Email, u.Phone, u.ChiNhanhId, u.PhongBanId, u.ChucVuId, u.IsActived, c.TenChiNhanh, pb.TenPhongBan, cv.TenChucVu 
                            FROM Users u 
                            LEFT JOIN ChiNhanh c ON u.ChiNhanhId = c.ChiNhanhId
                            LEFT JOIN PhongBan pb ON u.PhongBanId = pb.Id
                            LEFT JOIN ChucVu cv ON u.ChucVuId = cv.Id
                            WHERE u.IsDeleted = 0";
            return await _dapperContext.GetSQLAsync<User>(sql);
        }
        public async Task<bool> UpdateUserStatusAsync(int userId, bool isActive)
        {
            string sql = @"UPDATE Users SET IsActived = @isActive WHERE UserId = @userId";
            await _dapperContext.ExecuteSQLAsync(sql, new { userId, isActive });
            return true;
        }
        public async Task<IEnumerable<UserRoles>> GetAllUserRolesAsync()
        {
            string sql = @"SELECT ur.RoleId, ur.UserId, u.UserName, r.TenRole
                           FROM UserRoles ur
                           LEFT JOIN Users u ON ur.UserId = u.UserId
                           LEFT JOIN Roles r ON ur.RoleId = r.RoleId";
            return await _dapperContext.GetSQLAsync<UserRoles>(sql);
        }
        public async Task<bool> SoftDeleteUserRoleAsync(int userId, int roleId)
        {
            string sql = @"DELETE FROM UserRoles WHERE UserId = @userId AND RoleId = @roleId";
            await _dapperContext.ExecuteSQLAsync(sql, new { userId, roleId });
            return true;
        }
        public async Task<bool> CreateUserAsync(UserSaveRequest request)
        {
            using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
            {
                try
                {
                    string checkSql = "SELECT COUNT(1) AS UserId FROM Users WHERE UserName = @UserName AND IsDeleted = 0";
                    var count = await _dapperContext.GetSQLAsync<ResultType>(checkSql, new { request.UserName });

                    if (count.FirstOrDefault()?.UserId > 0) return false;

                    string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    string sqlInsertUser = @"INSERT INTO Users (UserName, Password, TenNguoiDung, Email, Phone, PhongBanId, ChucVuId, ChiNhanhId, IsDeleted, IsActived)
                                     VALUES (@UserName, @Password, @TenNguoiDung, @Email, @Phone, @PhongBanId, @ChucVuId, @ChiNhanhId, 0, 1);
                                     SELECT CAST(SCOPE_IDENTITY() as int) AS UserId;";

                    var insertResult = await _dapperContext.GetSQLAsync<ResultType>(sqlInsertUser, new
                    {
                        request.UserName,
                        Password = hashedPassword,
                        request.TenNguoiDung,
                        request.Email,
                        request.Phone,
                        request.PhongBanId,
                        request.ChucVuId,
                        request.ChiNhanhId
                    });

                    int newUserId = insertResult.FirstOrDefault()?.UserId ?? 0;
                    if (newUserId <= 0) return false;
                    if (request.RoleIds != null && request.RoleIds.Any())
                    {
                        string sqlInsRoles = "INSERT INTO UserRoles (UserId, RoleId) VALUES (@UserId, @RoleId)";

                        foreach (var rId in request.RoleIds)
                        {
                            await _dapperContext.ExecuteSQLAsync(sqlInsRoles, new
                            {
                                UserId = newUserId,
                                RoleId = rId
                            });
                        }
                    }

                    scope.Complete();
                    return true;
                }
                catch (Exception ex)
                {

                    throw ex;
                }
            }
        }
        public async Task<bool> UpdateUserAsync(UserSaveRequest request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("UserId", request.UserId);
            parameters.Add("TenNguoiDung", request.TenNguoiDung);
            parameters.Add("Email", request.Email);
            parameters.Add("Phone", request.Phone);
            parameters.Add("PhongBanId", request.PhongBanId);
            parameters.Add("ChucVuId", request.ChucVuId);

            string chiNhanhSql = "";
            if (request.ChiNhanhId > 0)
            {
                chiNhanhSql = ", ChiNhanhId = @ChiNhanhId";
                parameters.Add("ChiNhanhId", request.ChiNhanhId);
            }

            string passwordSql = "";
            if (!string.IsNullOrEmpty(request.Password))
            {
                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);
                passwordSql = ", Password = @Password";
                parameters.Add("Password", hashedPassword);
            }

            string sqlUser = $@"UPDATE Users SET TenNguoiDung = @TenNguoiDung, Email = @Email, Phone = @Phone, PhongBanId = @PhongBanId, ChucVuId = @ChucVuId {chiNhanhSql} {passwordSql}
                        WHERE UserId = @UserId";
            await _dapperContext.ExecuteSQLAsync(sqlUser, parameters);

            string sqlDelRoles = "DELETE FROM UserRoles WHERE UserId = @UserId";
            await _dapperContext.ExecuteSQLAsync(sqlDelRoles, new { request.UserId });
            if (request.RoleIds != null && request.RoleIds.Any())
            {
                string sqlInsRoles = "INSERT INTO UserRoles (UserId, RoleId) VALUES (@UserId, @RoleId)";
                foreach (var rId in request.RoleIds)
                {
                    await _dapperContext.ExecuteSQLAsync(sqlInsRoles, new { UserId = request.UserId, RoleId = rId });
                }
            }
            return true;
        }
        public async Task<bool> SoftDeleteUserAsync(int userId)
        {
            string sql = @"UPDATE Users SET IsDeleted = 1 WHERE UserId = @userId";
            await _dapperContext.ExecuteSQLAsync(sql, new { userId });
            return true;
        }
    }
}
