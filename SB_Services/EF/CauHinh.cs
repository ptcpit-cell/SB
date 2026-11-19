namespace SB_Services.EF
{
    // Cấu hình key-value (ChiNhanhId = null: mặc định toàn hệ thống)
    public class CauHinh : BaseEntity
    {
        public int Id { get; set; }
        public int? ChiNhanhId { get; set; }
        public string Khoa { get; set; } = null!;
        public string GiaTri { get; set; } = null!;
        public string? MoTa { get; set; }
    }
}
