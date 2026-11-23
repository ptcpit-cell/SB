using Dapper;
using SB_DAL.DapperContext;
using SB_Services.DTO;
using SB_Services.EF;
using SB_Services.Services.TroLy;
using System.Data;

namespace SB_Services.Services.LanhDao
{
    public class LanhDaoServices(IDapperContext dapperContext) : ILanhDaoServices
    {
        private readonly IDapperContext _dapper = dapperContext;
        private readonly TroLyServices _scheduleHelper = new(dapperContext);

        public async Task<LanhDaoDashboardDto> GetLichNgayAsync(int lanhDaoUserId, DateTime ngay)
        {
            var lanhDao = await ResolveLanhDaoAsync(lanhDaoUserId);
            var cauHinh = await _scheduleHelper.GetOrDefaultCauHinhAsync(lanhDao.LanhDaoId, lanhDao.ChiNhanhId);

            var dayStart = ngay.Date;
            var dayEnd = dayStart.AddDays(1);

            var lichTrinhs = await _scheduleHelper.GetLichTrinhInRangeAsync(lanhDao.LanhDaoId, dayStart, dayEnd);
            var suKiens = await _scheduleHelper.GetSuKienInRangeAsync(lanhDao.LanhDaoId, dayStart, dayEnd);

            var activeLich = lichTrinhs.Where(x => x.TrangThaiLich != (byte)TrangThaiLichTrinh.DaHuy).ToList();

            return new LanhDaoDashboardDto
            {
                Ngay = dayStart.ToString("yyyy-MM-dd"),
                LanhDao = MapInfo(lanhDao),
                CauHinh = cauHinh,
                LichTrinhs = lichTrinhs,
                SuKiens = suKiens,
                ThongKe = new LanhDaoThongKeDto
                {
                    TongBuoiTrinh = activeLich.Count,
                    ChoTrinh = activeLich.Count(x => x.TrangThaiLich == (byte)TrangThaiLichTrinh.DaXep),
                    DaTrinh = activeLich.Count(x => x.TrangThaiLich == (byte)TrangThaiLichTrinh.DaTrinh),
                    TongPhut = activeLich.Sum(x => Math.Max(0, (int)(x.KetThuc - x.BatDau).TotalMinutes)),
                    SuKienKhac = suKiens.Count
                }
            };
        }

        public async Task<WeekScheduleResponseDto> GetLichTuanAsync(int lanhDaoUserId, DateTime tuNgay, DateTime denNgay)
        {
            var lanhDao = await ResolveLanhDaoAsync(lanhDaoUserId);
            var cauHinh = await _scheduleHelper.GetOrDefaultCauHinhAsync(lanhDao.LanhDaoId, lanhDao.ChiNhanhId);

            var start = tuNgay.Date;
            var endExclusive = denNgay.Date.AddDays(1);

            var lichTrinhs = await _scheduleHelper.GetLichTrinhInRangeAsync(lanhDao.LanhDaoId, start, endExclusive);
            var suKiens = await _scheduleHelper.GetSuKienInRangeAsync(lanhDao.LanhDaoId, start, endExclusive);

            return new WeekScheduleResponseDto
            {
                TuNgay = start.ToString("yyyy-MM-dd"),
                DenNgay = denNgay.Date.ToString("yyyy-MM-dd"),
                LanhDao = MapInfo(lanhDao),
                CauHinh = cauHinh,
                LichTrinhs = lichTrinhs,
                SuKiens = suKiens
            };
        }

