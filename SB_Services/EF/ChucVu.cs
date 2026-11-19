namespace SB_Services.EF
{
    public class ChucVu
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public string MaChucVu { get; set; } = null!;
        public string TenChucVu { get; set; } = null!;
        public int CapBac { get; set; }                 // Số càng nhỏ cấp càng cao
    }
}
