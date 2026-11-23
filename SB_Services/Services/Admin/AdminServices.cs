using SB_DAL.DapperContext;
using SB_Services.DTO;

namespace SB_Services.Services.Admin
{
    public class AdminServices(IDapperContext dapperContext) : IAdminServices
    {
        private readonly IDapperContext _dapper = dapperContext;

        private static readonly Dictionary<byte, string> TrangThaiLabels = new()
        {
            { 0, "Nháp" },
            { 1, "Chờ xử lý" },
            { 2, "Đang xem xét" },
            { 3, "Đề xuất đổi lịch" },
            { 4, "Yêu cầu bổ sung" },
            { 5, "Đã duyệt lịch" },
            { 6, "Đã trình" },
            { 7, "Hoàn thành" },
            { 8, "Từ chối" },
            { 9, "Đã hủy" },
            { 10, "Hoãn" },
            { 11, "Vắng" }
        };

        public async Task<AdminDashboardDto> GetDashboardAsync()
        {
            var todayStart = DateTime.Today;
            var todayEnd = todayStart.AddDays(1);

            const string sqlTongQuan = @"
                SELECT
                    (SELECT COUNT(1) FROM dbo.YeuCau WHERE IsDeleted = 0) AS TongYeuCau,
                    (SELECT COUNT(1) FROM dbo.YeuCau WHERE IsDeleted = 0 AND TrangThai IN (1, 2, 3, 4)) AS ChoXuLy,
                    (SELECT COUNT(1) FROM dbo.YeuCau WHERE IsDeleted = 0 AND TrangThai = 5) AS DaDuyetLich,
                    (SELECT COUNT(1) FROM dbo.YeuCau WHERE IsDeleted = 0 AND TrangThai IN (6, 7)) AS DaHoanThanh,
                    (SELECT COUNT(1) FROM dbo.YeuCau WHERE IsDeleted = 0 AND TrangThai IN (8, 9)) AS TuChoiHuy,
                    (SELECT COUNT(1) FROM dbo.LanhDao WHERE IsDeleted = 0 AND IsActived = 1) AS TongLanhDao,
                    (SELECT COUNT(1) FROM dbo.LichTrinh WHERE IsDeleted = 0 AND TrangThai <> 3 AND BatDau >= @TodayStart AND BatDau < @TodayEnd) AS BuoiTrinhHomNay,
                    (SELECT COUNT(1) FROM dbo.Users WHERE ISNULL(IsDeleted, 0) = 0 AND ISNULL(IsActived, 1) = 1) AS TongNguoiDung";

            const string sqlTheoTrangThai = @"
                SELECT TrangThai, COUNT(1) AS SoLuong
                FROM dbo.YeuCau
                WHERE IsDeleted = 0
                GROUP BY TrangThai
                ORDER BY TrangThai ASC";

            const string sqlTheoChiNhanh = @"
                SELECT
                    cn.ChiNhanhId,
                    cn.MaChiNhanh,
                    cn.TenChiNhanh,
                    COUNT(yc.Id) AS TongYeuCau,
                    SUM(CASE WHEN yc.TrangThai IN (1, 2, 3, 4, 5) THEN 1 ELSE 0 END) AS DangXuLy,
                    SUM(CASE WHEN yc.TrangThai IN (6, 7) THEN 1 ELSE 0 END) AS HoanThanh,
                    SUM(CASE WHEN yc.TrangThai IN (8, 9) THEN 1 ELSE 0 END) AS TuChoiHuy
                FROM dbo.ChiNhanh cn
                LEFT JOIN dbo.YeuCau yc ON yc.ChiNhanhId = cn.ChiNhanhId AND yc.IsDeleted = 0
                WHERE cn.IsActive = 1
                GROUP BY cn.ChiNhanhId, cn.MaChiNhanh, cn.TenChiNhanh
                ORDER BY cn.ChiNhanhId ASC";

            const string sqlLichHomNay = @"
                SELECT
                    lt.Id AS LichTrinhId,
                    yc.Id AS YeuCauId,
                    yc.MaYeuCau,
                    yc.TieuDe,
                    ISNULL(uLd.TenNguoiDung, N'') AS TenLanhDao,
                    ISNULL(uNv.TenNguoiDung, N'') AS TenNguoiTrinh,
                    lt.BatDau,
                    lt.KetThuc,
                    lt.TrangThai AS TrangThaiLich
                FROM dbo.LichTrinh lt
                INNER JOIN dbo.YeuCau yc ON yc.Id = lt.YeuCauId AND yc.IsDeleted = 0
                INNER JOIN dbo.LanhDao ld ON ld.Id = lt.LanhDaoId
                INNER JOIN dbo.Users uLd ON uLd.UserId = ld.UserId
                INNER JOIN dbo.Users uNv ON uNv.UserId = yc.NguoiTaoId
                WHERE lt.IsDeleted = 0
                  AND lt.TrangThai <> 3
                  AND lt.BatDau >= @TodayStart
                  AND lt.BatDau < @TodayEnd
                ORDER BY lt.BatDau ASC, lt.Id ASC";

            var tongQuan = (await _dapper.GetSQLAsync<AdminTongQuanDto>(sqlTongQuan, new { TodayStart = todayStart, TodayEnd = todayEnd }))
                .FirstOrDefault() ?? new AdminTongQuanDto();

            var theoTrangThai = (await _dapper.GetSQLAsync<AdminTheoTrangThaiDto>(sqlTheoTrangThai)).ToList();
            foreach (var item in theoTrangThai)
            {
                item.TenTrangThai = TrangThaiLabels.TryGetValue(item.TrangThai, out var label)
                    ? label
                    : $"Trạng thái {item.TrangThai}";
            }

            var theoChiNhanh = (await _dapper.GetSQLAsync<AdminTheoChiNhanhDto>(sqlTheoChiNhanh)).ToList();
            var lichHomNay = (await _dapper.GetSQLAsync<AdminLichHomNayDto>(sqlLichHomNay, new { TodayStart = todayStart, TodayEnd = todayEnd })).ToList();

            return new AdminDashboardDto
            {
                TongQuan = tongQuan,
                TheoTrangThai = theoTrangThai,
                TheoChiNhanh = theoChiNhanh,
                LichHomNay = lichHomNay
            };
        }

