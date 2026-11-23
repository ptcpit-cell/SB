namespace SB_Services.DTO
{
    public class BaoCaoYeuCauQuery
    {
        public DateTime? TuNgay { get; set; }
        public DateTime? DenNgay { get; set; }
        public int ChiNhanhId { get; set; }
        public byte NhomTrangThai { get; set; } = 0; // 0 = Tất cả, 1 = Đang xử lý, 2 = Đã hoàn thành, 3 = Từ chối/Hủy
    }

    public class BaoCaoYeuCauRowDto
    {
        public string RefDate { get; set; } = string.Empty;
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = string.Empty;
        public string TieuDe { get; set; } = string.Empty;
        public string TomTat { get; set; } = string.Empty;
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } = string.Empty;
        public string TenNguoiTrinh { get; set; } = string.Empty;
        public string TenPhongBan { get; set; } = string.Empty;
        public string TenChucVu { get; set; } = string.Empty;
        public string TenLanhDao { get; set; } = string.Empty;
        public string TenLoai { get; set; } = string.Empty;
        public string MucKhan { get; set; } = string.Empty;
        public string MucUuTien { get; set; } = string.Empty;
        public int ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }
        public DateTime? NgayGui { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LichBatDau { get; set; }
        public DateTime? LichKetThuc { get; set; }
        public byte TrangThai { get; set; }
        public string TenTrangThai { get; set; } = string.Empty;
        public string PhanHoiLanhDao { get; set; } = string.Empty;
        public string LyDoTuChoiHuy { get; set; } = string.Empty;
    }

    public class BaoCaoYeuCauResponseDto
    {
        public string TuNgay { get; set; } = string.Empty;
        public string DenNgay { get; set; } = string.Empty;
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } = string.Empty;
        public int TongSo { get; set; }
        public List<BaoCaoYeuCauRowDto> Rows { get; set; } = new();
    }
}
