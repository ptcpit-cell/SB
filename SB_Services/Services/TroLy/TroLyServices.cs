using SB_DAL.DapperContext;
using SB_Services.DTO;
using SB_Services.EF;
using System.Data;

namespace SB_Services.Services.TroLy
{
    public class TroLyServices(IDapperContext dapperContext) : ITroLyServices
    {
        private readonly IDapperContext _dapper = dapperContext;

        public async Task<TroLyDashboardDto> GetDashboardAsync(int troLyUserId, DateTime ngay)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            var cauHinh = await GetOrDefaultCauHinhAsync(lanhDao.LanhDaoId, lanhDao.ChiNhanhId);
            var mucUuTiens = await GetMucUuTiensAsync(lanhDao.ChiNhanhId);

            var dayStart = ngay.Date;
            var dayEnd = dayStart.AddDays(1);

            const string sqlHangCho = @"
                SELECT
                    yc.Id AS YeuCauId,
                    yc.MaYeuCau,
                    yc.TieuDe,
                    yc.TomTat,
                    ISNULL(lyc.TenLoai, N'') AS TenLoai,
                    yc.TrangThai,
                    yc.MucKhan,
                    yc.LyDoKhan,
                    yc.MucUuTienId,
                    ut.Ten AS TenMucUuTien,
                    CASE WHEN ut.Ma IS NOT NULL THEN CONCAT(N'P', ut.Ma) ELSE NULL END AS MaMucUuTien,
                    ut.MauHienThi AS MauMucUuTien,
                    ISNULL(ut.TrongSo, 0) AS TrongSoUuTien,
                    yc.ThoiLuongPhut,
                    yc.HanChot,
                    yc.LaBaoMat,
                    yc.NgayGui,
                    ISNULL(u.TenNguoiDung, N'') AS TenNguoiTrinh,
                    ISNULL(pb.TenPhongBan, N'') AS PhongBanNguoiTrinh,
                    ISNULL(cv.TenChucVu, N'') AS ChucVuNguoiTrinh,
                    (SELECT COUNT(1) FROM dbo.TepDinhKem t WHERE t.YeuCauId = yc.Id AND t.IsDeleted = 0) AS SoTep,
                    (SELECT COUNT(1) FROM dbo.YeuCauNguoiThamDu td WHERE td.YeuCauId = yc.Id AND td.IsDeleted = 0) AS SoThamDu
                FROM dbo.YeuCau yc
                INNER JOIN dbo.Users u ON u.UserId = yc.NguoiTaoId
                LEFT JOIN dbo.PhongBan pb ON pb.Id = u.PhongBanId AND pb.IsDeleted = 0
                LEFT JOIN dbo.ChucVu cv ON cv.Id = u.ChucVuId
                LEFT JOIN dbo.LoaiYeuCau lyc ON lyc.Id = yc.LoaiYeuCauId
                LEFT JOIN dbo.MucUuTien ut ON ut.Id = yc.MucUuTienId AND ut.IsDeleted = 0
                WHERE yc.LanhDaoId = @LanhDaoId
                  AND yc.IsDeleted = 0
                  AND yc.IsActived = 1
                  AND yc.TrangThai IN (1, 2, 3, 4, 10)
                ORDER BY
                    ISNULL(ut.TrongSo, 0) DESC,
                    yc.MucKhan DESC,
                    CASE WHEN yc.HanChot IS NULL THEN 1 ELSE 0 END ASC,
                    yc.HanChot ASC,
                    yc.NgayGui ASC";

            var hangCho = (await _dapper.GetSQLAsync<TroLyYeuCauItemDto>(sqlHangCho, new { lanhDao.LanhDaoId })).ToList();
            var lichNgay = await GetLichTrinhInRangeAsync(lanhDao.LanhDaoId, dayStart, dayEnd);
            var suKienNgay = await GetSuKienInRangeAsync(lanhDao.LanhDaoId, dayStart, dayEnd);

            var activeLich = lichNgay.Where(x => x.TrangThaiLich != (byte)TrangThaiLichTrinh.DaHuy).ToList();