        public async Task<PhanHoiLanhDaoResultDto> CapNhatPhanHoiAsync(int lanhDaoUserId, int lichTrinhId, PhanHoiLanhDaoRequest req)
        {
            var lanhDao = await ResolveLanhDaoAsync(lanhDaoUserId);

            // Gọi SP giao dịch cập nhật đồng thời KetQuaTrinh (ChiDaoCuaLanhDao), LichTrinh (GhiChuLanhDao + TrangThai), YeuCau & YeuCauLichSuTrangThai
            var result = (await _dapper.GetStoreAsync<PhanHoiLanhDaoResultDto>(
                "dbo.usp_LanhDao_CapNhatPhanHoi",
                new
                {
                    LanhDaoId = lanhDao.LanhDaoId,
                    LanhDaoUserId = lanhDaoUserId,
                    LichTrinhId = lichTrinhId,
                    req.KetQua,
                    req.HoanThanh,
                    ChiDaoCuaLanhDao = string.IsNullOrWhiteSpace(req.ChiDaoCuaLanhDao) ? null : req.ChiDaoCuaLanhDao.Trim(),
                    GhiChuLanhDao = string.IsNullOrWhiteSpace(req.GhiChuLanhDao) ? null : req.GhiChuLanhDao.Trim(),
                    GhiChu = string.IsNullOrWhiteSpace(req.GhiChu) ? null : req.GhiChu.Trim()
                })).FirstOrDefault();

            if (result == null)
                throw new KeyNotFoundException("Không tìm thấy buổi trình thuộc lịch của bạn.");

            // Lưu danh sách công việc sau trình (nếu lãnh đạo có giao thêm)
            if (req.CongViecs != null && req.CongViecs.Count > 0 && result.KetQuaTrinhId > 0)
            {
                const string sqlClearOld = @"
                    UPDATE dbo.CongViecSauTrinh
                    SET IsDeleted = 1
                    WHERE KetQuaTrinhId = @KetQuaTrinhId AND IsDeleted = 0";

                await _dapper.ExecuteSQLAsync(sqlClearOld, new { result.KetQuaTrinhId });

                const string sqlInsertCv = @"
                    INSERT INTO dbo.CongViecSauTrinh (
                        ChiNhanhId, KetQuaTrinhId, NoiDung, NguoiPhuTrachId, HanXuLy, TrangThai, IsActived, IsDeleted
                    )
                    VALUES (
                        @ChiNhanhId, @KetQuaTrinhId, @NoiDung, @NguoiPhuTrachId, @HanXuLy, @TrangThai, 1, 0
                    )";

                foreach (var cv in req.CongViecs.Where(x => !string.IsNullOrWhiteSpace(x.NoiDung)))
                {
                    await _dapper.ExecuteSQLAsync(sqlInsertCv, new
                    {
                        lanhDao.ChiNhanhId,
                        result.KetQuaTrinhId,
                        NoiDung = cv.NoiDung.Trim(),
                        NguoiPhuTrachId = result.NguoiTaoId,
                        cv.HanXuLy,
                        TrangThai = cv.TrangThai == 0 ? (byte)1 : cv.TrangThai
                    });
                }
            }

            result.TroLyUserId = lanhDao.TroLyUserId;
            result.TenLanhDao = lanhDao.HoTen;
            return result;
        }

        public async Task<SuKienLanhDaoViewDto> TaoSuKienAsync(int lanhDaoUserId, SuKienLanhDaoInput req)
        {
            if (string.IsNullOrWhiteSpace(req.TieuDe))
                throw new ArgumentException("Tiêu đề sự kiện không được để trống.");
            if (req.KetThuc <= req.BatDau)
                throw new ArgumentException("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");

            var lanhDao = await ResolveLanhDaoAsync(lanhDaoUserId);

            const string sqlInsert = @"
                INSERT INTO dbo.SuKienLanhDao (
                    ChiNhanhId, LanhDaoId, Loai, TieuDe, BatDau, KetThuc, CaNgay, LaCung, LaRiengTu,
                    DiaDiem, GhiChu, IsActived, IsDeleted, CreatedAt, CreatedBy
                )
                OUTPUT INSERTED.Id
                VALUES (
                    @ChiNhanhId, @LanhDaoId, @Loai, @TieuDe, @BatDau, @KetThuc, @CaNgay, @LaCung, @LaRiengTu,
                    @DiaDiem, @GhiChu, 1, 0, GETDATE(), @CreatedBy
                )";

            int newId = await _dapper.ExecuteScalarAsync<int>(sqlInsert, new
            {
                lanhDao.ChiNhanhId,
                lanhDao.LanhDaoId,
                req.Loai,
                TieuDe = req.TieuDe.Trim(),
                req.BatDau,
                req.KetThuc,
                req.CaNgay,
                req.LaCung,
                req.LaRiengTu,
                DiaDiem = string.IsNullOrWhiteSpace(req.DiaDiem) ? null : req.DiaDiem.Trim(),
                GhiChu = string.IsNullOrWhiteSpace(req.GhiChu) ? null : req.GhiChu.Trim(),
                CreatedBy = lanhDaoUserId
            });

            return new SuKienLanhDaoViewDto
            {
                Id = newId,
                ChiNhanhId = lanhDao.ChiNhanhId,
                LanhDaoId = lanhDao.LanhDaoId,
                Loai = req.Loai,
                TieuDe = req.TieuDe.Trim(),
                BatDau = req.BatDau,
                KetThuc = req.KetThuc,
                CaNgay = req.CaNgay,
                LaCung = req.LaCung,
                LaRiengTu = req.LaRiengTu,
                DiaDiem = req.DiaDiem,
                GhiChu = req.GhiChu
            };
        }

