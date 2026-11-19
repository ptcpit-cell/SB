namespace SB_Services.EF
{
    public class ChiNhanh
    {
        public int ChiNhanhId { get; set; }
        public int? ParentId { get; set; }
        public byte ChiNhanhType { get; set; }          // 1 = Headquarter, 2 = Agent, 3 = Store
        public string MaChiNhanh { get; set; } = null!;
        public string TenChiNhanh { get; set; } = null!;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
    }
}
