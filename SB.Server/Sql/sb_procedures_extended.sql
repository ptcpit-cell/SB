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

-- 1b. Đảm bảo tồn tại 2 Sequence sinh mã yêu cầu và mã nhóm (tránh lỗi Invalid object name 'dbo.SeqMaYeuCau')
IF OBJECT_ID(N'dbo.SeqMaYeuCau', N'SO') IS NULL
BEGIN
    CREATE SEQUENCE dbo.SeqMaYeuCau
        AS INT
        START WITH 1
        INCREMENT BY 1;
END
GO

IF OBJECT_ID(N'dbo.SeqMaNhom', N'SO') IS NULL
BEGIN
    CREATE SEQUENCE dbo.SeqMaNhom
        AS INT
        START WITH 1
        INCREMENT BY 1;
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

-- ============================================================================
-- 7. SP: Chi tiết yêu cầu (hỗ trợ Người tạo / Lãnh đạo / Trợ lý / Admin + trả đủ thông tin Người trình)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_ChiTiet
    @YeuCauId   INT,
    @NguoiTaoId INT -- ID của user đang đăng nhập (nhân viên tạo / trợ lý / lãnh đạo / admin)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LanhDaoId INT, @OwnerId INT;
    SELECT @LanhDaoId = LanhDaoId, @OwnerId = NguoiTaoId
    FROM dbo.YeuCau
    WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

    IF @LanhDaoId IS NULL
        THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;

    DECLARE @IsOwner BIT = CASE WHEN @OwnerId = @NguoiTaoId THEN 1 ELSE 0 END;

    DECLARE @IsLanhDao BIT = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.LanhDao
        WHERE Id = @LanhDaoId AND UserId = @NguoiTaoId AND IsDeleted = 0 AND IsActived = 1
    ) THEN 1 ELSE 0 END;

    DECLARE @IsTroLy BIT = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.TroLy
        WHERE LanhDaoId = @LanhDaoId AND UserId = @NguoiTaoId AND IsDeleted = 0 AND IsActived = 1
    ) THEN 1 ELSE 0 END;

    DECLARE @IsAdmin BIT = CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.UserRoles ur
        INNER JOIN dbo.RolePermissions rp ON rp.RoleId = ur.RoleId
        INNER JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
        WHERE ur.UserId = @NguoiTaoId
          AND ISNULL(p.IsActived, 1) = 1
          AND UPPER(ISNULL(p.PermissionName, N'')) IN (N'VIEW_ADMIN', N'ADMIN')
    ) THEN 1 ELSE 0 END;

    IF @IsOwner = 0 AND @IsLanhDao = 0 AND @IsTroLy = 0 AND @IsAdmin = 0
        THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;

    DECLARE @IsNoiBo BIT = CASE WHEN @IsLanhDao = 1 OR @IsTroLy = 1 OR @IsAdmin = 1 THEN 1 ELSE 0 END;

    -- 1. Thông tin chung (đầy đủ thông tin người trình + mức ưu tiên)
    SELECT yc.Id,
           yc.MaYeuCau,
           yc.NhomYeuCauId,
           nh.MaNhom,
           yc.NguoiTaoId,
           unt.TenNguoiDung AS TenNguoiTao,
           pb.TenPhongBan   AS PhongBanNguoiTao,
           cv.TenChucVu     AS ChucVuNguoiTao,
           cn.TenChiNhanh   AS ChiNhanhNguoiTao,
           yc.LanhDaoId,
           ul.TenNguoiDung  AS TenLanhDao,
           yc.LoaiYeuCauId,
           lo.TenLoai,
           yc.TieuDe,
           yc.TomTat,
           yc.MucKhan,
           yc.LyDoKhan,
           yc.MucUuTienId,
           mu.Ten           AS TenMucUuTien,
           mu.MauHienThi    AS MauMucUuTien,
           yc.ThoiLuongPhut,
           yc.HanChot,
           yc.LaBaoMat,
           yc.TrangThai,
           ut.TenNguoiDung  AS TenTroLy,
           yc.NgayGui,
           yc.NgayTiepNhan,
           yc.NgayHoanTat,
           yc.LyDoTuChoiHuy,
           yc.CreatedAt
    FROM dbo.YeuCau yc
    INNER JOIN dbo.Users unt       ON unt.UserId = yc.NguoiTaoId
    LEFT JOIN dbo.PhongBan pb      ON pb.Id = unt.PhongBanId AND pb.IsDeleted = 0
    LEFT JOIN dbo.ChucVu cv        ON cv.Id = unt.ChucVuId
    LEFT JOIN dbo.ChiNhanh cn      ON cn.ChiNhanhId = unt.ChiNhanhId
    INNER JOIN dbo.LoaiYeuCau lo   ON lo.Id = yc.LoaiYeuCauId
    INNER JOIN dbo.LanhDao ld      ON ld.Id = yc.LanhDaoId
    INNER JOIN dbo.Users ul        ON ul.UserId = ld.UserId
    LEFT JOIN dbo.NhomYeuCau nh    ON nh.Id = yc.NhomYeuCauId
    LEFT JOIN dbo.MucUuTien mu     ON mu.Id = yc.MucUuTienId
    LEFT JOIN dbo.Users ut         ON ut.UserId = yc.TroLyXuLyId
    WHERE yc.Id = @YeuCauId;

    -- 2. Các phương án giờ (của nhân viên và do trợ lý đề xuất)
    SELECT Id, BatDau, KetThuc, ThuTuUuTien, NguonDeXuat, NhanVienDongY, NgayPhanHoi, GhiChu
    FROM dbo.YeuCauThoiGianDeXuat
    WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND IsActived = 1
    ORDER BY NguonDeXuat, ThuTuUuTien, Id;

    -- 3. Người tham dự
    SELECT p.Id, p.UserId, ISNULL(u.TenNguoiDung, p.HoTenNgoai) AS HoTen, p.DonViNgoai, p.VaiTro
    FROM dbo.YeuCauNguoiThamDu p
    LEFT JOIN dbo.Users u ON u.UserId = p.UserId
    WHERE p.YeuCauId = @YeuCauId AND p.IsDeleted = 0 AND p.IsActived = 1;

    -- 4. Tệp đính kèm (của yêu cầu và của kết quả buổi trình)
    SELECT Id, YeuCauId, KetQuaTrinhId, TenFile, DuongDan, ContentType, KichThuoc, CreatedAt
    FROM dbo.TepDinhKem
    WHERE IsDeleted = 0 AND IsActived = 1
      AND (YeuCauId = @YeuCauId
           OR KetQuaTrinhId IN (SELECT Id FROM dbo.KetQuaTrinh WHERE YeuCauId = @YeuCauId AND IsDeleted = 0))
    ORDER BY CreatedAt;

    -- 5. Bình luận (ẩn bình luận nội bộ với nhân viên; hiện đủ cho Lãnh đạo / Trợ lý / Admin)
    SELECT b.Id, b.UserId, u.TenNguoiDung, b.NoiDung, b.CreatedAt
    FROM dbo.YeuCauBinhLuan b
    INNER JOIN dbo.Users u ON u.UserId = b.UserId
    WHERE b.YeuCauId = @YeuCauId AND b.IsDeleted = 0 AND b.IsActived = 1
      AND (b.ChiNoiBo = 0 OR @IsNoiBo = 1)
    ORDER BY b.CreatedAt, b.Id;

    -- 6. Timeline trạng thái
    SELECT h.Id, h.TuTrangThai, h.DenTrangThai, h.VaiTroThucHien, u.TenNguoiDung AS NguoiThucHien,
           h.LyDo, h.GhiChu, h.CreatedAt
    FROM dbo.YeuCauLichSuTrangThai h
    INNER JOIN dbo.Users u ON u.UserId = h.NguoiThucHienId
    WHERE h.YeuCauId = @YeuCauId
    ORDER BY h.CreatedAt, h.Id;

    -- 7. Lịch trình
    SELECT Id, BatDau, KetThuc, DiaDiem, TrangThai, ThuTuTrongNgay, NgayChot
    FROM dbo.LichTrinh
    WHERE YeuCauId = @YeuCauId AND IsDeleted = 0
    ORDER BY Id;

    -- 8. Lịch sử đổi giờ/hủy/hoãn của lịch trình
    SELECT s.Id, s.LichTrinhId, s.HanhDong, s.BatDauCu, s.KetThucCu, s.BatDauMoi, s.KetThucMoi,
           s.LyDo, u.TenNguoiDung AS NguoiThucHien, s.CreatedAt
    FROM dbo.LichTrinhLichSu s
    INNER JOIN dbo.Users u ON u.UserId = s.NguoiThucHienId
    WHERE s.YeuCauId = @YeuCauId
    ORDER BY s.CreatedAt, s.Id;

    -- 9. Kết quả buổi trình + chỉ đạo của lãnh đạo
    SELECT k.Id, k.LichTrinhId, k.KetQua, k.ThoiGianThucTe, k.ChiDaoCuaLanhDao, k.GhiChu,
           u.TenNguoiDung AS NguoiGhiNhan, k.CreatedAt
    FROM dbo.KetQuaTrinh k
    INNER JOIN dbo.Users u ON u.UserId = k.NguoiGhiNhanId
    WHERE k.YeuCauId = @YeuCauId AND k.IsDeleted = 0
    ORDER BY k.Id;

    -- 10. Công việc sau buổi trình
    SELECT cv.Id, cv.KetQuaTrinhId, cv.NoiDung, cv.NguoiPhuTrachId, up.TenNguoiDung AS NguoiPhuTrach,
           cv.HanXuLy, cv.TrangThai, cv.NgayHoanThanh
    FROM dbo.CongViecSauTrinh cv
    INNER JOIN dbo.KetQuaTrinh k ON k.Id = cv.KetQuaTrinhId AND k.YeuCauId = @YeuCauId
    LEFT JOIN dbo.Users up ON up.UserId = cv.NguoiPhuTrachId
    WHERE cv.IsDeleted = 0 AND cv.IsActived = 1
    ORDER BY cv.Id;
