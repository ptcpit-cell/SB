using System.ComponentModel.DataAnnotations;

namespace SB_Services.EF
{
    public class LichTrinh : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int YeuCauId { get; set; }
        public int LanhDaoId { get; set; }
        public TimeSpan BatDau { get; set; }
        public TimeSpan KetThuc { get; set; }
        public string? DiaDiem { get; set; }
        public TrangThaiLichTrinh TrangThai { get; set; } = TrangThaiLichTrinh.DaXep;
        public int? ThuTuTrongNgay { get; set; }
        public int? NguoiChotId { get; set; }
        public DateTime? NgayChot { get; set; }
        public bool DaGhiDeXungDot { get; set; }
        public string? LyDoGhiDe { get; set; }
        public string? GhiChuLanhDao { get; set; }

        [Timestamp]
        public byte[] RowVersion { get; set; } = null!;
    }

    public class SuKienLanhDao : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LanhDaoId { get; set; }
        public LoaiSuKien Loai { get; set; }
        public string TieuDe { get; set; } = null!;
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public bool CaNgay { get; set; }
        public bool LaCung { get; set; } = true;               // Cứng = không dời được
        public bool LaRiengTu { get; set; }
        public string? DiaDiem { get; set; }
        public string? GhiChu { get; set; }
        public string? ExternalId { get; set; }
        public string? ExternalSource { get; set; }
    }
}
