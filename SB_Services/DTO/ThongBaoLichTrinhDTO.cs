namespace SB_Services.DTO
{
    public class ThongBaoLichTrinhDto
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int NguoiNhanId { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public string NoiDung { get; set; } = string.Empty;
        public string LoaiSuKien { get; set; } = string.Empty;
        public int? YeuCauId { get; set; }
        public int? LichTrinhId { get; set; }
        public string? RouteUrl { get; set; }
        public bool DaDoc { get; set; }
        public DateTime? NgayDoc { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ThongBaoLichTrinhCreateInput
    {
        public int ChiNhanhId { get; set; }
        public int NguoiNhanId { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public string NoiDung { get; set; } = string.Empty;
        public string LoaiSuKien { get; set; } = string.Empty;
        public int? YeuCauId { get; set; }
        public int? LichTrinhId { get; set; }
        public string? RouteUrl { get; set; }
        public int CreatedBy { get; set; }
    }
}
