-- ============================================================================
-- SB_Server Extended Stored Procedures & Safe Schema Adjustments
-- Tuân thủ tên bảng và tên cột trong data.sql (SQL Server)
-- Chạy script này một lần trên database SB để đồng bộ các SP cho:
--   - TroLyServices  (usp_TroLy_XepLich, usp_TroLy_CapNhatTrangThaiLich)
--   - LanhDaoServices (usp_LanhDao_CapNhatPhanHoi)
--   - AdminServices  (usp_Admin_SaveLanhDao)
--   - ReportServices (usp_Report_BaoCaoYeuCau)
-- ============================================================================

-- 1. Mở rộng độ dài cột ThongBao.NoiDung (50 -> 500) để không bị cắt nội dung tiếng Việt
IF EXISTS (
    SELECT 1
    FROM sys.columns c
    INNER JOIN sys.objects o ON o.object_id = c.object_id
    WHERE o.name = 'ThongBao' AND c.name = 'NoiDung' AND c.max_length < 1000
)
BEGIN
    ALTER TABLE dbo.ThongBao ALTER COLUMN NoiDung NVARCHAR(500) NULL;
END
GO

-- ============================================================================
-- 2. SP: Trợ lý xếp lịch / dời lịch / đề xuất lịch (cho phép chồng lấn, DiaDiem = NULL)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_TroLy_XepLich
    @TroLyUserId     INT,
    @LanhDaoId       INT,
    @YeuCauId        INT,
    @BatDau          DATETIME2(7),
    @KetThuc         DATETIME2(7),
    @MucUuTienId     INT = NULL,
    @GhiChu          NVARCHAR(500) = NULL,
    @YeuCauXacNhanNV BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @KetThuc <= @BatDau
        THROW 50001, N'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.', 1;

    DECLARE
        @ChiNhanhId     INT,
        @MaYeuCau       NVARCHAR(30),
        @TieuDe         NVARCHAR(500),
        @NguoiTaoId     INT,
        @TrangThaiCu    TINYINT,
        @MucUuTienCuId  INT;

    SELECT
        @ChiNhanhId    = ChiNhanhId,
        @MaYeuCau      = MaYeuCau,
        @TieuDe        = TieuDe,
        @NguoiTaoId    = NguoiTaoId,
        @TrangThaiCu   = TrangThai,
        @MucUuTienCuId = MucUuTienId
    FROM dbo.YeuCau
    WHERE Id = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0;

    IF @MaYeuCau IS NULL
        THROW 50002, N'Không tìm thấy yêu cầu thuộc lãnh đạo bạn phụ trách.', 1;

    BEGIN TRAN;

    -- Kiểm tra chồng lấn khung giờ (chỉ để đánh dấu cảnh báo, KHÔNG chặn xếp lịch)
    DECLARE @CoXungDot BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.LichTrinh
        WHERE LanhDaoId = @LanhDaoId AND IsDeleted = 0 AND TrangThai IN (1, 2)
          AND YeuCauId <> @YeuCauId
          AND BatDau < @KetThuc AND KetThuc > @BatDau
    )
    OR EXISTS (
        SELECT 1 FROM dbo.SuKienLanhDao
        WHERE LanhDaoId = @LanhDaoId AND IsDeleted = 0 AND IsActived = 1
          AND BatDau < @KetThuc AND KetThuc > @BatDau
    )
    BEGIN
        SET @CoXungDot = 1;
    END

    DECLARE @LichTrinhId INT = NULL;
    DECLARE @LaCapNhat BIT = 0;
    DECLARE @TrangThaiMoi TINYINT;
    DECLARE @Message NVARCHAR(200);

    IF @YeuCauXacNhanNV = 1
    BEGIN
        SET @TrangThaiMoi = 3; -- DeXuatDoiLich

        DECLARE @NextOrder INT = ISNULL((
            SELECT MAX(ThuTuUuTien) FROM dbo.YeuCauThoiGianDeXuat
            WHERE YeuCauId = @YeuCauId AND IsDeleted = 0
        ), 0) + 1;

        INSERT INTO dbo.YeuCauThoiGianDeXuat (
            ChiNhanhId, YeuCauId, BatDau, KetThuc, ThuTuUuTien, NguonDeXuat,
            NhanVienDongY, NgayPhanHoi, GhiChu, IsActived, IsDeleted, CreatedAt, CreatedBy
        )
        VALUES (
            @ChiNhanhId, @YeuCauId, CAST(@BatDau AS DATETIME), CAST(@KetThuc AS DATETIME),
            @NextOrder, 2, NULL, NULL, @GhiChu, 1, 0, GETDATE(), @TroLyUserId
        );

        UPDATE dbo.YeuCau
        SET TrangThai = @TrangThaiMoi,
            TroLyXuLyId = @TroLyUserId,
            MucUuTienId = COALESCE(@MucUuTienId, MucUuTienId),
            NgayTiepNhan = ISNULL(NgayTiepNhan, GETDATE()),
            UpdatedAt = GETDATE(),
            UpdatedBy = @TroLyUserId
        WHERE Id = @YeuCauId;

        SET @Message = N'Đã gửi đề xuất khung giờ cho nhân viên xác nhận.';
    END
    ELSE
    BEGIN
        SET @TrangThaiMoi = 5; -- DaDuyet

        DECLARE @ExistingBatDau DATETIME2(7), @ExistingKetThuc DATETIME2(7);
        SELECT TOP 1
            @LichTrinhId = Id,
            @ExistingBatDau = BatDau,
            @ExistingKetThuc = KetThuc
        FROM dbo.LichTrinh
        WHERE YeuCauId = @YeuCauId AND LanhDaoId = @LanhDaoId AND IsDeleted = 0 AND TrangThai <> 3
        ORDER BY Id DESC;

        IF @LichTrinhId IS NOT NULL
        BEGIN
            SET @LaCapNhat = 1;
            UPDATE dbo.LichTrinh
            SET BatDau = @BatDau,
                KetThuc = @KetThuc,
                DiaDiem = NULL,
                TrangThai = 1,
                NguoiChotId = @TroLyUserId,
                NgayChot = GETDATE(),
                DaGhiDeXungDot = @CoXungDot,
                LyDoGhiDe = CASE WHEN @CoXungDot = 1 THEN COALESCE(@GhiChu, N'Cho phép xếp chồng khung giờ') ELSE NULL END,
                UpdatedAt = GETDATE(),
                UpdatedBy = @TroLyUserId
            WHERE Id = @LichTrinhId;

            INSERT INTO dbo.LichTrinhLichSu (
                ChiNhanhId, LichTrinhId, YeuCauId, LanhDaoId, HanhDong,
                BatDauCu, KetThucCu, BatDauMoi, KetThucMoi, LyDo, NguoiThucHienId, CreatedAt
            )
            VALUES (
                @ChiNhanhId, @LichTrinhId, @YeuCauId, @LanhDaoId, 2,
                CAST(@ExistingBatDau AS DATETIME), CAST(@ExistingKetThuc AS DATETIME),
                CAST(@BatDau AS DATETIME), CAST(@KetThuc AS DATETIME),
                COALESCE(@GhiChu, N'Trợ lý điều chỉnh lịch trình'), @TroLyUserId, GETDATE()
            );

            SET @Message = N'Đã cập nhật thời gian lịch trình thành công.';
        END
        ELSE
        BEGIN
            INSERT INTO dbo.LichTrinh (
                ChiNhanhId, YeuCauId, LanhDaoId, BatDau, KetThuc, DiaDiem,
                TrangThai, ThuTuTrongNgay, NguoiChotId, NgayChot,
                DaGhiDeXungDot, LyDoGhiDe, GhiChuLanhDao,
                IsActived, IsDeleted, CreatedAt, CreatedBy
            )
            VALUES (
                @ChiNhanhId, @YeuCauId, @LanhDaoId, @BatDau, @KetThuc, NULL,
                1, NULL, @TroLyUserId, GETDATE(),
                @CoXungDot, CASE WHEN @CoXungDot = 1 THEN COALESCE(@GhiChu, N'Cho phép xếp chồng khung giờ') ELSE NULL END, NULL,
                1, 0, GETDATE(), @TroLyUserId
            );

            SET @LichTrinhId = SCOPE_IDENTITY();

            INSERT INTO dbo.LichTrinhLichSu (
                ChiNhanhId, LichTrinhId, YeuCauId, LanhDaoId, HanhDong,
                BatDauCu, KetThucCu, BatDauMoi, KetThucMoi, LyDo, NguoiThucHienId, CreatedAt
            )
            VALUES (
                @ChiNhanhId, @LichTrinhId, @YeuCauId, @LanhDaoId, 1,
                NULL, NULL, CAST(@BatDau AS DATETIME), CAST(@KetThuc AS DATETIME),
                COALESCE(@GhiChu, N'Trợ lý xếp lịch trình'), @TroLyUserId, GETDATE()
            );

            SET @Message = N'Đã duyệt và xếp lịch trình thành công.';
        END

        UPDATE dbo.YeuCau
        SET TrangThai = @TrangThaiMoi,
            TroLyXuLyId = @TroLyUserId,
            MucUuTienId = COALESCE(@MucUuTienId, MucUuTienId),
            NgayTiepNhan = ISNULL(NgayTiepNhan, GETDATE()),
            UpdatedAt = GETDATE(),
            UpdatedBy = @TroLyUserId
        WHERE Id = @YeuCauId;
    END

    INSERT INTO dbo.YeuCauLichSuTrangThai (
        ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @YeuCauId, @TrangThaiCu, @TrangThaiMoi, @TroLyUserId, N'TroLy', @GhiChu, @Message, GETDATE()
    );

    INSERT INTO dbo.YeuCauXuLyLichSu (
        ChiNhanhId, YeuCauId, TroLyId, HanhDong, MucUuTienCuId, MucUuTienMoiId, LyDo, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @YeuCauId, @TroLyUserId, 3, @MucUuTienCuId, COALESCE(@MucUuTienId, @MucUuTienCuId), @Message, GETDATE()
    );

    COMMIT TRAN;

    SELECT
        @YeuCauId    AS YeuCauId,
        @LichTrinhId AS LichTrinhId,
        @MaYeuCau    AS MaYeuCau,
        @TieuDe      AS TieuDe,
        @NguoiTaoId  AS NguoiTaoId,
        0            AS LanhDaoUserId,
        @CoXungDot   AS CoXungDot,
        @LaCapNhat   AS LaCapNhat,
        @Message     AS Message;