END
GO


-- ============================================================================
-- ============================================================================
-- PHẦN CẬP NHẬT MỚI SAU RÀ SOÁT ĐỒNG BỘ (MÃ MỚI BÊN DƯỚI ĐƯỜNG CẮT NGANG NÀY)
-- Thực thi phần bên dưới trên SQL Server để đồng bộ toàn bộ SP với C# & Angular
-- ============================================================================
-- ============================================================================

-- 8. SP: Danh sách yêu cầu của nhân viên (bổ sung cột HanChot + ưu tiên lịch chưa hủy)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_DanhSach
    @NguoiTaoId     INT,
    @NhomTrangThai  TINYINT = 0,
    @TrangThai      TINYINT = NULL,
    @LanhDaoId      INT = NULL,
    @TuNgay         DATETIME2 = NULL,
    @DenNgay        DATETIME2 = NULL,
    @TuKhoa         NVARCHAR(200) = NULL,
    @Page           INT = 1,
    @PageSize       INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 20;
    IF @PageSize > 100 SET @PageSize = 100;

    SELECT yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe, yc.TrangThai, yc.MucKhan,
           lo.TenLoai, yc.LanhDaoId, ul.TenNguoiDung AS TenLanhDao, nh.MaNhom,
           yc.NgayGui, yc.NgayHoanTat, yc.HanChot, yc.LyDoTuChoiHuy, yc.CreatedAt,
           l.BatDau AS LichBatDau, l.KetThuc AS LichKetThuc, l.TrangThai AS TrangThaiLich,
           CAST(CASE WHEN yc.TrangThai = 3 AND EXISTS (
                    SELECT 1 FROM dbo.YeuCauThoiGianDeXuat t
                    WHERE t.YeuCauId = yc.Id AND t.NguonDeXuat = 2 AND t.NhanVienDongY IS NULL
                      AND t.IsDeleted = 0 AND t.IsActived = 1)
                THEN 1 ELSE 0 END AS BIT) AS CoDeXuatChoPhanHoi,
           COUNT(*) OVER() AS TongSo
    FROM dbo.YeuCau yc
    JOIN dbo.LoaiYeuCau lo ON lo.Id = yc.LoaiYeuCauId
    JOIN dbo.LanhDao ld    ON ld.Id = yc.LanhDaoId
    JOIN dbo.Users ul      ON ul.UserId = ld.UserId
    LEFT JOIN dbo.NhomYeuCau nh ON nh.Id = yc.NhomYeuCauId
    OUTER APPLY (
        SELECT TOP 1 lt.BatDau, lt.KetThuc, lt.TrangThai
        FROM dbo.LichTrinh lt
        WHERE lt.YeuCauId = yc.Id AND lt.IsDeleted = 0
        ORDER BY CASE WHEN lt.TrangThai <> 3 THEN 0 ELSE 1 END, lt.Id DESC
    ) l
    WHERE yc.NguoiTaoId = @NguoiTaoId AND yc.IsDeleted = 0 AND yc.IsActived = 1
      AND (@NhomTrangThai = 0
           OR (@NhomTrangThai = 1 AND yc.TrangThai IN (0, 1, 2, 3, 4, 5, 10))
           OR (@NhomTrangThai = 2 AND yc.TrangThai IN (6, 7, 8, 9, 11)))
      AND (@TrangThai IS NULL OR yc.TrangThai = @TrangThai)
      AND (@LanhDaoId IS NULL OR yc.LanhDaoId = @LanhDaoId)
      AND (@TuNgay IS NULL OR yc.CreatedAt >= @TuNgay)
      AND (@DenNgay IS NULL OR yc.CreatedAt < DATEADD(DAY, 1, @DenNgay))
      AND (@TuKhoa IS NULL OR yc.TieuDe LIKE N'%' + @TuKhoa + N'%' OR yc.MaYeuCau LIKE N'%' + @TuKhoa + N'%')
    ORDER BY yc.CreatedAt DESC, yc.Id DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- 9. SP: Chi tiết yêu cầu (sửa quyền Admin khớp 'View admin', trả thêm ChiNoiBo & DaGhiDeXungDot/LyDoGhiDe/GhiChuLanhDao)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_ChiTiet
    @YeuCauId   INT,
    @NguoiTaoId INT -- ID của user đang đăng nhập (nhân viên tạo / trợ lý / lãnh đạo / admin)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LanhDaoId INT, @OwnerId INT;
    SELECT @LanhDaoId = LanhDaoId, @OwnerId = NguoiTaoId
    FROM dbo.YeuCau
    WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

    IF @LanhDaoId IS NULL
        THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;

    DECLARE @IsOwner BIT = CASE WHEN @OwnerId = @NguoiTaoId THEN 1 ELSE 0 END;

    DECLARE @IsLanhDao BIT = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.LanhDao
        WHERE Id = @LanhDaoId AND UserId = @NguoiTaoId AND IsDeleted = 0 AND IsActived = 1
    ) THEN 1 ELSE 0 END;

    DECLARE @IsTroLy BIT = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.TroLy
        WHERE LanhDaoId = @LanhDaoId AND UserId = @NguoiTaoId AND IsDeleted = 0 AND IsActived = 1
    ) THEN 1 ELSE 0 END;

    DECLARE @IsAdmin BIT = CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.UserRoles ur
        INNER JOIN dbo.Roles r ON r.RoleId = ur.RoleId AND ISNULL(r.IsDeleted, 0) = 0 AND ISNULL(r.IsActived, 1) = 1
        INNER JOIN dbo.RolePermissions rp ON rp.RoleId = ur.RoleId
        INNER JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
        WHERE ur.UserId = @NguoiTaoId
          AND ISNULL(p.IsActived, 1) = 1
          AND UPPER(LTRIM(RTRIM(ISNULL(p.PermissionName, N'')))) IN (N'VIEW ADMIN', N'VIEW_ADMIN', N'ADMIN')
    ) THEN 1 ELSE 0 END;

    IF @IsOwner = 0 AND @IsLanhDao = 0 AND @IsTroLy = 0 AND @IsAdmin = 0
        THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;

    DECLARE @IsNoiBo BIT = CASE WHEN @IsLanhDao = 1 OR @IsTroLy = 1 OR @IsAdmin = 1 THEN 1 ELSE 0 END;

    -- 1. Thông tin chung
    SELECT yc.Id,
           yc.MaYeuCau,
           yc.NhomYeuCauId,
           nh.MaNhom,
           yc.NguoiTaoId,
           unt.TenNguoiDung AS TenNguoiTao,
           pb.TenPhongBan   AS PhongBanNguoiTao,
           cv.TenChucVu     AS ChucVuNguoiTao,
           cn.TenChiNhanh   AS ChiNhanhNguoiTao,
           yc.LanhDaoId,
           ul.TenNguoiDung  AS TenLanhDao,
           yc.LoaiYeuCauId,
           lo.TenLoai,
           yc.TieuDe,
           yc.TomTat,
           yc.MucKhan,
           yc.LyDoKhan,
           yc.MucUuTienId,
           mu.Ten           AS TenMucUuTien,
           mu.MauHienThi    AS MauMucUuTien,
           yc.ThoiLuongPhut,
           yc.HanChot,
           yc.LaBaoMat,
           yc.TrangThai,
           ut.TenNguoiDung  AS TenTroLy,
           yc.NgayGui,
           yc.NgayTiepNhan,
           yc.NgayHoanTat,
           yc.LyDoTuChoiHuy,
           yc.CreatedAt
    FROM dbo.YeuCau yc
    INNER JOIN dbo.Users unt       ON unt.UserId = yc.NguoiTaoId
    LEFT JOIN dbo.PhongBan pb      ON pb.Id = unt.PhongBanId AND pb.IsDeleted = 0
    LEFT JOIN dbo.ChucVu cv        ON cv.Id = unt.ChucVuId
    LEFT JOIN dbo.ChiNhanh cn      ON cn.ChiNhanhId = unt.ChiNhanhId
    INNER JOIN dbo.LoaiYeuCau lo   ON lo.Id = yc.LoaiYeuCauId
    INNER JOIN dbo.LanhDao ld      ON ld.Id = yc.LanhDaoId
    INNER JOIN dbo.Users ul        ON ul.UserId = ld.UserId
    LEFT JOIN dbo.NhomYeuCau nh    ON nh.Id = yc.NhomYeuCauId
    LEFT JOIN dbo.MucUuTien mu     ON mu.Id = yc.MucUuTienId
    LEFT JOIN dbo.Users ut         ON ut.UserId = yc.TroLyXuLyId
    WHERE yc.Id = @YeuCauId;

    -- 2. Các phương án giờ
    SELECT Id, BatDau, KetThuc, ThuTuUuTien, NguonDeXuat, NhanVienDongY, NgayPhanHoi, GhiChu
    FROM dbo.YeuCauThoiGianDeXuat
    WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND IsActived = 1
    ORDER BY NguonDeXuat, ThuTuUuTien, Id;

    -- 3. Người tham dự
    SELECT p.Id, p.UserId, ISNULL(u.TenNguoiDung, p.HoTenNgoai) AS HoTen, p.DonViNgoai, p.VaiTro
    FROM dbo.YeuCauNguoiThamDu p
    LEFT JOIN dbo.Users u ON u.UserId = p.UserId
    WHERE p.YeuCauId = @YeuCauId AND p.IsDeleted = 0 AND p.IsActived = 1;

    -- 4. Tệp đính kèm
    SELECT Id, YeuCauId, KetQuaTrinhId, TenFile, DuongDan, ContentType, KichThuoc, CreatedAt
    FROM dbo.TepDinhKem
    WHERE IsDeleted = 0 AND IsActived = 1
      AND (YeuCauId = @YeuCauId
           OR KetQuaTrinhId IN (SELECT Id FROM dbo.KetQuaTrinh WHERE YeuCauId = @YeuCauId AND IsDeleted = 0))
    ORDER BY CreatedAt;

    -- 5. Bình luận (bổ sung cột ChiNoiBo)
    SELECT b.Id, b.UserId, u.TenNguoiDung, b.NoiDung, b.ChiNoiBo, b.CreatedAt
    FROM dbo.YeuCauBinhLuan b
    INNER JOIN dbo.Users u ON u.UserId = b.UserId
    WHERE b.YeuCauId = @YeuCauId AND b.IsDeleted = 0 AND b.IsActived = 1
      AND (b.ChiNoiBo = 0 OR @IsNoiBo = 1)
    ORDER BY b.CreatedAt, b.Id;

    -- 6. Timeline trạng thái
    SELECT h.Id, h.TuTrangThai, h.DenTrangThai, h.VaiTroThucHien, u.TenNguoiDung AS NguoiThucHien,
           h.LyDo, h.GhiChu, h.CreatedAt
    FROM dbo.YeuCauLichSuTrangThai h
    INNER JOIN dbo.Users u ON u.UserId = h.NguoiThucHienId
    WHERE h.YeuCauId = @YeuCauId
    ORDER BY h.CreatedAt, h.Id;

    -- 7. Lịch trình (bổ sung DaGhiDeXungDot, LyDoGhiDe, GhiChuLanhDao cho nội bộ)
    SELECT Id, BatDau, KetThuc, DiaDiem, TrangThai, ThuTuTrongNgay, NgayChot,
           DaGhiDeXungDot, LyDoGhiDe,
           CASE WHEN @IsNoiBo = 1 THEN GhiChuLanhDao ELSE NULL END AS GhiChuLanhDao
    FROM dbo.LichTrinh
    WHERE YeuCauId = @YeuCauId AND IsDeleted = 0
    ORDER BY Id;

    -- 8. Lịch sử đổi giờ/hủy/hoãn của lịch trình
    SELECT s.Id, s.LichTrinhId, s.HanhDong, s.BatDauCu, s.KetThucCu, s.BatDauMoi, s.KetThucMoi,
           s.LyDo, u.TenNguoiDung AS NguoiThucHien, s.CreatedAt
    FROM dbo.LichTrinhLichSu s
    INNER JOIN dbo.Users u ON u.UserId = s.NguoiThucHienId
    WHERE s.YeuCauId = @YeuCauId
    ORDER BY s.CreatedAt, s.Id;

    -- 9. Kết quả buổi trình + chỉ đạo của lãnh đạo
    SELECT k.Id, k.LichTrinhId, k.KetQua, k.ThoiGianThucTe, k.ChiDaoCuaLanhDao, k.GhiChu,
           u.TenNguoiDung AS NguoiGhiNhan, k.CreatedAt
    FROM dbo.KetQuaTrinh k
    INNER JOIN dbo.Users u ON u.UserId = k.NguoiGhiNhanId
    WHERE k.YeuCauId = @YeuCauId AND k.IsDeleted = 0
    ORDER BY k.Id;

    -- 10. Công việc sau buổi trình
    SELECT cv.Id, cv.KetQuaTrinhId, cv.NoiDung, cv.NguoiPhuTrachId, up.TenNguoiDung AS NguoiPhuTrach,
           cv.HanXuLy, cv.TrangThai, cv.NgayHoanThanh
    FROM dbo.CongViecSauTrinh cv
    INNER JOIN dbo.KetQuaTrinh k ON k.Id = cv.KetQuaTrinhId AND k.YeuCauId = @YeuCauId
    LEFT JOIN dbo.Users up ON up.UserId = cv.NguoiPhuTrachId
    WHERE cv.IsDeleted = 0 AND cv.IsActived = 1
    ORDER BY cv.Id;
