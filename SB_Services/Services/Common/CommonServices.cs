using SB_DAL.DapperContext;
using SB_Services.DTO;
using SB_Services.EF;

namespace SB_Services.Services.Common
{
    // Chứa các service nhỏ
    public class CommonServices : ICommonServices
    {
        private readonly IDapperContext _dapperContext;
        public CommonServices(IDapperContext dapperContext)
        {
            _dapperContext = dapperContext;
        }
        public async Task<IEnumerable<ChiNhanh>> GetChiNhanhsAsync()
        {
            string sql = @"SELECT ChiNhanhId, ParentId, ChiNhanhType, MaChiNhanh, TenChiNhanh, Address, Phone, IsActive AS IsActived FROM ChiNhanh";
            return await _dapperContext.GetSQLAsync<ChiNhanh>(sql);
        }
        public async Task<IEnumerable<ThongBaoDTO>> GetDanhSachThongBaoAsync(int chiNhanhId, int userId)
        {
            string sql = @"
                SELECT tb.Id, tb.NoiDung, tb.CreatedAt, tb.ChiNhanhId,
                    CASE 
                        WHEN dtb.UserId IS NOT NULL THEN 1 
                        ELSE 0 
                    END AS IsRead
                FROM ThongBao tb
                LEFT JOIN DocThongBao dtb ON tb.Id = dtb.ThongBaoId AND dtb.UserId = @UserId
                WHERE tb.ChiNhanhId = @ChiNhanhId
                ORDER BY tb.CreatedAt DESC"; // Thông báo mới nhất luôn xếp lên đầu tiên

            return await _dapperContext.GetSQLAsync<ThongBaoDTO>(sql, new { ChiNhanhId = chiNhanhId, UserId = userId });
        }
        public async Task<bool> MarkReadAsync(int userId, List<int> listThongBaoIds)
        {
            if (listThongBaoIds == null || !listThongBaoIds.Any()) return true;

            string sql = @"
                INSERT INTO DocThongBao (ThongBaoId, UserId)
                SELECT tbId, @UserId
                FROM (
                    SELECT Id AS tbId 
                    FROM ThongBao 
                    WHERE Id IN @ListThongBaoIds
                ) AS Temp
                WHERE NOT EXISTS (
                    SELECT 1 FROM DocThongBao
                    WHERE ThongBaoId = Temp.tbId AND UserId = @UserId)";

            int rowsAffected = await _dapperContext.ExecuteSQLAsync(sql, new
            {
                UserId = userId,
                ListThongBaoIds = listThongBaoIds // Truyền nguyên cái List/Array vào đây
            });

            return rowsAffected > 0;
        }

        public async Task<IEnumerable<ThongBaoLichTrinhDto>> GetThongBaoLichTrinhAsync(int userId)
        {
            const string sql = @"
                SELECT TOP 50
                    tb.Id,
                    tb.ChiNhanhId,
                    tb.NguoiNhanId,
                    tb.TieuDe,
                    tb.NoiDung,
                    ISNULL(tb.LoaiSuKien, N'') AS LoaiSuKien,
                    tb.YeuCauId,
                    tb.LichTrinhId,
                    CASE
                        WHEN tb.LoaiSuKien IN (N'LICH_SAP_TRINH_LANH_DAO', N'LICH_MOI_LANH_DAO', N'LICH_MOI', N'NHAC_LICH_LANH_DAO', N'DA_HUY_LANH_DAO')
                            THEN N'/lanh-dao'
                        WHEN tb.LoaiSuKien IN (N'YEU_CAU_MOI_TRO_LY', N'YEUCAU_MOI', N'BO_SUNG_TRO_LY', N'PHAN_HOI_DE_XUAT', N'GHI_CHU_TRO_LY', N'DA_HUY_TRO_LY', N'PHAN_HOI_LANH_DAO_TRO_LY')
                            THEN N'/tro-ly'
                        WHEN tb.YeuCauId IS NOT NULL
                            THEN CONCAT(N'/nhan-vien/detail-request/', tb.YeuCauId)
                        ELSE N'/nhan-vien'
                    END AS RouteUrl,
                    tb.DaDoc,
                    tb.NgayDoc,
                    tb.CreatedAt
                FROM dbo.ThongBaoLichTrinh tb
                WHERE tb.NguoiNhanId = @UserId
                  AND tb.IsDeleted = 0
                  AND tb.IsActived = 1
                ORDER BY tb.CreatedAt DESC, tb.Id DESC";

            return await _dapperContext.GetSQLAsync<ThongBaoLichTrinhDto>(sql, new { UserId = userId });
        }

        public async Task<bool> MarkThongBaoLichTrinhReadAsync(int userId, int id)
        {
            const string sql = @"
                UPDATE dbo.ThongBaoLichTrinh
                SET DaDoc = 1,
                    NgayDoc = ISNULL(NgayDoc, GETDATE()),
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @UserId
                WHERE Id = @Id AND NguoiNhanId = @UserId AND IsDeleted = 0";

            await _dapperContext.ExecuteSQLAsync(sql, new { Id = id, UserId = userId });
            return true;
        }

        public async Task<bool> MarkAllThongBaoLichTrinhReadAsync(int userId)
        {
            const string sql = @"
                UPDATE dbo.ThongBaoLichTrinh
                SET DaDoc = 1,
                    NgayDoc = ISNULL(NgayDoc, GETDATE()),
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @UserId
                WHERE NguoiNhanId = @UserId AND DaDoc = 0 AND IsDeleted = 0";

            await _dapperContext.ExecuteSQLAsync(sql, new { UserId = userId });
            return true;
        }

        public async Task<IEnumerable<PhongBan>> GetPhongBansAsync()
        {
            string sql = @"SELECT * FROM PhongBan WHERE IsDeleted = 0 ORDER BY Id DESC";
            return await _dapperContext.GetSQLAsync<PhongBan>(sql);
        }
        //thêm, sửa xoá, phòng ban
        public async Task<bool> CreatePhongBanAsync(PhongBan phongBan)
        {
            string sql = @"INSERT INTO PhongBan (ChiNhanhId, ParentId, MaPhongBan, TenPhongBan) 
                        VALUES (@ChiNhanhId, @ParentId, @MaPhongBan, @TenPhongBan)";
            await _dapperContext.ExecuteSQLAsync(sql, phongBan);
            return true;
        }
        public async Task<bool> UpdatePhongBanAsync(PhongBan phongBan)
        {
            string sql = @"UPDATE PhongBan 
                        SET ChiNhanhId = @ChiNhanhId, ParentId = @ParentId, MaPhongBan = @MaPhongBan, TenPhongBan = @TenPhongBan
                        WHERE Id = @Id";
            await _dapperContext.ExecuteSQLAsync(sql, phongBan);
            return true;
        }
        public async Task<bool> DeletePhongBanAsync(int phongBanId)
        {
            string sql = @"UPDATE PhongBan SET IsDeleted = 1 WHERE Id = @Id";
            await _dapperContext.ExecuteSQLAsync(sql, new { Id = phongBanId });
            return true;
        }
        public async Task<IEnumerable<ChucVu>> GetChucVusAsync()
        {
            string sql = @"SELECT * FROM ChucVu ORDER BY CapBac ASC";
            return await _dapperContext.GetSQLAsync<ChucVu>(sql);
        }
    }
}
