namespace SB_Services.EF
{
    public class LichSu { }
    public class YeuCauLichSuTrangThai : HistoryEntity
    {
        public int Id { get; set; }
        public int YeuCauId { get; set; }
        public TrangThaiYeuCau? TuTrangThai { get; set; }
        public TrangThaiYeuCau DenTrangThai { get; set; }
        public int NguoiThucHienId { get; set; }
        public string? VaiTroThucHien { get; set; }            // NHANVIEN / TROLY / LANHDAO / HETHONG
        public string? LyDo { get; set; }
        public string? GhiChu { get; set; }
    }

    public class LichTrinhLichSu : HistoryEntity
    {
        public int Id { get; set; }
        public int LichTrinhId { get; set; }
        public int YeuCauId { get; set; }
        public int LanhDaoId { get; set; }
        public HanhDongLichTrinh HanhDong { get; set; }
        public DateTime? BatDauCu { get; set; }
        public DateTime? KetThucCu { get; set; }
        public DateTime? BatDauMoi { get; set; }
        public DateTime? KetThucMoi { get; set; }
        public string? LyDo { get; set; }
        public int NguoiThucHienId { get; set; }
    }

    public class YeuCauXuLyLichSu : HistoryEntity
    {
        public int Id { get; set; }
        public int YeuCauId { get; set; }
        public int TroLyId { get; set; }
        public byte HanhDong { get; set; }                     // 1 Nhận, 2 Chốt ưu tiên, 3 Đề xuất giờ, 4 Gộp, 5 Chuyển lãnh đạo, 6 Yêu cầu bổ sung
        public int? MucUuTienCuId { get; set; }
        public int? MucUuTienMoiId { get; set; }
        public int? GopVaoYeuCauId { get; set; }
        public int? ChuyenSangLanhDaoId { get; set; }
        public string? CanhBaoXungDotJson { get; set; }
        public string? LyDo { get; set; }
    }

    public class NhatKyHoatDong : HistoryEntity
    {
        public long Id { get; set; }             // bigint identity
        public int? UserId { get; set; }
        public LoaiHanhDongNhatKy HanhDong { get; set; }
        public string TenBang { get; set; } = null!;
        public string KhoaBanGhi { get; set; } = null!;
        public string? TruongThayDoi { get; set; }
        public string? GiaTriCu { get; set; }                  // JSON
        public string? GiaTriMoi { get; set; }                 // JSON
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
    }
}