END
GO

-- 10. SP: Gửi yêu cầu từ nháp (trả thêm TroLyUserId song song với UserId để DTO map chuẩn)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_Gui
    @YeuCauId   INT,
    @NguoiTaoId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME = GETDATE(), @Owner INT, @TrangThai TINYINT, @Cn INT, @LdId INT, @HanChot DATETIME;

    BEGIN TRY
        BEGIN TRAN;

        SELECT @Owner = NguoiTaoId, @TrangThai = TrangThai, @Cn = ChiNhanhId, @LdId = LanhDaoId, @HanChot = HanChot
        FROM dbo.YeuCau WITH (UPDLOCK, ROWLOCK)
        WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

        IF @Owner IS NULL OR @Owner <> @NguoiTaoId THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;
        IF @TrangThai <> 0 THROW 50043, N'Chỉ gửi được yêu cầu đang ở trạng thái Nháp.', 1;
        IF @HanChot IS NULL THROW 50017, N'Vui lòng chọn hạn chót trước khi gửi.', 1;
        IF @HanChot IS NOT NULL AND @HanChot <= @Now THROW 50015, N'Hạn chót phải ở tương lai.', 1;
        IF NOT EXISTS (
            SELECT 1 FROM dbo.TroLy t
            JOIN dbo.Users u ON u.UserId = t.UserId AND u.IsDeleted = 0 AND u.IsActived = 1
            WHERE t.LanhDaoId = @LdId AND t.IsDeleted = 0 AND t.IsActived = 1
        )
            THROW 50014, N'Lãnh đạo chưa được phân công trợ lý, vui lòng liên hệ quản trị.', 1;

        UPDATE dbo.YeuCau
        SET TrangThai = 1, NgayGui = @Now, UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
        WHERE Id = @YeuCauId;

        INSERT dbo.YeuCauLichSuTrangThai (ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, CreatedAt)
        VALUES (@Cn, @YeuCauId, 0, 1, @NguoiTaoId, N'NHANVIEN', N'Gửi yêu cầu', @Now);

        COMMIT;

        SELECT yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe, yc.LanhDaoId,
               t.UserId, t.UserId AS TroLyUserId, t.IsTroLyChinh
        FROM dbo.YeuCau yc
        JOIN dbo.TroLy t ON t.LanhDaoId = yc.LanhDaoId AND t.IsDeleted = 0 AND t.IsActived = 1
        WHERE yc.Id = @YeuCauId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 11. SP: Hủy yêu cầu (trả thêm TroLyUserId song song với UserId)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_Huy
    @YeuCauId   INT,
    @NguoiTaoId INT,
    @LyDo       NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME = GETDATE(), @Owner INT, @TrangThai TINYINT, @Cn INT, @LdId INT,
            @CoLich BIT = 0;

    BEGIN TRY
        BEGIN TRAN;

        SELECT @Owner = NguoiTaoId, @TrangThai = TrangThai, @Cn = ChiNhanhId, @LdId = LanhDaoId
        FROM dbo.YeuCau WITH (UPDLOCK, ROWLOCK)
        WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

        IF @Owner IS NULL OR @Owner <> @NguoiTaoId THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;
        IF @TrangThai NOT IN (0, 1, 2, 3, 4, 5, 10) THROW 50041, N'Yêu cầu đã kết thúc, không thể hủy.', 1;

        IF EXISTS (SELECT 1 FROM dbo.LichTrinh WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND TrangThai IN (1, 4))
            SET @CoLich = 1;

        IF @CoLich = 1 AND LTRIM(RTRIM(ISNULL(@LyDo, N''))) = N''
            THROW 50042, N'Yêu cầu đã được xếp lịch, vui lòng nhập lý do hủy.', 1;

        INSERT dbo.LichTrinhLichSu (ChiNhanhId, LichTrinhId, YeuCauId, LanhDaoId, HanhDong, BatDauCu, KetThucCu, LyDo, NguoiThucHienId, CreatedAt)
        SELECT lt.ChiNhanhId, lt.Id, lt.YeuCauId, lt.LanhDaoId, 3, lt.BatDau, lt.KetThuc,
               ISNULL(@LyDo, N'Nhân viên hủy yêu cầu'), @NguoiTaoId, @Now
        FROM dbo.LichTrinh lt
        WHERE lt.YeuCauId = @YeuCauId AND lt.IsDeleted = 0 AND lt.TrangThai IN (1, 4);

        UPDATE nl SET IsActived = 0, UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
        FROM dbo.NhacLich nl
        WHERE nl.DaGui = 0 AND nl.IsDeleted = 0
          AND nl.LichTrinhId IN (SELECT Id FROM dbo.LichTrinh WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND TrangThai IN (1, 4));

        UPDATE dbo.LichTrinh
        SET TrangThai = 3, UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
        WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND TrangThai IN (1, 4);

        UPDATE dbo.YeuCau
        SET TrangThai = 9, LyDoTuChoiHuy = @LyDo, NgayHoanTat = @Now, UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
        WHERE Id = @YeuCauId;

        INSERT dbo.YeuCauLichSuTrangThai (ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, CreatedAt)
        VALUES (@Cn, @YeuCauId, @TrangThai, 9, @NguoiTaoId, N'NHANVIEN', @LyDo, @Now);

        COMMIT;

        SELECT yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe, @CoLich AS CoLich,
               t.UserId, t.UserId AS TroLyUserId, ld.UserId AS LanhDaoUserId
        FROM dbo.YeuCau yc
        JOIN dbo.LanhDao ld ON ld.Id = yc.LanhDaoId
        JOIN dbo.TroLy t ON t.LanhDaoId = yc.LanhDaoId AND t.IsDeleted = 0 AND t.IsActived = 1
        WHERE yc.Id = @YeuCauId AND @TrangThai >= 1;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 12. SP: Bổ sung thông tin yêu cầu (trả thêm TroLyUserId song song với UserId)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_BoSung
    @YeuCauId   INT,
    @NguoiTaoId INT,
    @NoiDung    NVARCHAR(MAX),
    @TomTat     NVARCHAR(1000) = NULL,
    @TepDinhKem dbo.TVP_TepDinhKem READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME = GETDATE(), @Owner INT, @TrangThai TINYINT, @Cn INT;
    IF LTRIM(RTRIM(ISNULL(@NoiDung, N''))) = N'' THROW 50061, N'Vui lòng nhập nội dung bổ sung.', 1;

    BEGIN TRY
        BEGIN TRAN;

        SELECT @Owner = NguoiTaoId, @TrangThai = TrangThai, @Cn = ChiNhanhId
        FROM dbo.YeuCau WITH (UPDLOCK, ROWLOCK)
        WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

        IF @Owner IS NULL OR @Owner <> @NguoiTaoId THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;
        IF @TrangThai <> 4 THROW 50060, N'Yêu cầu hiện không ở trạng thái cần bổ sung.', 1;

        INSERT dbo.YeuCauBinhLuan (ChiNhanhId, YeuCauId, UserId, NoiDung, ChiNoiBo, CreatedAt, CreatedBy)
        VALUES (@Cn, @YeuCauId, @NguoiTaoId, @NoiDung, 0, @Now, @NguoiTaoId);

        INSERT dbo.TepDinhKem (ChiNhanhId, YeuCauId, TenFile, DuongDan, ContentType, KichThuoc, Checksum, CreatedAt, CreatedBy)
        SELECT @Cn, @YeuCauId, TenFile, DuongDan, ContentType, KichThuoc, Checksum, @Now, @NguoiTaoId FROM @TepDinhKem;

        UPDATE dbo.YeuCau
        SET TrangThai = 1, TomTat = ISNULL(@TomTat, TomTat), UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
        WHERE Id = @YeuCauId;

        INSERT dbo.YeuCauLichSuTrangThai (ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, CreatedAt)
        VALUES (@Cn, @YeuCauId, 4, 1, @NguoiTaoId, N'NHANVIEN', N'Nhân viên đã bổ sung thông tin', @Now);

        COMMIT;

        SELECT yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe, yc.TroLyXuLyId,
               t.UserId, t.UserId AS TroLyUserId, t.IsTroLyChinh
        FROM dbo.YeuCau yc
        JOIN dbo.TroLy t ON t.LanhDaoId = yc.LanhDaoId AND t.IsDeleted = 0 AND t.IsActived = 1
        WHERE yc.Id = @YeuCauId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 13. SP: Sửa yêu cầu nháp (trả thêm TroLyUserId song song với UserId)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_Sua
    @YeuCauId       INT,
    @NguoiTaoId     INT,
    @LoaiYeuCauId   INT,
    @TomTat         NVARCHAR(1000) = NULL,
    @MucKhan        TINYINT = 1,
    @LyDoKhan       NVARCHAR(500) = NULL,
    @ThoiLuongPhut  INT,
    @HanChot        DATETIME2 = NULL,
    @LaBaoMat       BIT = 0,
    @GuiNgay        BIT = 0,
    @ThoiGianDeXuat dbo.TVP_ThoiGianDeXuat READONLY,
    @NguoiThamDu    dbo.TVP_NguoiThamDu READONLY,
    @TepDinhKem     dbo.TVP_TepDinhKem READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME = GETDATE(), @Owner INT, @TrangThai TINYINT, @Cn INT, @LdId INT, @CnNguoiTao INT;

    BEGIN TRY
        BEGIN TRAN;

        SELECT @Owner = NguoiTaoId, @TrangThai = TrangThai, @Cn = ChiNhanhId, @LdId = LanhDaoId
        FROM dbo.YeuCau WITH (UPDLOCK, ROWLOCK)
        WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

        IF @Owner IS NULL OR @Owner <> @NguoiTaoId THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;
        IF @TrangThai <> 0 THROW 50044, N'Chỉ sửa được yêu cầu đang ở trạng thái Nháp.', 1;

        SELECT @CnNguoiTao = ChiNhanhId FROM dbo.Users WHERE UserId = @NguoiTaoId;

        IF NOT EXISTS (
            SELECT 1 FROM dbo.LoaiYeuCau
            WHERE Id = @LoaiYeuCauId AND IsDeleted = 0 AND IsActived = 1
              AND ChiNhanhId IN (SELECT ChiNhanhId FROM dbo.fn_ChiNhanhVaCha(@CnNguoiTao))
        )
            THROW 50007, N'Loại yêu cầu không hợp lệ.', 1;

        IF @MucKhan NOT IN (1, 2, 3) THROW 50003, N'Mức khẩn không hợp lệ.', 1;
        IF @MucKhan > 1 AND LTRIM(RTRIM(ISNULL(@LyDoKhan, N''))) = N''
            THROW 50004, N'Vui lòng nhập lý do khi chọn mức Gấp hoặc Rất gấp.', 1;
        IF @ThoiLuongPhut <= 0 OR @ThoiLuongPhut > 480 THROW 50008, N'Thời lượng không hợp lệ.', 1;
        IF EXISTS (SELECT 1 FROM @ThoiGianDeXuat WHERE KetThuc IS NOT NULL AND KetThuc <= BatDau)
            THROW 50010, N'Giờ kết thúc phải sau giờ bắt đầu.', 1;
        IF (SELECT COUNT(*) FROM @ThoiGianDeXuat) > 3 THROW 50012, N'Chỉ được chọn tối đa 3 phương án thời gian.', 1;
        IF EXISTS (SELECT 1 FROM @NguoiThamDu WHERE UserId IS NULL AND ISNULL(HoTenNgoai, N'') = N'')
            THROW 50013, N'Người tham dự phải là người dùng nội bộ hoặc có họ tên.', 1;

        IF @HanChot IS NOT NULL
        BEGIN
            SET @HanChot = DATEADD(SECOND, 86399, CAST(CAST(@HanChot AS DATE) AS DATETIME));
            IF @HanChot > DATEADD(DAY, 31, @Now) THROW 50018, N'Hạn chót không được quá 30 ngày kể từ hôm nay.', 1;
        END

        IF @GuiNgay = 1
        BEGIN
            IF @HanChot IS NULL THROW 50017, N'Vui lòng chọn hạn chót.', 1;
            IF @HanChot IS NOT NULL AND @HanChot <= @Now THROW 50015, N'Hạn chót phải ở tương lai.', 1;
            IF NOT EXISTS (
                SELECT 1 FROM dbo.TroLy t
                JOIN dbo.Users u ON u.UserId = t.UserId AND u.IsDeleted = 0 AND u.IsActived = 1
                WHERE t.LanhDaoId = @LdId AND t.IsDeleted = 0 AND t.IsActived = 1
            )
                THROW 50014, N'Lãnh đạo chưa được phân công trợ lý, vui lòng liên hệ quản trị.', 1;
        END

        UPDATE dbo.YeuCau
        SET LoaiYeuCauId = @LoaiYeuCauId, TomTat = @TomTat, MucKhan = @MucKhan, LyDoKhan = @LyDoKhan,
            ThoiLuongPhut = @ThoiLuongPhut, HanChot = @HanChot, LaBaoMat = @LaBaoMat,
            TrangThai = CASE WHEN @GuiNgay = 1 THEN 1 ELSE 0 END,
            NgayGui   = CASE WHEN @GuiNgay = 1 THEN @Now ELSE NgayGui END,
            UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
        WHERE Id = @YeuCauId;

        UPDATE dbo.YeuCauThoiGianDeXuat SET IsDeleted = 1
        WHERE YeuCauId = @YeuCauId AND NguonDeXuat = 1 AND IsDeleted = 0;

        INSERT dbo.YeuCauThoiGianDeXuat (ChiNhanhId, YeuCauId, BatDau, KetThuc, ThuTuUuTien, NguonDeXuat, CreatedAt, CreatedBy)
        SELECT @Cn, @YeuCauId, BatDau, ISNULL(KetThuc, DATEADD(MINUTE, @ThoiLuongPhut, BatDau)), ThuTuUuTien, 1, @Now, @NguoiTaoId
        FROM @ThoiGianDeXuat;

        UPDATE dbo.YeuCauNguoiThamDu SET IsDeleted = 1
        WHERE YeuCauId = @YeuCauId AND IsDeleted = 0;

        INSERT dbo.YeuCauNguoiThamDu (ChiNhanhId, YeuCauId, UserId, HoTenNgoai, DonViNgoai, VaiTro, CreatedAt, CreatedBy)
        SELECT @Cn, @YeuCauId, UserId, HoTenNgoai, DonViNgoai, VaiTro, @Now, @NguoiTaoId FROM @NguoiThamDu;

        UPDATE dbo.TepDinhKem SET IsDeleted = 1
        WHERE YeuCauId = @YeuCauId AND IsDeleted = 0
          AND DuongDan NOT IN (SELECT DuongDan FROM @TepDinhKem);

        INSERT dbo.TepDinhKem (ChiNhanhId, YeuCauId, TenFile, DuongDan, ContentType, KichThuoc, Checksum, CreatedAt, CreatedBy)
        SELECT @Cn, @YeuCauId, t.TenFile, t.DuongDan, t.ContentType, t.KichThuoc, t.Checksum, @Now, @NguoiTaoId
        FROM @TepDinhKem t
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.TepDinhKem x
            WHERE x.YeuCauId = @YeuCauId AND x.IsDeleted = 0 AND x.DuongDan = t.DuongDan
        );

        IF @GuiNgay = 1
            INSERT dbo.YeuCauLichSuTrangThai (ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, CreatedAt)
            VALUES (@Cn, @YeuCauId, 0, 1, @NguoiTaoId, N'NHANVIEN', N'Sửa bản nháp và gửi yêu cầu', @Now);

        COMMIT;

        SELECT yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe, yc.LanhDaoId,
               t.UserId, t.UserId AS TroLyUserId, t.IsTroLyChinh
        FROM dbo.YeuCau yc
        JOIN dbo.TroLy t ON t.LanhDaoId = yc.LanhDaoId AND t.IsDeleted = 0 AND t.IsActived = 1
        WHERE yc.Id = @YeuCauId AND @GuiNgay = 1;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 14. SP: Nhân viên phản hồi đề xuất đổi lịch (cho phép chồng khung giờ giống xếp lịch, trả thêm TroLyUserId)