        public async Task<AdminLanhDaoListResponseDto> GetLanhDaosAsync()
        {
            const string sqlLanhDaos = @"
                SELECT
                    ld.Id,
                    ld.ChiNhanhId,
                    ISNULL(cn.TenChiNhanh, N'') AS TenChiNhanh,
                    ld.UserId,
                    ISNULL(uLd.TenNguoiDung, N'') AS HoTen,
                    ISNULL(uLd.UserName, N'') AS UserName,
                    ISNULL(cv.TenChucVu, N'') AS TenChucVu,
                    ISNULL(pb.TenPhongBan, N'') AS TenPhongBan,
                    ld.CapDo,
                    ld.ThuTuHienThi,
                    ld.IsActived,
                    tl.UserId AS TroLyUserId,
                    ISNULL(uTl.TenNguoiDung, N'') AS TenTroLy,
                    ISNULL(uTl.UserName, N'') AS UserNameTroLy
                FROM dbo.LanhDao ld
                INNER JOIN dbo.Users uLd ON uLd.UserId = ld.UserId
                LEFT JOIN dbo.ChiNhanh cn ON cn.ChiNhanhId = ld.ChiNhanhId
                LEFT JOIN dbo.ChucVu cv ON cv.Id = uLd.ChucVuId
                LEFT JOIN dbo.PhongBan pb ON pb.Id = uLd.PhongBanId AND pb.IsDeleted = 0
                OUTER APPLY (
                    SELECT TOP 1 t.UserId
                    FROM dbo.TroLy t
                    WHERE t.LanhDaoId = ld.Id AND t.IsDeleted = 0 AND t.IsActived = 1
                    ORDER BY t.IsTroLyChinh DESC, t.Id ASC
                ) tl
                LEFT JOIN dbo.Users uTl ON uTl.UserId = tl.UserId
                WHERE ld.IsDeleted = 0
                ORDER BY ld.ThuTuHienThi ASC, ld.Id ASC";

            const string sqlUsers = @"
                SELECT
                    u.UserId,
                    ISNULL(u.UserName, N'') AS UserName,
                    ISNULL(u.TenNguoiDung, N'') AS TenNguoiDung,
                    ISNULL(u.ChiNhanhId, 0) AS ChiNhanhId,
                    ISNULL(cn.TenChiNhanh, N'') AS TenChiNhanh,
                    ISNULL(cv.TenChucVu, N'') AS TenChucVu,
                    ISNULL(pb.TenPhongBan, N'') AS TenPhongBan
                FROM dbo.Users u
                LEFT JOIN dbo.ChiNhanh cn ON cn.ChiNhanhId = u.ChiNhanhId
                LEFT JOIN dbo.ChucVu cv ON cv.Id = u.ChucVuId
                LEFT JOIN dbo.PhongBan pb ON pb.Id = u.PhongBanId AND pb.IsDeleted = 0
                WHERE ISNULL(u.IsDeleted, 0) = 0 AND ISNULL(u.IsActived, 1) = 1
                ORDER BY u.TenNguoiDung ASC";

            const string sqlUserRoles = @"
                SELECT ur.UserId, ISNULL(r.TenRole, N'') AS TenRole
                FROM dbo.UserRoles ur
                INNER JOIN dbo.Roles r ON r.RoleId = ur.RoleId
                WHERE ISNULL(r.IsDeleted, 0) = 0 AND ISNULL(r.IsActived, 1) = 1";

            var lanhDaos = (await _dapper.GetSQLAsync<AdminLanhDaoRowDto>(sqlLanhDaos)).ToList();
            var users = (await _dapper.GetSQLAsync<AdminUserOptionDto>(sqlUsers)).ToList();
            var rolesByUser = (await _dapper.GetSQLAsync<UserRoleNameRow>(sqlUserRoles))
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.TenRole).ToList());