        public async Task<bool> XoaSuKienAsync(int lanhDaoUserId, int suKienId)
        {
            var lanhDao = await ResolveLanhDaoAsync(lanhDaoUserId);
            const string sql = @"
                UPDATE dbo.SuKienLanhDao
                SET IsDeleted = 1, UpdatedAt = GETDATE(), UpdatedBy = @LanhDaoUserId
                WHERE Id = @Id AND LanhDaoId = @LanhDaoId AND IsDeleted = 0";

            int affected = await _dapper.ExecuteSQLAsync(sql, new
            {
                Id = suKienId,
                lanhDao.LanhDaoId,
                LanhDaoUserId = lanhDaoUserId
            });

            return affected > 0;
        }

        private async Task<LanhDaoRow> ResolveLanhDaoAsync(int lanhDaoUserId)
        {
            const string sql = @"
                SELECT TOP 1
                    ld.Id AS LanhDaoId,
                    ld.ChiNhanhId,
                    ld.UserId,
                    ISNULL(uLd.TenNguoiDung, N'') AS HoTen,
                    cv.TenChucVu,
                    cn.TenChiNhanh,
                    ld.CapDo,
                    tl.UserId AS TroLyUserId,
                    uTl.TenNguoiDung AS TenTroLy
                FROM dbo.LanhDao ld
                INNER JOIN dbo.Users uLd ON uLd.UserId = ld.UserId
                LEFT JOIN dbo.ChucVu cv ON cv.Id = uLd.ChucVuId
                LEFT JOIN dbo.ChiNhanh cn ON cn.ChiNhanhId = ld.ChiNhanhId
                LEFT JOIN dbo.TroLy tl ON tl.LanhDaoId = ld.Id AND tl.IsDeleted = 0 AND tl.IsActived = 1
                LEFT JOIN dbo.Users uTl ON uTl.UserId = tl.UserId
                WHERE ld.UserId = @UserId AND ld.IsDeleted = 0 AND ld.IsActived = 1
                ORDER BY tl.IsTroLyChinh DESC, ld.Id ASC";

            var row = (await _dapper.GetSQLAsync<LanhDaoRow>(sql, new { UserId = lanhDaoUserId })).FirstOrDefault();
            if (row == null)
                throw new UnauthorizedAccessException("Tài khoản của bạn chưa được thiết lập hồ sơ Lãnh đạo.");

            return row;
        }

        private static LanhDaoInfoDto MapInfo(LanhDaoRow row) => new()
        {
            LanhDaoId = row.LanhDaoId,
            UserId = row.UserId,
            HoTen = row.HoTen,
            TenChucVu = row.TenChucVu,
            TenChiNhanh = row.TenChiNhanh,
            CapDo = row.CapDo,
            TroLyUserId = row.TroLyUserId,
            TenTroLy = row.TenTroLy
        };

        private sealed class LanhDaoRow
        {
            public int LanhDaoId { get; set; }
            public int ChiNhanhId { get; set; }
            public int UserId { get; set; }
            public string HoTen { get; set; } = string.Empty;
            public string? TenChucVu { get; set; }
            public string? TenChiNhanh { get; set; }
            public int CapDo { get; set; }
            public int? TroLyUserId { get; set; }
            public string? TenTroLy { get; set; }
        }
    }
}
