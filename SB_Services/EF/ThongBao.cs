namespace SB_Services.EF
{
    public class ThongBao
    {
        public int Id { get; set; }
        public string? NoiDung { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public int ChiNhanhId { get; set; }
    }
    public class DocThongBao
    {
        public int ThongBaoId { get; set; }
        public int UserId { get; set; }
    }
    public class ThongBaoDTO : ThongBao
    {
        public bool IsRead { get; set; } // Trạng thái: True (Đã đọc), False (Chưa đọc)
    }
}
