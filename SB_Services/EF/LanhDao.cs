namespace SB_Services.EF
{
    public class LanhDao
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int UserId { get; set; }
        public int CapDo { get; set; }
        public int ThuTuHienThi { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }

    // Quy tắc xếp lịch riêng cho từng lãnh đạo
    public class LanhDaoCauHinh
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LanhDaoId { get; set; }
        public TimeSpan GioBatDau { get; set; } = new TimeSpan(8, 0, 0);
        public TimeSpan GioKetThuc { get; set; } = new TimeSpan(17, 0, 0);
        public TimeSpan? NghiTruaTu { get; set; } = new TimeSpan(12, 0, 0);
        public TimeSpan? NghiTruaDen { get; set; } = new TimeSpan(13, 30, 0);
        public int ThoiGianDemPhut { get; set; } = 10;
        public int GioiHanPhutMoiNgay { get; set; } = 180;     // Ngưỡng quá tải
        public int SoNgayLamViecMask { get; set; } = 62;       // Bit 0 = CN ... bit 6 = T7; 62 = T2..T6
        public bool ChoNhanVienXemLichTrongBan { get; set; } = true;
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }
    // Ủy quyền khi lãnh đạo vắng
    public class LanhDaoUyQuyen
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LanhDaoId { get; set; }                     // Người ủy quyền
        public int NguoiNhanLanhDaoId { get; set; }            // Người được ủy quyền
        public DateTime TuNgay { get; set; }
        public DateTime DenNgay { get; set; }
        public string? LyDo { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }
}