END
GO

-- ============================================================================
-- 3. SP: Trợ lý cập nhật trạng thái buổi trình (Hoàn thành / Hoãn / Vắng / Hủy)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_TroLy_CapNhatTrangThaiLich
    @TroLyUserId     INT,
    @LanhDaoId       INT,
    @LichTrinhId     INT,
    @TrangThaiYeuCau TINYINT,
    @LyDo            NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @ChiNhanhId   INT,
        @YeuCauId     INT,
        @MaYeuCau     NVARCHAR(30),
        @TieuDe       NVARCHAR(500),
        @NguoiTaoId   INT,
        @TrangThaiCu  TINYINT,
        @BatDau       DATETIME2(7),
        @KetThuc      DATETIME2(7);

    SELECT
        @ChiNhanhId  = yc.ChiNhanhId,
        @YeuCauId    = yc.Id,
        @MaYeuCau    = yc.MaYeuCau,
        @TieuDe      = yc.TieuDe,
        @NguoiTaoId  = yc.NguoiTaoId,
        @TrangThaiCu = yc.TrangThai,
        @BatDau      = lt.BatDau,
        @KetThuc     = lt.KetThuc
    FROM dbo.LichTrinh lt
    INNER JOIN dbo.YeuCau yc ON yc.Id = lt.YeuCauId AND yc.IsDeleted = 0
    WHERE lt.Id = @LichTrinhId AND lt.LanhDaoId = @LanhDaoId AND lt.IsDeleted = 0;

    IF @YeuCauId IS NULL
        RETURN;

    DECLARE @TrangThaiLich TINYINT = CASE @TrangThaiYeuCau
        WHEN 6  THEN 2 -- DaTrinh
        WHEN 7  THEN 2 -- DaTrinh (Yêu cầu Hoàn thành)
        WHEN 9  THEN 3 -- DaHuy
        WHEN 10 THEN 4 -- Hoan
        WHEN 11 THEN 5 -- Vang
        ELSE 1
    END;

    DECLARE @HanhDong TINYINT = CASE @TrangThaiYeuCau
        WHEN 6  THEN 5 -- HoanThanh
        WHEN 7  THEN 5 -- HoanThanh
        WHEN 9  THEN 3 -- Huy
        WHEN 10 THEN 4 -- Hoan
        WHEN 11 THEN 6 -- Vang
        ELSE 2
    END;

    BEGIN TRAN;

    UPDATE dbo.LichTrinh
    SET TrangThai = @TrangThaiLich,
        UpdatedAt = GETDATE(),
        UpdatedBy = @TroLyUserId
    WHERE Id = @LichTrinhId;

    UPDATE dbo.YeuCau
    SET TrangThai = @TrangThaiYeuCau,
        LyDoTuChoiHuy = CASE WHEN @TrangThaiYeuCau IN (9, 10, 11) THEN COALESCE(@LyDo, LyDoTuChoiHuy) ELSE LyDoTuChoiHuy END,
        NgayHoanTat = CASE WHEN @TrangThaiYeuCau IN (7, 9) THEN GETDATE() ELSE NgayHoanTat END,
        UpdatedAt = GETDATE(),
        UpdatedBy = @TroLyUserId
    WHERE Id = @YeuCauId;

    INSERT INTO dbo.LichTrinhLichSu (
        ChiNhanhId, LichTrinhId, YeuCauId, LanhDaoId, HanhDong,
        BatDauCu, KetThucCu, BatDauMoi, KetThucMoi, LyDo, NguoiThucHienId, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @LichTrinhId, @YeuCauId, @LanhDaoId, @HanhDong,
        CAST(@BatDau AS DATETIME), CAST(@KetThuc AS DATETIME),
        CAST(@BatDau AS DATETIME), CAST(@KetThuc AS DATETIME),
        @LyDo, @TroLyUserId, GETDATE()
    );

    INSERT INTO dbo.YeuCauLichSuTrangThai (
        ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @YeuCauId, @TrangThaiCu, @TrangThaiYeuCau, @TroLyUserId, N'TroLy', @LyDo, N'Cập nhật trạng thái buổi trình', GETDATE()
    );

    COMMIT TRAN;

    SELECT
        @YeuCauId    AS YeuCauId,
        @LichTrinhId AS LichTrinhId,
        @MaYeuCau    AS MaYeuCau,
        @TieuDe      AS TieuDe,
        @NguoiTaoId  AS NguoiTaoId,
        0            AS LanhDaoUserId,
        CAST(0 AS BIT) AS CoXungDot,
        CAST(1 AS BIT) AS LaCapNhat,
        N'Đã cập nhật trạng thái lịch trình thành công.' AS Message;