CREATE OR ALTER PROCEDURE dbo.usp_YeuCau_PhanHoiDeXuat
    @YeuCauId         INT,
    @NguoiTaoId       INT,
    @ThoiGianDeXuatId INT,
    @DongY            BIT,
    @GhiChu           NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME = GETDATE(), @Owner INT, @TrangThai TINYINT, @Cn INT, @LdId INT, @TroLyId INT,
            @BatDau DATETIME, @KetThuc DATETIME,
            @LichId INT = NULL, @BatDauCu DATETIME, @KetThucCu DATETIME,
            @CoXungDot BIT = 0;

    BEGIN TRY
        BEGIN TRAN;

        SELECT @Owner = NguoiTaoId, @TrangThai = TrangThai, @Cn = ChiNhanhId, @LdId = LanhDaoId, @TroLyId = TroLyXuLyId
        FROM dbo.YeuCau WITH (UPDLOCK, ROWLOCK)
        WHERE Id = @YeuCauId AND IsDeleted = 0 AND IsActived = 1;

        IF @Owner IS NULL OR @Owner <> @NguoiTaoId THROW 50040, N'Không tìm thấy yêu cầu hoặc bạn không có quyền.', 1;
        IF @TrangThai <> 3 THROW 50050, N'Yêu cầu không ở trạng thái chờ phản hồi đề xuất đổi lịch.', 1;

        SELECT @BatDau = BatDau, @KetThuc = KetThuc
        FROM dbo.YeuCauThoiGianDeXuat
        WHERE Id = @ThoiGianDeXuatId AND YeuCauId = @YeuCauId AND NguonDeXuat = 2
          AND NhanVienDongY IS NULL AND IsDeleted = 0 AND IsActived = 1;

        IF @BatDau IS NULL THROW 50051, N'Phương án đề xuất không hợp lệ hoặc đã được phản hồi.', 1;

        IF @TroLyId IS NULL
        BEGIN
            SELECT TOP 1 @TroLyId = UserId
            FROM dbo.TroLy
            WHERE LanhDaoId = @LdId AND IsDeleted = 0 AND IsActived = 1
            ORDER BY IsTroLyChinh DESC, Id ASC;
        END

        IF @DongY = 1
        BEGIN
            IF @BatDau <= @Now THROW 50052, N'Khung giờ đề xuất đã qua, vui lòng chờ trợ lý đề xuất lại.', 1;

            -- Ghi nhận cờ xung đột (không chặn chồng khung giờ)
            IF EXISTS (
                SELECT 1 FROM dbo.LichTrinh lt
                WHERE lt.LanhDaoId = @LdId AND lt.IsDeleted = 0 AND lt.IsActived = 1 AND lt.TrangThai IN (1, 2)
                  AND lt.YeuCauId <> @YeuCauId AND lt.BatDau < @KetThuc AND lt.KetThuc > @BatDau
            )
            OR EXISTS (
                SELECT 1 FROM dbo.SuKienLanhDao sk
                WHERE sk.LanhDaoId = @LdId AND sk.IsDeleted = 0 AND sk.IsActived = 1
                  AND sk.BatDau < @KetThuc AND sk.KetThuc > @BatDau
            )
            BEGIN
                SET @CoXungDot = 1;
            END

            SELECT TOP 1 @LichId = Id, @BatDauCu = BatDau, @KetThucCu = KetThuc
            FROM dbo.LichTrinh
            WHERE YeuCauId = @YeuCauId AND IsDeleted = 0 AND TrangThai IN (1, 4)
            ORDER BY Id DESC;

            IF @LichId IS NULL
            BEGIN
                INSERT dbo.LichTrinh (
                    ChiNhanhId, YeuCauId, LanhDaoId, BatDau, KetThuc, DiaDiem,
                    TrangThai, NguoiChotId, NgayChot, DaGhiDeXungDot, LyDoGhiDe,
                    IsActived, IsDeleted, CreatedAt, CreatedBy
                )
                VALUES (
                    @Cn, @YeuCauId, @LdId, @BatDau, @KetThuc, NULL,
                    1, @TroLyId, @Now, @CoXungDot,
                    CASE WHEN @CoXungDot = 1 THEN N'Cho phép xếp chồng khung giờ' ELSE NULL END,
                    1, 0, @Now, @NguoiTaoId
                );
                SET @LichId = SCOPE_IDENTITY();

                INSERT dbo.LichTrinhLichSu (ChiNhanhId, LichTrinhId, YeuCauId, LanhDaoId, HanhDong, BatDauMoi, KetThucMoi, LyDo, NguoiThucHienId, CreatedAt)
                VALUES (@Cn, @LichId, @YeuCauId, @LdId, 1, @BatDau, @KetThuc, N'Nhân viên đồng ý phương án trợ lý đề xuất', @NguoiTaoId, @Now);
            END
            ELSE
            BEGIN
                UPDATE dbo.LichTrinh
                SET BatDau = @BatDau, KetThuc = @KetThuc, TrangThai = 1,
                    NguoiChotId = COALESCE(@TroLyId, NguoiChotId), NgayChot = @Now,
                    DaGhiDeXungDot = @CoXungDot,
                    LyDoGhiDe = CASE WHEN @CoXungDot = 1 THEN N'Cho phép xếp chồng khung giờ' ELSE NULL END,
                    UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
                WHERE Id = @LichId;

                INSERT dbo.LichTrinhLichSu (ChiNhanhId, LichTrinhId, YeuCauId, LanhDaoId, HanhDong, BatDauCu, KetThucCu, BatDauMoi, KetThucMoi, LyDo, NguoiThucHienId, CreatedAt)
                VALUES (@Cn, @LichId, @YeuCauId, @LdId, 2, @BatDauCu, @KetThucCu, @BatDau, @KetThuc, N'Nhân viên đồng ý phương án trợ lý đề xuất', @NguoiTaoId, @Now);
            END

            UPDATE dbo.YeuCauThoiGianDeXuat
            SET NhanVienDongY = 1, NgayPhanHoi = @Now, GhiChu = ISNULL(@GhiChu, GhiChu), UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
            WHERE Id = @ThoiGianDeXuatId;

            UPDATE dbo.YeuCau SET TrangThai = 5, UpdatedAt = @Now, UpdatedBy = @NguoiTaoId WHERE Id = @YeuCauId;

            INSERT dbo.YeuCauLichSuTrangThai (ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, CreatedAt)
            VALUES (@Cn, @YeuCauId, 3, 5, @NguoiTaoId, N'NHANVIEN', N'Đồng ý phương án giờ do trợ lý đề xuất', @Now);
        END
        ELSE
        BEGIN
            UPDATE dbo.YeuCauThoiGianDeXuat
            SET NhanVienDongY = 0, NgayPhanHoi = @Now, GhiChu = ISNULL(@GhiChu, GhiChu), UpdatedAt = @Now, UpdatedBy = @NguoiTaoId
            WHERE Id = @ThoiGianDeXuatId;

            IF LTRIM(RTRIM(ISNULL(@GhiChu, N''))) <> N''
                INSERT dbo.YeuCauBinhLuan (ChiNhanhId, YeuCauId, UserId, NoiDung, ChiNoiBo, CreatedAt, CreatedBy)
                VALUES (@Cn, @YeuCauId, @NguoiTaoId, @GhiChu, 0, @Now, @NguoiTaoId);

            UPDATE dbo.YeuCau SET TrangThai = 1, UpdatedAt = @Now, UpdatedBy = @NguoiTaoId WHERE Id = @YeuCauId;

            INSERT dbo.YeuCauLichSuTrangThai (ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, CreatedAt)
            VALUES (@Cn, @YeuCauId, 3, 1, @NguoiTaoId, N'NHANVIEN', ISNULL(@GhiChu, N'Không đồng ý phương án đề xuất'), @Now);
        END

        COMMIT;

        SELECT yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe, @DongY AS DongY, @LichId AS LichTrinhId,
               t.UserId, t.UserId AS TroLyUserId, t.IsTroLyChinh
        FROM dbo.YeuCau yc
        JOIN dbo.TroLy t ON t.LanhDaoId = yc.LanhDaoId AND t.IsDeleted = 0 AND t.IsActived = 1
        WHERE yc.Id = @YeuCauId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 15. SP: Danh sách phản hồi của nhân viên (so sánh VaiTroThucHien không phân biệt hoa/thường)
