namespace SB_Services.EF
{
    public class PhongBan
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int? ParentId { get; set; } // Bộ phận nhỏ thuộc phòng ban, null khi là phòng ban chính
        public string MaPhongBan { get; set; } = null!;
        public string TenPhongBan { get; set; } = null!;
        public bool IsDeleted { get; set; }
    }
}