END
GO

-- ============================================================================
-- 4. SP: Lãnh đạo cập nhật phản hồi sau trình & ghi chú cho trợ lý
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_LanhDao_CapNhatPhanHoi
    @LanhDaoId       INT,
    @LanhDaoUserId   INT,
    @LichTrinhId     INT,
    @KetQua          TINYINT, -- 1 = Đã trình, 2 = Vắng, 3 = Hoãn
    @HoanThanh       BIT = 0,
    @ChiDaoCuaLanhDao NVARCHAR(MAX) = NULL,
    @GhiChuLanhDao   NVARCHAR(MAX) = NULL,
    @GhiChu          NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @ChiNhanhId   INT,
        @YeuCauId     INT,
        @MaYeuCau     NVARCHAR(30),
        @TieuDe       NVARCHAR(500),
        @NguoiTaoId   INT,
        @TrangThaiCu  TINYINT;

    SELECT
        @ChiNhanhId  = yc.ChiNhanhId,
        @YeuCauId    = yc.Id,
        @MaYeuCau    = yc.MaYeuCau,
        @TieuDe      = yc.TieuDe,
        @NguoiTaoId  = yc.NguoiTaoId,
        @TrangThaiCu = yc.TrangThai
    FROM dbo.LichTrinh lt
    INNER JOIN dbo.YeuCau yc ON yc.Id = lt.YeuCauId AND yc.IsDeleted = 0
    WHERE lt.Id = @LichTrinhId AND lt.LanhDaoId = @LanhDaoId AND lt.IsDeleted = 0;

    IF @YeuCauId IS NULL
        RETURN;

    DECLARE @TrangThaiLich TINYINT = CASE @KetQua
        WHEN 1 THEN 2 -- DaTrinh
        WHEN 2 THEN 5 -- Vang
        WHEN 3 THEN 4 -- Hoan
        ELSE 2
    END;

    DECLARE @TrangThaiYeuCau TINYINT = CASE
        WHEN @KetQua = 1 AND @HoanThanh = 1 THEN 7 -- HoanThanh
        WHEN @KetQua = 1 THEN 6                    -- DaTrinh
        WHEN @KetQua = 2 THEN 11                   -- Vang
        WHEN @KetQua = 3 THEN 10                   -- Hoan
        ELSE 6
    END;

    BEGIN TRAN;

    DECLARE @KetQuaTrinhId INT = NULL;
    SELECT TOP 1 @KetQuaTrinhId = Id
    FROM dbo.KetQuaTrinh
    WHERE LichTrinhId = @LichTrinhId AND IsDeleted = 0
    ORDER BY Id DESC;

    IF @KetQuaTrinhId IS NOT NULL
    BEGIN
        UPDATE dbo.KetQuaTrinh
        SET KetQua = @KetQua,
            ThoiGianThucTe = ISNULL(ThoiGianThucTe, GETDATE()),
            ChiDaoCuaLanhDao = @ChiDaoCuaLanhDao,
            GhiChu = @GhiChu,
            NguoiGhiNhanId = @LanhDaoUserId
        WHERE Id = @KetQuaTrinhId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.KetQuaTrinh (
            ChiNhanhId, LichTrinhId, YeuCauId, KetQua, ThoiGianThucTe,
            ChiDaoCuaLanhDao, GhiChu, NguoiGhiNhanId, CreatedAt, IsActived, IsDeleted
        )
        VALUES (
            @ChiNhanhId, @LichTrinhId, @YeuCauId, @KetQua, GETDATE(),
            @ChiDaoCuaLanhDao, @GhiChu, @LanhDaoUserId, GETDATE(), 1, 0
        );
        SET @KetQuaTrinhId = SCOPE_IDENTITY();
    END

    UPDATE dbo.LichTrinh
    SET TrangThai = @TrangThaiLich,
        GhiChuLanhDao = @GhiChuLanhDao,
        UpdatedAt = GETDATE(),
        UpdatedBy = @LanhDaoUserId
    WHERE Id = @LichTrinhId;

    UPDATE dbo.YeuCau
    SET TrangThai = @TrangThaiYeuCau,
        NgayHoanTat = CASE WHEN @TrangThaiYeuCau = 7 THEN GETDATE() ELSE NgayHoanTat END,
        UpdatedAt = GETDATE(),
        UpdatedBy = @LanhDaoUserId
    WHERE Id = @YeuCauId;

    INSERT INTO dbo.YeuCauLichSuTrangThai (
        ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @YeuCauId, @TrangThaiCu, @TrangThaiYeuCau, @LanhDaoUserId, N'LanhDao',
        @GhiChu, COALESCE(@ChiDaoCuaLanhDao, N'Lãnh đạo cập nhật phản hồi sau trình'), GETDATE()
    );

    COMMIT TRAN;

    SELECT
        @KetQuaTrinhId AS KetQuaTrinhId,
        @LichTrinhId   AS LichTrinhId,
        @YeuCauId      AS YeuCauId,
        @MaYeuCau      AS MaYeuCau,
        @TieuDe        AS TieuDe,
        @NguoiTaoId    AS NguoiTaoId,
        CAST(NULL AS INT) AS TroLyUserId,
        N''            AS TenLanhDao,
        N'Đã lưu phản hồi của lãnh đạo thành công.' AS Message;