CREATE OR ALTER PROCEDURE dbo.usp_PhanHoi_DanhSach
    @NguoiTaoId INT,
    @Page       INT = 1,
    @PageSize   INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 20;
    IF @PageSize > 100 SET @PageSize = 100;

    WITH PH AS (
        -- Chỉ đạo của lãnh đạo sau buổi trình
        SELECT CAST(1 AS TINYINT) AS Loai, yc.Id AS YeuCauId, yc.MaYeuCau, yc.TieuDe,
               yc.TrangThai AS TrangThaiYeuCau,
               CAST(NULL AS TINYINT) AS DenTrangThai, k.KetQua,
               CAST(k.ChiDaoCuaLanhDao AS NVARCHAR(MAX)) AS NoiDung,
               ul.TenNguoiDung AS NguoiPhanHoi,
               ISNULL(k.ThoiGianThucTe, k.CreatedAt) AS ThoiDiem
        FROM dbo.KetQuaTrinh k
        JOIN dbo.YeuCau yc ON yc.Id = k.YeuCauId
        JOIN dbo.LanhDao ld ON ld.Id = yc.LanhDaoId
        JOIN dbo.Users ul ON ul.UserId = ld.UserId
        WHERE yc.NguoiTaoId = @NguoiTaoId AND yc.IsDeleted = 0 AND yc.IsActived = 1
          AND k.IsDeleted = 0 AND k.IsActived = 1
          AND ISNULL(k.ChiDaoCuaLanhDao, N'') <> N''

        UNION ALL

        -- Phản hồi của trợ lý/lãnh đạo khi đổi trạng thái: đề xuất đổi lịch, cần bổ sung, đã duyệt, từ chối
        SELECT CAST(2 AS TINYINT), yc.Id, yc.MaYeuCau, yc.TieuDe, yc.TrangThai,
               h.DenTrangThai, CAST(NULL AS TINYINT),
               CAST(ISNULL(h.LyDo, h.GhiChu) AS NVARCHAR(MAX)),
               u.TenNguoiDung, h.CreatedAt
        FROM dbo.YeuCauLichSuTrangThai h
        JOIN dbo.YeuCau yc ON yc.Id = h.YeuCauId
        JOIN dbo.Users u ON u.UserId = h.NguoiThucHienId
        WHERE yc.NguoiTaoId = @NguoiTaoId AND yc.IsDeleted = 0 AND yc.IsActived = 1
          AND h.DenTrangThai IN (3, 4, 5, 8)
          AND UPPER(ISNULL(h.VaiTroThucHien, N'')) IN (N'TROLY', N'LANHDAO')
    )
    SELECT Loai, YeuCauId, MaYeuCau, TieuDe, TrangThaiYeuCau, DenTrangThai, KetQua,
           NoiDung, NguoiPhanHoi, ThoiDiem, COUNT(*) OVER() AS TongSo
    FROM PH
    ORDER BY ThoiDiem DESC, YeuCauId DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- 16. SP: Trợ lý xếp lịch (chuẩn hóa VaiTroThucHien = N'TROLY' + trả đúng LanhDaoUserId)
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
        @LanhDaoUserId  INT = 0,
        @TrangThaiCu    TINYINT,
        @MucUuTienCuId  INT;

    SELECT
        @ChiNhanhId    = yc.ChiNhanhId,
        @MaYeuCau      = yc.MaYeuCau,
        @TieuDe        = yc.TieuDe,
        @NguoiTaoId    = yc.NguoiTaoId,
        @LanhDaoUserId = ISNULL(ld.UserId, 0),
        @TrangThaiCu   = yc.TrangThai,
        @MucUuTienCuId = yc.MucUuTienId
    FROM dbo.YeuCau yc
    LEFT JOIN dbo.LanhDao ld ON ld.Id = yc.LanhDaoId
    WHERE yc.Id = @YeuCauId AND yc.LanhDaoId = @LanhDaoId AND yc.IsDeleted = 0;

    IF @MaYeuCau IS NULL
        THROW 50002, N'Không tìm thấy yêu cầu thuộc lãnh đạo bạn phụ trách.', 1;

    BEGIN TRAN;

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
        SET @TrangThaiMoi = 3;

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
        SET @TrangThaiMoi = 5;

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
        @ChiNhanhId, @YeuCauId, @TrangThaiCu, @TrangThaiMoi, @TroLyUserId, N'TROLY', @GhiChu, @Message, GETDATE()
    );

    INSERT INTO dbo.YeuCauXuLyLichSu (
        ChiNhanhId, YeuCauId, TroLyId, HanhDong, MucUuTienCuId, MucUuTienMoiId, LyDo, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @YeuCauId, @TroLyUserId, 3, @MucUuTienCuId, COALESCE(@MucUuTienId, @MucUuTienCuId), @Message, GETDATE()
    );

    COMMIT TRAN;

    SELECT
        @YeuCauId      AS YeuCauId,
        @LichTrinhId   AS LichTrinhId,
        @MaYeuCau      AS MaYeuCau,
        @TieuDe        AS TieuDe,
        @NguoiTaoId    AS NguoiTaoId,
        @LanhDaoUserId AS LanhDaoUserId,
        @CoXungDot     AS CoXungDot,
        @LaCapNhat     AS LaCapNhat,
        @Message       AS Message;