            foreach (var u in users)
            {
                if (rolesByUser.TryGetValue(u.UserId, out var rNames))
                    u.RoleNames = rNames;
            }

            return new AdminLanhDaoListResponseDto
            {
                LanhDaos = lanhDaos,
                Users = users
            };
        }

        public async Task<int> SaveLanhDaoAsync(int currentUserId, int defaultChiNhanhId, SaveLanhDaoRequest req)
        {
            if (req.UserId <= 0)
                throw new ArgumentException("Vui lòng chọn tài khoản lãnh đạo.");

            if (req.TroLyUserId.HasValue && req.TroLyUserId.Value == req.UserId)
                throw new ArgumentException("Lãnh đạo và trợ lý không thể là cùng một tài khoản.");

            // Gọi SP để đảm bảo giao dịch nguyên tử cho quy tắc 1 Lãnh đạo = 1 Trợ lý duy nhất
            int lanhDaoId = await _dapper.ExecuteScalarAsync<int>(
                "dbo.usp_Admin_SaveLanhDao",
                new
                {
                    Id = req.Id,
                    req.UserId,
                    ChiNhanhId = req.ChiNhanhId ?? defaultChiNhanhId,
                    req.CapDo,
                    req.ThuTuHienThi,
                    req.IsActived,
                    req.TroLyUserId,
                    CurrentUserId = currentUserId
                },
                System.Data.CommandType.StoredProcedure);

            return lanhDaoId;
        }

        public async Task<bool> DeleteLanhDaoAsync(int id)
        {
            const string sql = @"
                UPDATE dbo.TroLy
                SET IsDeleted = 1, IsActived = 0
                WHERE LanhDaoId = @Id AND IsDeleted = 0;

                UPDATE dbo.LanhDao
                SET IsDeleted = 1, IsActived = 0
                WHERE Id = @Id AND IsDeleted = 0;";

            await _dapper.ExecuteSQLAsync(sql, new { Id = id });
            return true;
        }

        public async Task<List<AdminLoaiYeuCauRowDto>> GetLoaiYeuCausAsync()
        {
            const string sql = @"
                SELECT Id, ChiNhanhId, MaLoai, TenLoai, ThoiLuongMacDinhPhut, IsActived
                FROM dbo.LoaiYeuCau
                WHERE IsDeleted = 0
                ORDER BY ThuTu ASC, Id ASC";

            return (await _dapper.GetSQLAsync<AdminLoaiYeuCauRowDto>(sql)).ToList();
        }

        public async Task<int> SaveLoaiYeuCauAsync(int currentUserId, int defaultChiNhanhId, SaveLoaiYeuCauRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.MaLoai) || string.IsNullOrWhiteSpace(req.TenLoai))
                throw new ArgumentException("Mã loại và tên loại yêu cầu không được để trống.");

            int chiNhanhId = req.ChiNhanhId ?? defaultChiNhanhId;
            int thoiLuong = Math.Max(5, req.ThoiLuongMacDinhPhut);

            if (req.Id > 0)
            {
                const string sqlUpdate = @"
                    UPDATE dbo.LoaiYeuCau
                    SET ChiNhanhId = @ChiNhanhId,
                        MaLoai = @MaLoai,
                        TenLoai = @TenLoai,
                        ThoiLuongMacDinhPhut = @ThoiLuongMacDinhPhut,
                        IsActived = @IsActived,
                        UpdatedAt = GETDATE(),
                        UpdatedBy = @UpdatedBy
                    WHERE Id = @Id AND IsDeleted = 0";

                await _dapper.ExecuteSQLAsync(sqlUpdate, new
                {
                    req.Id,
                    ChiNhanhId = chiNhanhId,
                    MaLoai = req.MaLoai.Trim().ToUpperInvariant(),
                    TenLoai = req.TenLoai.Trim(),
                    ThoiLuongMacDinhPhut = thoiLuong,
                    req.IsActived,
                    UpdatedBy = currentUserId
                });

                return req.Id;
            }
            else
            {
                const string sqlInsert = @"
                    DECLARE @NextThuTu INT = ISNULL((SELECT MAX(ThuTu) FROM dbo.LoaiYeuCau WHERE IsDeleted = 0), 0) + 1;
                    INSERT INTO dbo.LoaiYeuCau (
                        ChiNhanhId, MaLoai, TenLoai, ThoiLuongMacDinhPhut, ThuTu,
                        IsActived, IsDeleted, CreatedAt, CreatedBy
                    )
                    OUTPUT INSERTED.Id
                    VALUES (
                        @ChiNhanhId, @MaLoai, @TenLoai, @ThoiLuongMacDinhPhut, @NextThuTu,
                        @IsActived, 0, GETDATE(), @CreatedBy
                    )";

                return await _dapper.ExecuteScalarAsync<int>(sqlInsert, new
                {
                    ChiNhanhId = chiNhanhId,
                    MaLoai = req.MaLoai.Trim().ToUpperInvariant(),
                    TenLoai = req.TenLoai.Trim(),
                    ThoiLuongMacDinhPhut = thoiLuong,
                    req.IsActived,
                    CreatedBy = currentUserId
                });
            }
        }

        public async Task<bool> DeleteLoaiYeuCauAsync(int currentUserId, int id)
        {
            const string sql = @"
                UPDATE dbo.LoaiYeuCau
                SET IsDeleted = 1, IsActived = 0, UpdatedAt = GETDATE(), UpdatedBy = @UpdatedBy
                WHERE Id = @Id AND IsDeleted = 0";

            await _dapper.ExecuteSQLAsync(sql, new { Id = id, UpdatedBy = currentUserId });
            return true;
        }

        public async Task<List<AdminMucUuTienRowDto>> GetMucUuTiensAsync()
        {
            const string sql = @"
                SELECT
                    Id,
                    ChiNhanhId,
                    CONCAT(N'P', Ma) AS Code,
                    Ten,
                    TrongSo,
                    ISNULL(MauHienThi, N'#2563eb') AS MauHienThi,
                    IsActived
                FROM dbo.MucUuTien
                WHERE IsDeleted = 0
                ORDER BY TrongSo DESC, Ma ASC";

            return (await _dapper.GetSQLAsync<AdminMucUuTienRowDto>(sql)).ToList();
        }

        public async Task<int> SaveMucUuTienAsync(int defaultChiNhanhId, SaveMucUuTienRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.Ten))
                throw new ArgumentException("Mã và tên mức ưu tiên không được để trống.");

            byte maSo = ParsePriorityCodeToByte(req.Code);
            int chiNhanhId = req.ChiNhanhId ?? defaultChiNhanhId;
            string mau = string.IsNullOrWhiteSpace(req.MauHienThi) ? "#2563eb" : req.MauHienThi.Trim();

            if (req.Id > 0)
            {
                const string sqlUpdate = @"
                    UPDATE dbo.MucUuTien
                    SET ChiNhanhId = @ChiNhanhId,
                        Ma = @Ma,
                        Ten = @Ten,
                        TrongSo = @TrongSo,
                        MauHienThi = @MauHienThi,
                        IsActived = @IsActived
                    WHERE Id = @Id AND IsDeleted = 0";

                await _dapper.ExecuteSQLAsync(sqlUpdate, new
                {
                    req.Id,
                    ChiNhanhId = chiNhanhId,
                    Ma = maSo,
                    Ten = req.Ten.Trim(),
                    req.TrongSo,
                    MauHienThi = mau,
                    req.IsActived
                });

                return req.Id;
            }
            else
            {
                const string sqlInsert = @"
                    INSERT INTO dbo.MucUuTien (ChiNhanhId, Ma, Ten, TrongSo, MauHienThi, IsActived, IsDeleted)
                    OUTPUT INSERTED.Id
                    VALUES (@ChiNhanhId, @Ma, @Ten, @TrongSo, @MauHienThi, @IsActived, 0)";

                return await _dapper.ExecuteScalarAsync<int>(sqlInsert, new
                {
                    ChiNhanhId = chiNhanhId,
                    Ma = maSo,
                    Ten = req.Ten.Trim(),
                    req.TrongSo,
                    MauHienThi = mau,
                    req.IsActived
                });
            }
        }

        public async Task<bool> DeleteMucUuTienAsync(int id)
        {
            const string sql = @"
                UPDATE dbo.MucUuTien
                SET IsDeleted = 1, IsActived = 0
                WHERE Id = @Id AND IsDeleted = 0";

            await _dapper.ExecuteSQLAsync(sql, new { Id = id });
            return true;
        }

        private static byte ParsePriorityCodeToByte(string code)
        {
            var digits = new string(code.Trim().Where(char.IsDigit).ToArray());
            if (byte.TryParse(digits, out var val) && val > 0) return val;
            throw new ArgumentException("Mã mức ưu tiên cần chứa số hợp lệ (ví dụ: P1, P2, P3, P4).");
        }

        private sealed class UserRoleNameRow
        {
            public int UserId { get; set; }
            public string TenRole { get; set; } = string.Empty;
        }
    }
}