            return new TroLyDashboardDto
            {
                Ngay = dayStart.ToString("yyyy-MM-dd"),
                LanhDao = MapLanhDaoInfo(lanhDao),
                CauHinh = cauHinh,
                MucUuTiens = mucUuTiens,
                HangCho = hangCho,
                LichNgay = lichNgay,
                SuKienNgay = suKienNgay,
                ThongKe = new TroLyThongKeDto
                {
                    ChoXuLy = hangCho.Count(x => x.TrangThai == (byte)TrangThaiYeuCau.ChoXuLy || x.TrangThai == (byte)TrangThaiYeuCau.DangXemXet),
                    Gap = hangCho.Count(x => x.MucKhan >= (byte)MucKhan.Gap),
                    LichHomNay = activeLich.Count,
                    ChoPhanHoi = hangCho.Count(x => x.TrangThai == (byte)TrangThaiYeuCau.DeXuatDoiLich || x.TrangThai == (byte)TrangThaiYeuCau.YeuCauBoSung),
                    TongPhutHomNay = activeLich.Sum(x => Math.Max(0, (int)(x.KetThuc - x.BatDau).TotalMinutes))
                }
            };
        }

        public async Task<WeekScheduleResponseDto> GetLichTuanAsync(int troLyUserId, DateTime tuNgay, DateTime denNgay)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            var cauHinh = await GetOrDefaultCauHinhAsync(lanhDao.LanhDaoId, lanhDao.ChiNhanhId);

            var start = tuNgay.Date;
            var endExclusive = denNgay.Date.AddDays(1);

            var lichTrinhs = await GetLichTrinhInRangeAsync(lanhDao.LanhDaoId, start, endExclusive);
            var suKiens = await GetSuKienInRangeAsync(lanhDao.LanhDaoId, start, endExclusive);

