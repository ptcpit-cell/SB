namespace SB_Services.EF
{
    public abstract class BaseEntity
    {
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
        public DateTime CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }
    }

    // Dùng cho các bảng lịch sử (chỉ thêm, không sửa, không xóa)
    public abstract class HistoryEntity
    {
        public int ChiNhanhId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