END
GO

-- ============================================================================
-- 5. SP: Admin lưu cấu hình Lãnh đạo & Trợ lý (ràng buộc chặt 1 Sếp = 1 Trợ lý duy nhất)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Admin_SaveLanhDao
    @Id            INT = 0,
    @UserId        INT,
    @ChiNhanhId    INT,
    @CapDo         INT = 1,
    @ThuTuHienThi  INT = 1,
    @IsActived     BIT = 1,
    @TroLyUserId   INT = NULL,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TroLyUserId IS NOT NULL AND @TroLyUserId = @UserId
        THROW 50001, N'Lãnh đạo và trợ lý không thể là cùng một tài khoản.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.LanhDao
        WHERE UserId = @UserId AND IsDeleted = 0 AND (@Id = 0 OR Id <> @Id)
    )
        THROW 50002, N'Người dùng này đã được thiết lập là Lãnh đạo trong hệ thống.', 1;

    IF @TroLyUserId IS NOT NULL AND EXISTS (
        SELECT 1
        FROM dbo.TroLy tl
        INNER JOIN dbo.LanhDao ld ON ld.Id = tl.LanhDaoId AND ld.IsDeleted = 0
        WHERE tl.UserId = @TroLyUserId
          AND tl.IsDeleted = 0
          AND tl.IsActived = 1
          AND (@Id = 0 OR tl.LanhDaoId <> @Id)
    )
        THROW 50003, N'Trợ lý này đang được phân công cho một lãnh đạo khác (mỗi lãnh đạo chỉ có 1 trợ lý duy nhất).', 1;

    BEGIN TRAN;

    DECLARE @TargetId INT = @Id;
    IF @TargetId > 0
    BEGIN
        UPDATE dbo.LanhDao
        SET ChiNhanhId = @ChiNhanhId,
            UserId = @UserId,
            CapDo = @CapDo,
            ThuTuHienThi = @ThuTuHienThi,
            IsActived = @IsActived
        WHERE Id = @TargetId AND IsDeleted = 0;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.LanhDao (ChiNhanhId, UserId, CapDo, ThuTuHienThi, IsActived, IsDeleted)
        VALUES (@ChiNhanhId, @UserId, @CapDo, @ThuTuHienThi, @IsActived, 0);
        SET @TargetId = SCOPE_IDENTITY();
    END

    -- Đảm bảo có cấu hình giờ làm việc mặc định cho Lãnh đạo
    IF NOT EXISTS (SELECT 1 FROM dbo.LanhDaoCauHinh WHERE LanhDaoId = @TargetId AND IsDeleted = 0)
    BEGIN
        INSERT INTO dbo.LanhDaoCauHinh (
            ChiNhanhId, LanhDaoId, GioBatDau, GioKetThuc, NghiTruaTu, NghiTruaDen,
            ThoiGianDemPhut, GioiHanPhutMoiNgay, SoNgayLamViecMask, ChoNhanVienXemLichTrongBan,
            IsActived, IsDeleted
        )
        VALUES (
            @ChiNhanhId, @TargetId, '08:00:00', '17:00:00', '12:00:00', '13:30:00',
            10, 180, 62, 1, 1, 0
        );
    END

    -- Cập nhật phân công trợ lý 1-1: vô hiệu hóa các gán cũ của lãnh đạo này
    UPDATE dbo.TroLy
    SET IsDeleted = 1, IsActived = 0
    WHERE LanhDaoId = @TargetId AND IsDeleted = 0;

    IF @TroLyUserId IS NOT NULL AND @TroLyUserId > 0
    BEGIN
        INSERT INTO dbo.TroLy (
            ChiNhanhId, UserId, LanhDaoId, IsTroLyChinh, ChoPhepGhiDeXungDot, IsActived, IsDeleted
        )
        VALUES (
            @ChiNhanhId, @TroLyUserId, @TargetId, 1, 1, 1, 0
        );
    END

    COMMIT TRAN;

    SELECT @TargetId;