END
GO

-- 17. SP: Trợ lý cập nhật trạng thái lịch (chuẩn hóa VaiTroThucHien = N'TROLY', cập nhật NgayHoanTat cho 6/7/9/11)
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
        @ChiNhanhId    INT,
        @YeuCauId      INT,
        @MaYeuCau      NVARCHAR(30),
        @TieuDe        NVARCHAR(500),
        @NguoiTaoId    INT,
        @LanhDaoUserId INT = 0,
        @TrangThaiCu   TINYINT,
        @BatDau        DATETIME2(7),
        @KetThuc       DATETIME2(7);

    SELECT
        @ChiNhanhId    = yc.ChiNhanhId,
        @YeuCauId      = yc.Id,
        @MaYeuCau      = yc.MaYeuCau,
        @TieuDe        = yc.TieuDe,
        @NguoiTaoId    = yc.NguoiTaoId,
        @LanhDaoUserId = ISNULL(ld.UserId, 0),
        @TrangThaiCu   = yc.TrangThai,
        @BatDau        = lt.BatDau,
        @KetThuc       = lt.KetThuc
    FROM dbo.LichTrinh lt
    INNER JOIN dbo.YeuCau yc ON yc.Id = lt.YeuCauId AND yc.IsDeleted = 0
    LEFT JOIN dbo.LanhDao ld ON ld.Id = lt.LanhDaoId
    WHERE lt.Id = @LichTrinhId AND lt.LanhDaoId = @LanhDaoId AND lt.IsDeleted = 0;

    IF @YeuCauId IS NULL
        RETURN;

    DECLARE @TrangThaiLich TINYINT = CASE @TrangThaiYeuCau
        WHEN 6  THEN 2
        WHEN 7  THEN 2
        WHEN 9  THEN 3
        WHEN 10 THEN 4
        WHEN 11 THEN 5
        ELSE 1
    END;

    DECLARE @HanhDong TINYINT = CASE @TrangThaiYeuCau
        WHEN 6  THEN 5
        WHEN 7  THEN 5
        WHEN 9  THEN 3
        WHEN 10 THEN 4
        WHEN 11 THEN 6
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
        NgayHoanTat = CASE WHEN @TrangThaiYeuCau IN (6, 7, 9, 11) THEN GETDATE() ELSE NgayHoanTat END,
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
        @ChiNhanhId, @YeuCauId, @TrangThaiCu, @TrangThaiYeuCau, @TroLyUserId, N'TROLY', @LyDo, N'Cập nhật trạng thái buổi trình', GETDATE()
    );

    COMMIT TRAN;

    SELECT
        @YeuCauId      AS YeuCauId,
        @LichTrinhId   AS LichTrinhId,
        @MaYeuCau      AS MaYeuCau,
        @TieuDe        AS TieuDe,
        @NguoiTaoId    AS NguoiTaoId,
        @LanhDaoUserId AS LanhDaoUserId,
        CAST(0 AS BIT) AS CoXungDot,
        CAST(1 AS BIT) AS LaCapNhat,
        N'Đã cập nhật trạng thái lịch trình thành công.' AS Message;
