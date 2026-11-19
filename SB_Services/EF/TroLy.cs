namespace SB_Services.EF
{
    public class TroLy
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int UserId { get; set; }
        public int LanhDaoId { get; set; }
        public bool IsTroLyChinh { get; set; }
        public bool ChoPhepGhiDeXungDot { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }
}