            return new WeekScheduleResponseDto
            {
                TuNgay = start.ToString("yyyy-MM-dd"),
                DenNgay = denNgay.Date.ToString("yyyy-MM-dd"),
                LanhDao = MapLanhDaoInfo(lanhDao),
                CauHinh = cauHinh,
                LichTrinhs = lichTrinhs,
                SuKiens = suKiens
            };
        }

        public async Task<TroLyActionResultDto> TiepNhanAsync(int troLyUserId, int yeuCauId, TiepNhanRequest req)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            var yc = await GetOwnedYeuCauAsync(yeuCauId, lanhDao.LanhDaoId);

            if (yc.TrangThai != (byte)TrangThaiYeuCau.ChoXuLy && yc.TrangThai != (byte)TrangThaiYeuCau.DangXemXet)
                throw new InvalidOperationException("Chỉ có thể tiếp nhận yêu cầu ở trạng thái Chờ xử lý hoặc Đang xem xét.");

            const string sql = @"
                UPDATE dbo.YeuCau
                SET TrangThai = @DangXemXet,
                    TroLyXuLyId = @TroLyUserId,
                    MucUuTienId = COALESCE(@MucUuTienId, MucUuTienId),
                    NgayTiepNhan = ISNULL(NgayTiepNhan, GETDATE()),
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @TroLyUserId
                WHERE Id = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0;

                INSERT INTO dbo.YeuCauLichSuTrangThai (
                    ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
                )
                VALUES (
                    @ChiNhanhId, @YeuCauId, @TuTrangThai, @DangXemXet, @TroLyUserId, N'TROLY', NULL, N'Trợ lý tiếp nhận xem xét', GETDATE()
                );

                INSERT INTO dbo.YeuCauXuLyLichSu (
                    ChiNhanhId, YeuCauId, TroLyId, HanhDong, MucUuTienCuId, MucUuTienMoiId, LyDo, CreatedAt
                )
                VALUES (
                    @ChiNhanhId, @YeuCauId, @TroLyUserId, 1, @MucUuTienCuId, COALESCE(@MucUuTienId, @MucUuTienCuId), N'Tiếp nhận yêu cầu', GETDATE()
                );";

            await _dapper.ExecuteSQLAsync(sql, new
            {
                DangXemXet = (byte)TrangThaiYeuCau.DangXemXet,
                TroLyUserId = troLyUserId,
                req.MucUuTienId,
                YeuCauId = yc.Id,
                lanhDao.LanhDaoId,
                yc.ChiNhanhId,
                TuTrangThai = yc.TrangThai,
                MucUuTienCuId = yc.MucUuTienId
            });

            return new TroLyActionResultDto
            {
                YeuCauId = yc.Id,
                MaYeuCau = yc.MaYeuCau,
                TieuDe = yc.TieuDe,
                NguoiTaoId = yc.NguoiTaoId,
                LanhDaoUserId = lanhDao.UserId,
                Message = "Đã tiếp nhận yêu cầu."
            };
        }

        public async Task<TroLyActionResultDto> CapNhatUuTienAsync(int troLyUserId, int yeuCauId, CapNhatUuTienRequest req)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            var yc = await GetOwnedYeuCauAsync(yeuCauId, lanhDao.LanhDaoId);

            const string sql = @"
                UPDATE dbo.YeuCau
                SET MucUuTienId = @MucUuTienId,
                    TroLyXuLyId = ISNULL(TroLyXuLyId, @TroLyUserId),
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @TroLyUserId
                WHERE Id = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0;

                INSERT INTO dbo.YeuCauXuLyLichSu (
                    ChiNhanhId, YeuCauId, TroLyId, HanhDong, MucUuTienCuId, MucUuTienMoiId, LyDo, CreatedAt
                )
                VALUES (
                    @ChiNhanhId, @YeuCauId, @TroLyUserId, 2, @MucUuTienCuId, @MucUuTienId, N'Cập nhật mức ưu tiên', GETDATE()
                );";

            await _dapper.ExecuteSQLAsync(sql, new
            {
                req.MucUuTienId,
                TroLyUserId = troLyUserId,
                YeuCauId = yc.Id,
                lanhDao.LanhDaoId,
                yc.ChiNhanhId,
                MucUuTienCuId = yc.MucUuTienId
            });

            return new TroLyActionResultDto
            {
                YeuCauId = yc.Id,
                MaYeuCau = yc.MaYeuCau,
                TieuDe = yc.TieuDe,
                NguoiTaoId = yc.NguoiTaoId,
                LanhDaoUserId = lanhDao.UserId,
                Message = "Đã cập nhật mức ưu tiên."
            };
        }

        public async Task<TroLyActionResultDto> XepLichAsync(int troLyUserId, int yeuCauId, XepLichRequest req)
        {
            if (req.KetThuc <= req.BatDau)
                throw new ArgumentException("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");

            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);

            // Gọi Stored Procedure giao dịch đa bảng: cho phép chồng lấn khung giờ, không dùng địa điểm (DiaDiem = NULL)
            var result = (await _dapper.GetStoreAsync<TroLyActionResultDto>(
                "dbo.usp_TroLy_XepLich",
                new
                {
                    TroLyUserId = troLyUserId,
                    LanhDaoId = lanhDao.LanhDaoId,
                    YeuCauId = yeuCauId,
                    req.BatDau,
                    req.KetThuc,
                    req.MucUuTienId,
                    req.GhiChu,
                    req.YeuCauXacNhanNV
                })).FirstOrDefault();

            if (result == null)
                throw new InvalidOperationException("Không thể xếp lịch cho yêu cầu này.");

            result.LanhDaoUserId = lanhDao.UserId;
            return result;
        }

        public async Task<TroLyActionResultDto> YeuCauBoSungAsync(int troLyUserId, int yeuCauId, YeuCauBoSungRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.NoiDung))
                throw new ArgumentException("Vui lòng nhập nội dung yêu cầu bổ sung.");

            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            var yc = await GetOwnedYeuCauAsync(yeuCauId, lanhDao.LanhDaoId);

            const string sql = @"
                UPDATE dbo.YeuCau
                SET TrangThai = @TrangThaiBoSung,
                    TroLyXuLyId = @TroLyUserId,
                    NgayTiepNhan = ISNULL(NgayTiepNhan, GETDATE()),
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @TroLyUserId
                WHERE Id = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0;

                INSERT INTO dbo.YeuCauBinhLuan (
                    ChiNhanhId, YeuCauId, UserId, NoiDung, ChiNoiBo, IsActived, IsDeleted, CreatedAt, CreatedBy
                )
                VALUES (
                    @ChiNhanhId, @YeuCauId, @TroLyUserId, @NoiDung, 0, 1, 0, GETDATE(), @TroLyUserId
                );

                INSERT INTO dbo.YeuCauLichSuTrangThai (
                    ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
                )
                VALUES (
                    @ChiNhanhId, @YeuCauId, @TuTrangThai, @TrangThaiBoSung, @TroLyUserId, N'TROLY', @NoiDung, N'Trợ lý yêu cầu bổ sung thông tin', GETDATE()
                );";

            await _dapper.ExecuteSQLAsync(sql, new
            {
                TrangThaiBoSung = (byte)TrangThaiYeuCau.YeuCauBoSung,
                TroLyUserId = troLyUserId,
                YeuCauId = yc.Id,
                lanhDao.LanhDaoId,
                yc.ChiNhanhId,
                NoiDung = req.NoiDung.Trim(),
                TuTrangThai = yc.TrangThai
            });

            return new TroLyActionResultDto
            {
                YeuCauId = yc.Id,
                MaYeuCau = yc.MaYeuCau,
                TieuDe = yc.TieuDe,
                NguoiTaoId = yc.NguoiTaoId,
                LanhDaoUserId = lanhDao.UserId,
                Message = "Đã gửi yêu cầu bổ sung cho nhân viên."
            };
        }

        public async Task<TroLyActionResultDto> TuChoiAsync(int troLyUserId, int yeuCauId, TuChoiYeuCauRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.LyDo))
                throw new ArgumentException("Vui lòng nhập lý do từ chối.");

            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            var yc = await GetOwnedYeuCauAsync(yeuCauId, lanhDao.LanhDaoId);

            const string sql = @"
                UPDATE dbo.YeuCau
                SET TrangThai = @TrangThaiTuChoi,
                    LyDoTuChoiHuy = @LyDo,
                    TroLyXuLyId = @TroLyUserId,
                    NgayHoanTat = GETDATE(),
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @TroLyUserId
                WHERE Id = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0;

                UPDATE dbo.LichTrinh
                SET TrangThai = @LichDaHuy,
                    UpdatedAt = GETDATE(),
                    UpdatedBy = @TroLyUserId
                WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND TrangThai IN (1, 4);

                INSERT INTO dbo.YeuCauLichSuTrangThai (
                    ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
                )
                VALUES (
                    @ChiNhanhId, @YeuCauId, @TuTrangThai, @TrangThaiTuChoi, @TroLyUserId, N'TROLY', @LyDo, N'Trợ lý từ chối yêu cầu', GETDATE()
                );";

            await _dapper.ExecuteSQLAsync(sql, new
            {
                TrangThaiTuChoi = (byte)TrangThaiYeuCau.TuChoi,
                LichDaHuy = (byte)TrangThaiLichTrinh.DaHuy,
                LyDo = req.LyDo.Trim(),
                TroLyUserId = troLyUserId,
                YeuCauId = yc.Id,
                lanhDao.LanhDaoId,
                yc.ChiNhanhId,
                TuTrangThai = yc.TrangThai
            });

            return new TroLyActionResultDto
            {
                YeuCauId = yc.Id,
                MaYeuCau = yc.MaYeuCau,
                TieuDe = yc.TieuDe,
                NguoiTaoId = yc.NguoiTaoId,
                LanhDaoUserId = lanhDao.UserId,
                Message = "Đã từ chối yêu cầu."
            };
        }

        public async Task<TroLyActionResultDto> CapNhatTrangThaiLichAsync(int troLyUserId, int lichTrinhId, CapNhatTrangThaiLichRequest req)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);

            var result = (await _dapper.GetStoreAsync<TroLyActionResultDto>(
                "dbo.usp_TroLy_CapNhatTrangThaiLich",
                new
                {
                    TroLyUserId = troLyUserId,
                    LanhDaoId = lanhDao.LanhDaoId,
                    LichTrinhId = lichTrinhId,
                    req.TrangThaiYeuCau,
                    req.LyDo
                })).FirstOrDefault();

            if (result == null)
                throw new KeyNotFoundException("Không tìm thấy lịch trình thuộc lãnh đạo bạn phụ trách.");

            result.LanhDaoUserId = lanhDao.UserId;
            return result;
        }

        public async Task<LanhDaoCauHinhDto> CapNhatCauHinhLanhDaoAsync(int troLyUserId, LanhDaoCauHinhDto req)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);

            if (!TimeSpan.TryParse(req.GioBatDau, out var gioBatDau))
                throw new ArgumentException("Giờ bắt đầu làm việc không hợp lệ.");
            if (!TimeSpan.TryParse(req.GioKetThuc, out var gioKetThuc))
                throw new ArgumentException("Giờ kết thúc làm việc không hợp lệ.");
            if (gioKetThuc <= gioBatDau)
                throw new ArgumentException("Giờ kết thúc phải lớn hơn giờ bắt đầu.");

            TimeSpan? nghiTruaTu = null;
            if (!string.IsNullOrWhiteSpace(req.NghiTruaTu) && TimeSpan.TryParse(req.NghiTruaTu, out var ntTu))
                nghiTruaTu = ntTu;

            TimeSpan? nghiTruaDen = null;
            if (!string.IsNullOrWhiteSpace(req.NghiTruaDen) && TimeSpan.TryParse(req.NghiTruaDen, out var ntDen))
                nghiTruaDen = ntDen;

            const string sqlUpsert = @"
                IF EXISTS (SELECT 1 FROM dbo.LanhDaoCauHinh WHERE LanhDaoId = @LanhDaoId AND IsDeleted = 0)
                BEGIN
                    UPDATE dbo.LanhDaoCauHinh
                    SET GioBatDau = @GioBatDau,
                        GioKetThuc = @GioKetThuc,
                        NghiTruaTu = @NghiTruaTu,
                        NghiTruaDen = @NghiTruaDen,
                        ThoiGianDemPhut = @ThoiGianDemPhut,
                        GioiHanPhutMoiNgay = @GioiHanPhutMoiNgay,
                        SoNgayLamViecMask = @SoNgayLamViecMask,
                        ChoNhanVienXemLichTrongBan = @ChoNhanVienXemLichTrongBan,
                        IsActived = 1
                    WHERE LanhDaoId = @LanhDaoId AND IsDeleted = 0;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.LanhDaoCauHinh (
                        ChiNhanhId, LanhDaoId, GioBatDau, GioKetThuc, NghiTruaTu, NghiTruaDen,
                        ThoiGianDemPhut, GioiHanPhutMoiNgay, SoNgayLamViecMask, ChoNhanVienXemLichTrongBan,
                        IsActived, IsDeleted
                    )
                    VALUES (
                        @ChiNhanhId, @LanhDaoId, @GioBatDau, @GioKetThuc, @NghiTruaTu, @NghiTruaDen,
                        @ThoiGianDemPhut, @GioiHanPhutMoiNgay, @SoNgayLamViecMask, @ChoNhanVienXemLichTrongBan,
                        1, 0
                    );
                END";

            await _dapper.ExecuteSQLAsync(sqlUpsert, new
            {
                lanhDao.ChiNhanhId,
                lanhDao.LanhDaoId,
                GioBatDau = gioBatDau,
                GioKetThuc = gioKetThuc,
                NghiTruaTu = nghiTruaTu,
                NghiTruaDen = nghiTruaDen,
                ThoiGianDemPhut = Math.Max(0, req.ThoiGianDemPhut),
                GioiHanPhutMoiNgay = Math.Max(30, req.GioiHanPhutMoiNgay),
                SoNgayLamViecMask = req.SoNgayLamViecMask > 0 ? req.SoNgayLamViecMask : 62,
                req.ChoNhanVienXemLichTrongBan
            });

            return await GetOrDefaultCauHinhAsync(lanhDao.LanhDaoId, lanhDao.ChiNhanhId);
        }

        public async Task<SuKienLanhDaoViewDto> TaoSuKienLanhDaoAsync(int troLyUserId, SuKienLanhDaoInput req)
        {
            if (string.IsNullOrWhiteSpace(req.TieuDe))
                throw new ArgumentException("Tiêu đề sự kiện không được để trống.");
            if (req.KetThuc <= req.BatDau)
                throw new ArgumentException("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");

            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);

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
                CreatedBy = troLyUserId
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
                GhiChu = req.GhiChu,
                NotifyTargetUserId = lanhDao.UserId,
                NotifyActorName = lanhDao.TenTroLy
            };
        }

        public async Task<bool> XoaSuKienLanhDaoAsync(int troLyUserId, int suKienId)
        {
            var lanhDao = await ResolveAssignedLanhDaoAsync(troLyUserId);
            const string sql = @"
                UPDATE dbo.SuKienLanhDao
                SET IsDeleted = 1, UpdatedAt = GETDATE(), UpdatedBy = @TroLyUserId
                WHERE Id = @Id AND LanhDaoId = @LanhDaoId AND IsDeleted = 0";

            int affected = await _dapper.ExecuteSQLAsync(sql, new
            {
                Id = suKienId,
                lanhDao.LanhDaoId,
                TroLyUserId = troLyUserId
            });

            return affected > 0;
        }

        // =====================================================================
        // Helper Queries (dùng nội bộ, toàn bộ SQL có tham số hóa)
        // =====================================================================
        private async Task<AssignedLanhDaoRow> ResolveAssignedLanhDaoAsync(int troLyUserId)
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
                FROM dbo.TroLy tl
                INNER JOIN dbo.LanhDao ld ON ld.Id = tl.LanhDaoId AND ld.IsDeleted = 0 AND ld.IsActived = 1
                INNER JOIN dbo.Users uLd ON uLd.UserId = ld.UserId
                LEFT JOIN dbo.Users uTl ON uTl.UserId = tl.UserId
                LEFT JOIN dbo.ChucVu cv ON cv.Id = uLd.ChucVuId
                LEFT JOIN dbo.ChiNhanh cn ON cn.ChiNhanhId = ld.ChiNhanhId
                WHERE tl.UserId = @TroLyUserId AND tl.IsDeleted = 0 AND tl.IsActived = 1
                ORDER BY tl.IsTroLyChinh DESC, tl.Id ASC";

            var row = (await _dapper.GetSQLAsync<AssignedLanhDaoRow>(sql, new { TroLyUserId = troLyUserId })).FirstOrDefault();
            if (row == null)
                throw new UnauthorizedAccessException("Tài khoản của bạn chưa được phân công làm trợ lý cho lãnh đạo nào.");

            return row;
        }

        private async Task<OwnedYeuCauRow> GetOwnedYeuCauAsync(int yeuCauId, int lanhDaoId)
        {
            const string sql = @"
                SELECT Id, ChiNhanhId, MaYeuCau, TieuDe, NguoiTaoId, TrangThai, MucUuTienId
                FROM dbo.YeuCau
                WHERE Id = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0";

            var yc = (await _dapper.GetSQLAsync<OwnedYeuCauRow>(sql, new { YeuCauId = yeuCauId, LanhDaoId = lanhDaoId })).FirstOrDefault();
            if (yc == null)
                throw new KeyNotFoundException("Không tìm thấy yêu cầu thuộc phạm vi lãnh đạo bạn phụ trách.");

            return yc;
        }

        internal async Task<LanhDaoCauHinhDto> GetOrDefaultCauHinhAsync(int lanhDaoId, int chiNhanhId)
        {
            const string sql = @"
                SELECT TOP 1
                    ch.Id,
                    ch.ChiNhanhId,
                    ch.LanhDaoId,
                    CONVERT(VARCHAR(8), ch.GioBatDau, 108) AS GioBatDau,
                    CONVERT(VARCHAR(8), ch.GioKetThuc, 108) AS GioKetThuc,
                    CASE WHEN ch.NghiTruaTu IS NOT NULL THEN CONVERT(VARCHAR(8), ch.NghiTruaTu, 108) ELSE NULL END AS NghiTruaTu,
                    CASE WHEN ch.NghiTruaDen IS NOT NULL THEN CONVERT(VARCHAR(8), ch.NghiTruaDen, 108) ELSE NULL END AS NghiTruaDen,
                    ch.ThoiGianDemPhut,
                    ch.GioiHanPhutMoiNgay,
                    ch.SoNgayLamViecMask,
                    ch.ChoNhanVienXemLichTrongBan
                FROM dbo.LanhDaoCauHinh ch
                WHERE ch.LanhDaoId = @LanhDaoId AND ch.IsDeleted = 0 AND ch.IsActived = 1
                ORDER BY ch.Id DESC";

            var cfg = (await _dapper.GetSQLAsync<LanhDaoCauHinhDto>(sql, new { LanhDaoId = lanhDaoId })).FirstOrDefault();
            return cfg ?? new LanhDaoCauHinhDto
            {
                ChiNhanhId = chiNhanhId,
                LanhDaoId = lanhDaoId
            };
        }

        private async Task<List<MucUuTienItemDto>> GetMucUuTiensAsync(int chiNhanhId)
        {
            const string sql = @"
                SELECT
                    m.Id,
                    CONCAT(N'P', m.Ma) AS Code,
                    m.Ten,
                    m.TrongSo,
                    ISNULL(m.MauHienThi, N'#2563eb') AS MauHienThi
                FROM dbo.MucUuTien m
                WHERE m.IsDeleted = 0 AND m.IsActived = 1
                  AND (m.ChiNhanhId IN (SELECT ChiNhanhId FROM dbo.fn_ChiNhanhVaCha(@ChiNhanhId)) OR m.ChiNhanhId IS NULL)
                ORDER BY m.TrongSo DESC, m.Ma ASC";

            return (await _dapper.GetSQLAsync<MucUuTienItemDto>(sql, new { ChiNhanhId = chiNhanhId })).ToList();
        }

        internal async Task<List<LichTrinhViewDto>> GetLichTrinhInRangeAsync(int lanhDaoId, DateTime start, DateTime endExclusive)
        {
            const string sql = @"
                SELECT
                    lt.Id AS LichTrinhId,
                    yc.Id AS YeuCauId,
                    yc.MaYeuCau,
                    yc.TieuDe,
                    yc.TomTat,
                    ISNULL(lyc.TenLoai, N'') AS TenLoai,
                    yc.MucKhan,
                    yc.LyDoKhan,
                    yc.MucUuTienId,
                    ut.Ten AS TenMucUuTien,
                    CASE WHEN ut.Ma IS NOT NULL THEN CONCAT(N'P', ut.Ma) ELSE NULL END AS MaMucUuTien,
                    ut.MauHienThi AS MauMucUuTien,
                    yc.LaBaoMat,
                    yc.ThoiLuongPhut,
                    yc.HanChot,
                    yc.TrangThai AS TrangThaiYeuCau,
                    lt.TrangThai AS TrangThaiLich,
                    lt.BatDau,
                    lt.KetThuc,
                    CAST(NULL AS NVARCHAR(500)) AS DiaDiem,
                    lt.DaGhiDeXungDot,
                    lt.LyDoGhiDe,
                    yc.NguoiTaoId AS NguoiTrinhId,
                    ISNULL(u.TenNguoiDung, N'') AS TenNguoiTrinh,
                    ISNULL(pb.TenPhongBan, N'') AS PhongBanNguoiTrinh,
                    ISNULL(cv.TenChucVu, N'') AS ChucVuNguoiTrinh,
                    ISNULL(cn.TenChiNhanh, N'') AS ChiNhanhNguoiTrinh,
                    lt.GhiChuLanhDao
                FROM dbo.LichTrinh lt
                INNER JOIN dbo.YeuCau yc ON yc.Id = lt.YeuCauId AND yc.IsDeleted = 0
                INNER JOIN dbo.Users u ON u.UserId = yc.NguoiTaoId
                LEFT JOIN dbo.PhongBan pb ON pb.Id = u.PhongBanId AND pb.IsDeleted = 0
                LEFT JOIN dbo.ChucVu cv ON cv.Id = u.ChucVuId
                LEFT JOIN dbo.ChiNhanh cn ON cn.ChiNhanhId = yc.ChiNhanhNguoiTaoId
                LEFT JOIN dbo.LoaiYeuCau lyc ON lyc.Id = yc.LoaiYeuCauId
                LEFT JOIN dbo.MucUuTien ut ON ut.Id = yc.MucUuTienId AND ut.IsDeleted = 0
                WHERE lt.LanhDaoId = @LanhDaoId
                  AND lt.IsDeleted = 0
                  AND lt.IsActived = 1
                  AND lt.TrangThai <> 3
                  AND lt.BatDau < @EndExclusive
                  AND lt.KetThuc > @Start
                ORDER BY lt.BatDau ASC, lt.Id ASC";

            var items = (await _dapper.GetSQLAsync<LichTrinhViewDto>(sql, new
            {
                LanhDaoId = lanhDaoId,
                Start = start,
                EndExclusive = endExclusive
            })).ToList();

            if (items.Count == 0) return items;

            var yeuCauIds = items.Select(x => x.YeuCauId).Distinct().ToList();
            var lichTrinhIds = items.Select(x => x.LichTrinhId).Distinct().ToList();

            const string sqlThamDu = @"
                SELECT td.Id, td.YeuCauId, td.UserId,
                       ISNULL(u.TenNguoiDung, ISNULL(td.HoTenNgoai, N'')) AS HoTen,
                       td.DonViNgoai, td.VaiTro
                FROM dbo.YeuCauNguoiThamDu td
                LEFT JOIN dbo.Users u ON u.UserId = td.UserId
                WHERE td.YeuCauId IN @YeuCauIds AND td.IsDeleted = 0";

            const string sqlTep = @"
                SELECT Id, YeuCauId, TenFile, DuongDan, ContentType, KichThuoc
                FROM dbo.TepDinhKem
                WHERE YeuCauId IN @YeuCauIds AND IsDeleted = 0";

            const string sqlKetQua = @"
                SELECT Id, LichTrinhId, KetQua, ThoiGianThucTe, ChiDaoCuaLanhDao, GhiChu, CreatedAt
                FROM dbo.KetQuaTrinh
                WHERE LichTrinhId IN @LichTrinhIds AND IsDeleted = 0
                ORDER BY Id DESC";

            var thamDus = (await _dapper.GetSQLAsync<LichTrinhNguoiThamDuDto>(sqlThamDu, new { YeuCauIds = yeuCauIds }))
                .GroupBy(x => x.YeuCauId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var teps = (await _dapper.GetSQLAsync<LichTrinhTepDto>(sqlTep, new { YeuCauIds = yeuCauIds }))
                .GroupBy(x => x.YeuCauId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var ketQuas = (await _dapper.GetSQLAsync<LichTrinhKetQuaDto>(sqlKetQua, new { LichTrinhIds = lichTrinhIds }))
                .GroupBy(x => x.LichTrinhId)
                .ToDictionary(g => g.Key, g => g.First());

            var ketQuaIds = ketQuas.Values.Select(k => k.Id).Distinct().ToList();
            Dictionary<int, List<LichTrinhCongViecDto>> congViecsByKq = new();
            if (ketQuaIds.Count > 0)
            {
                const string sqlCv = @"
                    SELECT Id, KetQuaTrinhId, NoiDung, NguoiPhuTrachId, HanXuLy, TrangThai
                    FROM dbo.CongViecSauTrinh
                    WHERE KetQuaTrinhId IN @KetQuaIds AND IsDeleted = 0
                    ORDER BY Id ASC";

                congViecsByKq = (await _dapper.GetSQLAsync<LichTrinhCongViecDto>(sqlCv, new { KetQuaIds = ketQuaIds }))
                    .GroupBy(x => x.KetQuaTrinhId)
                    .ToDictionary(g => g.Key, g => g.ToList());
            }

            foreach (var item in items)
            {
                if (thamDus.TryGetValue(item.YeuCauId, out var tdList)) item.NguoiThamDus = tdList;
                if (teps.TryGetValue(item.YeuCauId, out var tepList)) item.Teps = tepList;
                if (ketQuas.TryGetValue(item.LichTrinhId, out var kq))
                {
                    item.KetQua = kq;
                    if (congViecsByKq.TryGetValue(kq.Id, out var cvList)) item.CongViecs = cvList;
                }
            }

            return items;
        }

        internal async Task<List<SuKienLanhDaoViewDto>> GetSuKienInRangeAsync(int lanhDaoId, DateTime start, DateTime endExclusive)
        {
            const string sql = @"
                SELECT Id, ChiNhanhId, LanhDaoId, Loai, TieuDe, BatDau, KetThuc, CaNgay, LaCung, LaRiengTu, DiaDiem, GhiChu
                FROM dbo.SuKienLanhDao
                WHERE LanhDaoId = @LanhDaoId
                  AND IsDeleted = 0
                  AND IsActived = 1
                  AND BatDau < @EndExclusive
                  AND KetThuc > @Start
                ORDER BY BatDau ASC, Id ASC";

            return (await _dapper.GetSQLAsync<SuKienLanhDaoViewDto>(sql, new
            {
                LanhDaoId = lanhDaoId,
                Start = start,
                EndExclusive = endExclusive
            })).ToList();
        }

        private static LanhDaoInfoDto MapLanhDaoInfo(AssignedLanhDaoRow row) => new()
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

        private sealed class AssignedLanhDaoRow
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

        private sealed class OwnedYeuCauRow
        {
            public int Id { get; set; }
            public int ChiNhanhId { get; set; }
            public string MaYeuCau { get; set; } = string.Empty;
            public string TieuDe { get; set; } = string.Empty;
            public int NguoiTaoId { get; set; }
            public byte TrangThai { get; set; }
            public int? MucUuTienId { get; set; }
        }
    }
}
