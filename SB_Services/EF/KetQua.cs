namespace SB_Services.EF
{
    public class KetQuaTrinh
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LichTrinhId { get; set; }
        public int YeuCauId { get; set; }
        public byte KetQua { get; set; }                       // 1 = Đã trình, 2 = Không trình được, 3 = Hoãn
        public DateTime? ThoiGianThucTe { get; set; }
        public string? ChiDaoCuaLanhDao { get; set; }
        public string? GhiChu { get; set; }
        public int NguoiGhiNhanId { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }

    public class CongViecSauTrinh
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int KetQuaTrinhId { get; set; }
        public string NoiDung { get; set; } = null!;
        public int? NguoiPhuTrachId { get; set; }
        public DateTime? HanXuLy { get; set; }
        public byte TrangThai { get; set; } = 1;               // 1 = Chưa làm, 2 = Đang làm, 3 = Xong
        public DateTime? NgayHoanThanh { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }
}