END
GO

-- 18. SP: Lãnh đạo cập nhật phản hồi (chuẩn hóa VaiTroThucHien = N'LANHDAO', cập nhật NgayHoanTat cho 6/7/11)
CREATE OR ALTER PROCEDURE dbo.usp_LanhDao_CapNhatPhanHoi
    @LanhDaoId        INT,
    @LanhDaoUserId    INT,
    @LichTrinhId      INT,
    @KetQua           TINYINT, -- 1 = Đã trình, 2 = Vắng, 3 = Hoãn
    @HoanThanh        BIT = 0,
    @ChiDaoCuaLanhDao NVARCHAR(MAX) = NULL,
    @GhiChuLanhDao    NVARCHAR(MAX) = NULL,
    @GhiChu           NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @ChiNhanhId  INT,
        @YeuCauId    INT,
        @MaYeuCau    NVARCHAR(30),
        @TieuDe      NVARCHAR(500),
        @NguoiTaoId  INT,
        @TrangThaiCu TINYINT;

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
        WHEN 1 THEN 2
        WHEN 2 THEN 5
        WHEN 3 THEN 4
        ELSE 2
    END;

    DECLARE @TrangThaiYeuCau TINYINT = CASE
        WHEN @KetQua = 1 AND @HoanThanh = 1 THEN 7
        WHEN @KetQua = 1 THEN 6
        WHEN @KetQua = 2 THEN 11
        WHEN @KetQua = 3 THEN 10
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
        NgayHoanTat = CASE WHEN @TrangThaiYeuCau IN (6, 7, 11) THEN GETDATE() ELSE NgayHoanTat END,
        UpdatedAt = GETDATE(),
        UpdatedBy = @LanhDaoUserId
    WHERE Id = @YeuCauId;

    INSERT INTO dbo.YeuCauLichSuTrangThai (
        ChiNhanhId, YeuCauId, TuTrangThai, DenTrangThai, NguoiThucHienId, VaiTroThucHien, LyDo, GhiChu, CreatedAt
    )
    VALUES (
        @ChiNhanhId, @YeuCauId, @TrangThaiCu, @TrangThaiYeuCau, @LanhDaoUserId, N'LANHDAO',
        COALESCE(NULLIF(LTRIM(RTRIM(@ChiDaoCuaLanhDao)), N''), NULLIF(LTRIM(RTRIM(@GhiChu)), N''), N'Lãnh đạo cập nhật phản hồi sau trình'),
        @GhiChu, GETDATE()
    );

    COMMIT TRAN;

    SELECT
        @KetQuaTrinhId    AS KetQuaTrinhId,
        @LichTrinhId      AS LichTrinhId,
        @YeuCauId         AS YeuCauId,
        @MaYeuCau         AS MaYeuCau,
        @TieuDe           AS TieuDe,
        @NguoiTaoId       AS NguoiTaoId,
        CAST(NULL AS INT) AS TroLyUserId,
        N''               AS TenLanhDao,
        N'Đã lưu phản hồi của lãnh đạo thành công.' AS Message;