END
GO

-- ============================================================================
-- 6. SP: Báo cáo yêu cầu trình lãnh đạo để xuất Excel theo khoảng thời gian & chi nhánh
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Report_BaoCaoYeuCau
    @TuNgay        DATE,
    @DenNgay       DATE,
    @ChiNhanhId    INT = 0,
    @NhomTrangThai TINYINT = 0 -- 0 = Tất cả, 1 = Đang xử lý, 2 = Đã hoàn thành, 3 = Từ chối/Hủy
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EndExclusive DATETIME2(7) = DATEADD(DAY, 1, CAST(@DenNgay AS DATETIME2(7)));

    SELECT
        CONVERT(VARCHAR(10), COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt), 23) AS RefDate,
        yc.Id AS YeuCauId,
        yc.MaYeuCau,
        yc.TieuDe,
        ISNULL(yc.TomTat, N'') AS TomTat,
        yc.ChiNhanhId,
        ISNULL(cn.TenChiNhanh, N'') AS TenChiNhanh,
        ISNULL(uNv.TenNguoiDung, N'') AS TenNguoiTrinh,
        ISNULL(pb.TenPhongBan, N'') AS TenPhongBan,
        ISNULL(cv.TenChucVu, N'') AS TenChucVu,
        ISNULL(uLd.TenNguoiDung, N'') AS TenLanhDao,
        ISNULL(lyc.TenLoai, N'') AS TenLoai,
        CASE yc.MucKhan
            WHEN 3 THEN N'Rất gấp'
            WHEN 2 THEN N'Gấp'
            ELSE N'Thường'
        END AS MucKhan,
        ISNULL(ut.Ten, N'') AS MucUuTien,
        yc.ThoiLuongPhut,
        yc.HanChot,
        yc.NgayGui,
        yc.CreatedAt,
        lt.BatDau AS LichBatDau,
        lt.KetThuc AS LichKetThuc,
        yc.TrangThai,
        CASE yc.TrangThai
            WHEN 0  THEN N'Nháp'
            WHEN 1  THEN N'Chờ xử lý'
            WHEN 2  THEN N'Đang xem xét'
            WHEN 3  THEN N'Đề xuất đổi lịch'
            WHEN 4  THEN N'Yêu cầu bổ sung'
            WHEN 5  THEN N'Đã duyệt lịch'
            WHEN 6  THEN N'Đã trình'
            WHEN 7  THEN N'Hoàn thành'
            WHEN 8  THEN N'Từ chối'
            WHEN 9  THEN N'Đã hủy'
            WHEN 10 THEN N'Hoãn'
            WHEN 11 THEN N'Vắng'
            ELSE N'Khác'
        END AS TenTrangThai,
        ISNULL(kq.ChiDaoCuaLanhDao, N'') AS PhanHoiLanhDao,
        ISNULL(yc.LyDoTuChoiHuy, N'') AS LyDoTuChoiHuy
    FROM dbo.YeuCau yc
    INNER JOIN dbo.Users uNv ON uNv.UserId = yc.NguoiTaoId
    LEFT JOIN dbo.ChiNhanh cn ON cn.ChiNhanhId = yc.ChiNhanhId
    LEFT JOIN dbo.PhongBan pb ON pb.Id = uNv.PhongBanId AND pb.IsDeleted = 0
    LEFT JOIN dbo.ChucVu cv ON cv.Id = uNv.ChucVuId
    LEFT JOIN dbo.LanhDao ld ON ld.Id = yc.LanhDaoId
    LEFT JOIN dbo.Users uLd ON uLd.UserId = ld.UserId
    LEFT JOIN dbo.LoaiYeuCau lyc ON lyc.Id = yc.LoaiYeuCauId
    LEFT JOIN dbo.MucUuTien ut ON ut.Id = yc.MucUuTienId AND ut.IsDeleted = 0
    OUTER APPLY (
        SELECT TOP 1 l.Id, l.BatDau, l.KetThuc
        FROM dbo.LichTrinh l
        WHERE l.YeuCauId = yc.Id AND l.IsDeleted = 0
        ORDER BY l.Id DESC
    ) lt
    OUTER APPLY (
        SELECT TOP 1 k.ChiDaoCuaLanhDao
        FROM dbo.KetQuaTrinh k
        WHERE k.YeuCauId = yc.Id AND k.IsDeleted = 0
        ORDER BY k.Id DESC
    ) kq
    WHERE yc.IsDeleted = 0
      AND (@ChiNhanhId <= 0 OR yc.ChiNhanhId = @ChiNhanhId OR yc.ChiNhanhNguoiTaoId = @ChiNhanhId)
      AND COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt) >= CAST(@TuNgay AS DATETIME2(7))
      AND COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt) < @EndExclusive
      AND (
          @NhomTrangThai = 0
          OR (@NhomTrangThai = 1 AND yc.TrangThai IN (1, 2, 3, 4, 5))
          OR (@NhomTrangThai = 2 AND yc.TrangThai IN (6, 7))
          OR (@NhomTrangThai = 3 AND yc.TrangThai IN (8, 9, 10, 11))
      )
    ORDER BY COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt) DESC, yc.Id DESC;
END
GO
