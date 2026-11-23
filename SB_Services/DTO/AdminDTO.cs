namespace SB_Services.DTO
{
    public class AdminTongQuanDto
    {
        public int TongYeuCau { get; set; }
        public int ChoXuLy { get; set; }
        public int DaDuyetLich { get; set; }
        public int DaHoanThanh { get; set; }
        public int TuChoiHuy { get; set; }
        public int TongLanhDao { get; set; }
        public int BuoiTrinhHomNay { get; set; }
        public int TongNguoiDung { get; set; }
    }

    public class AdminTheoTrangThaiDto
    {
        public byte TrangThai { get; set; }
        public string TenTrangThai { get; set; } = string.Empty;
        public int SoLuong { get; set; }
    }

    public class AdminTheoChiNhanhDto
    {
        public int ChiNhanhId { get; set; }
        public string MaChiNhanh { get; set; } = string.Empty;
        public string TenChiNhanh { get; set; } = string.Empty;
        public int TongYeuCau { get; set; }
        public int DangXuLy { get; set; }
        public int HoanThanh { get; set; }
        public int TuChoiHuy { get; set; }
    }

    public class AdminLichHomNayDto
    {
        public int LichTrinhId { get; set; }
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = string.Empty;
        public string TieuDe { get; set; } = string.Empty;
        public string TenLanhDao { get; set; } = string.Empty;
        public string TenNguoiTrinh { get; set; } = string.Empty;
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public byte TrangThaiLich { get; set; }
    }

    public class AdminDashboardDto
    {
        public AdminTongQuanDto TongQuan { get; set; } = new();
        public List<AdminTheoTrangThaiDto> TheoTrangThai { get; set; } = new();
        public List<AdminTheoChiNhanhDto> TheoChiNhanh { get; set; } = new();
        public List<AdminLichHomNayDto> LichHomNay { get; set; } = new();
    }

    public class AdminLanhDaoRowDto
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string TenChucVu { get; set; } = string.Empty;
        public string TenPhongBan { get; set; } = string.Empty;
        public int CapDo { get; set; }
        public int ThuTuHienThi { get; set; }
        public bool IsActived { get; set; }
        public int? TroLyUserId { get; set; }
        public string TenTroLy { get; set; } = string.Empty;
        public string UserNameTroLy { get; set; } = string.Empty;
    }

    public class AdminUserOptionDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string TenNguoiDung { get; set; } = string.Empty;
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } = string.Empty;
        public string TenChucVu { get; set; } = string.Empty;
        public string TenPhongBan { get; set; } = string.Empty;
        public List<string> RoleNames { get; set; } = new();
    }

    public class AdminLanhDaoListResponseDto
    {
        public List<AdminLanhDaoRowDto> LanhDaos { get; set; } = new();
        public List<AdminUserOptionDto> Users { get; set; } = new();
    }

    public class SaveLanhDaoRequest
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int? ChiNhanhId { get; set; }
        public int CapDo { get; set; } = 1;
        public int ThuTuHienThi { get; set; } = 1;
        public bool IsActived { get; set; } = true;
        public int? TroLyUserId { get; set; }
    }

    public class AdminLoaiYeuCauRowDto
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public string MaLoai { get; set; } = string.Empty;
        public string TenLoai { get; set; } = string.Empty;
        public int ThoiLuongMacDinhPhut { get; set; }
        public bool IsActived { get; set; }
    }

    public class SaveLoaiYeuCauRequest
    {
        public int Id { get; set; }
        public int? ChiNhanhId { get; set; }
        public string MaLoai { get; set; } = string.Empty;
        public string TenLoai { get; set; } = string.Empty;
        public int ThoiLuongMacDinhPhut { get; set; } = 30;
        public bool IsActived { get; set; } = true;
    }

    public class AdminMucUuTienRowDto
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Ten { get; set; } = string.Empty;
        public int TrongSo { get; set; }
        public string MauHienThi { get; set; } = "#2563eb";
        public bool IsActived { get; set; }
    }

    public class SaveMucUuTienRequest
    {
        public int Id { get; set; }
        public int? ChiNhanhId { get; set; }
        public string Code { get; set; } = "P1";
        public string Ten { get; set; } = string.Empty;
        public int TrongSo { get; set; } = 100;
        public string MauHienThi { get; set; } = "#2563eb";
        public bool IsActived { get; set; } = true;
    }
}
