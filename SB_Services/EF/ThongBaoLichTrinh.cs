namespace SB_Services.EF
{
    public class ThongBaoLichTrinh : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int NguoiNhanId { get; set; }
        public string TieuDe { get; set; } = null!;
        public string NoiDung { get; set; } = null!;
        public KenhThongBao Kenh { get; set; } = KenhThongBao.TrongApp;
        public string? LoaiSuKien { get; set; }                // YEUCAU_MOI, DA_DUYET, DOI_LICH...
        public int? YeuCauId { get; set; }
        public int? LichTrinhId { get; set; }
        public bool DaDoc { get; set; }
        public DateTime? NgayDoc { get; set; }
        public DateTime? NgayGuiDuKien { get; set; }
        public DateTime? NgayGuiThucTe { get; set; }
        public byte TrangThaiGui { get; set; }                 // 0 Chờ, 1 Đã gửi, 2 Lỗi
        public int SoLanThu { get; set; }
        public string? LoiGui { get; set; }
    }

    public class NhacLich : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LichTrinhId { get; set; }
        public int NguoiNhanId { get; set; }
        public int TruocPhut { get; set; }                     // 1440 = 1 ngày, 30 = 30 phút
        public DateTime ThoiDiemNhac { get; set; }
        public bool DaGui { get; set; }
        public DateTime? NgayGui { get; set; }
    }
}