END
GO

-- 19. SP: Báo cáo yêu cầu (lọc IsActived = 1, loại lịch đã hủy, định dạng P{Ma} - {Ten}, đồng bộ nhóm trạng thái với Dashboard)
CREATE OR ALTER PROCEDURE dbo.usp_Report_BaoCaoYeuCau
    @TuNgay        DATE,
    @DenNgay       DATE,
    @ChiNhanhId    INT = 0,
    @NhomTrangThai TINYINT = 0 -- 0 = Tất cả, 1 = Đang xử lý, 2 = Đã hoàn thành, 3 = Từ chối/Hủy/Vắng
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
        CASE WHEN ut.Id IS NOT NULL THEN CONCAT(N'P', ut.Ma, N' - ', ut.Ten) ELSE N'' END AS MucUuTien,
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
        WHERE l.YeuCauId = yc.Id AND l.IsDeleted = 0 AND l.TrangThai <> 3
        ORDER BY l.Id DESC
    ) lt
    OUTER APPLY (
        SELECT TOP 1 k.ChiDaoCuaLanhDao
        FROM dbo.KetQuaTrinh k
        WHERE k.YeuCauId = yc.Id AND k.IsDeleted = 0
        ORDER BY k.Id DESC
    ) kq
    WHERE yc.IsDeleted = 0
      AND yc.IsActived = 1
      AND (@ChiNhanhId <= 0 OR yc.ChiNhanhId = @ChiNhanhId OR yc.ChiNhanhNguoiTaoId = @ChiNhanhId)
      AND COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt) >= CAST(@TuNgay AS DATETIME2(7))
      AND COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt) < @EndExclusive
      AND (
          @NhomTrangThai = 0
          OR (@NhomTrangThai = 1 AND yc.TrangThai IN (0, 1, 2, 3, 4, 5, 10))
          OR (@NhomTrangThai = 2 AND yc.TrangThai IN (6, 7))
          OR (@NhomTrangThai = 3 AND yc.TrangThai IN (8, 9, 11))
      )
    ORDER BY COALESCE(lt.BatDau, yc.NgayGui, yc.CreatedAt) DESC, yc.Id DESC;
END
GO


