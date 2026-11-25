namespace SB_Services.DTO
{
    public class LanhDaoInfoDto
    {
        public int LanhDaoId { get; set; }
        public int UserId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string? TenChucVu { get; set; }
        public string? TenChiNhanh { get; set; }
        public string? PhongLamViec { get; set; }
        public int CapDo { get; set; }
        public int? TroLyUserId { get; set; }
        public string? TenTroLy { get; set; }
    }

    public class LanhDaoCauHinhDto
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LanhDaoId { get; set; }
        public string GioBatDau { get; set; } = "08:00:00";
        public string GioKetThuc { get; set; } = "17:00:00";
        public string? NghiTruaTu { get; set; } = "12:00:00";
        public string? NghiTruaDen { get; set; } = "13:30:00";
        public int ThoiGianDemPhut { get; set; } = 10;
        public int GioiHanPhutMoiNgay { get; set; } = 180;
        public int SoNgayLamViecMask { get; set; } = 62;
        public bool ChoNhanVienXemLichTrongBan { get; set; } = true;
    }

    public class MucUuTienItemDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Ten { get; set; } = string.Empty;
        public int TrongSo { get; set; }
        public string MauHienThi { get; set; } = "#2563eb";
    }

    public class TroLyYeuCauItemDto
    {
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = string.Empty;
        public string TieuDe { get; set; } = string.Empty;
        public string? TomTat { get; set; }
        public string TenLoai { get; set; } = string.Empty;
        public byte TrangThai { get; set; }
        public byte MucKhan { get; set; }
        public string? LyDoKhan { get; set; }
        public int? MucUuTienId { get; set; }
        public string? TenMucUuTien { get; set; }
        public string? MaMucUuTien { get; set; }
        public string? MauMucUuTien { get; set; }
        public int TrongSoUuTien { get; set; }
        public int ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }
        public bool LaBaoMat { get; set; }
        public DateTime? NgayGui { get; set; }
        public string TenNguoiTrinh { get; set; } = string.Empty;
        public string PhongBanNguoiTrinh { get; set; } = string.Empty;
        public string ChucVuNguoiTrinh { get; set; } = string.Empty;
        public int SoTep { get; set; }
        public int SoThamDu { get; set; }
    }

    public class LichTrinhNguoiThamDuDto
    {
        public int Id { get; set; }
        public int YeuCauId { get; set; }
        public int? UserId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string? DonViNgoai { get; set; }
        public string? VaiTro { get; set; }
    }

    public class LichTrinhTepDto
    {
        public int Id { get; set; }
        public int YeuCauId { get; set; }
        public string TenFile { get; set; } = string.Empty;
        public string DuongDan { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        public long KichThuoc { get; set; }
    }

    public class LichTrinhKetQuaDto
    {
        public int Id { get; set; }
        public int LichTrinhId { get; set; }
        public byte KetQua { get; set; }
        public DateTime? ThoiGianThucTe { get; set; }
        public string? ChiDaoCuaLanhDao { get; set; }
        public string? GhiChu { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class LichTrinhCongViecDto
    {
        public int Id { get; set; }
        public int KetQuaTrinhId { get; set; }
        public string NoiDung { get; set; } = string.Empty;
        public int? NguoiPhuTrachId { get; set; }
        public DateTime? HanXuLy { get; set; }
        public byte TrangThai { get; set; }
    }

    public class LichTrinhViewDto
    {
        public int LichTrinhId { get; set; }
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = string.Empty;
        public string TieuDe { get; set; } = string.Empty;
        public string? TomTat { get; set; }
        public string TenLoai { get; set; } = string.Empty;
        public byte MucKhan { get; set; }
        public string? LyDoKhan { get; set; }
        public int? MucUuTienId { get; set; }
        public string? TenMucUuTien { get; set; }
        public string? MaMucUuTien { get; set; }
        public string? MauMucUuTien { get; set; }
        public bool LaBaoMat { get; set; }
        public int ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }
        public byte TrangThaiYeuCau { get; set; }
        public byte TrangThaiLich { get; set; }
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public string? DiaDiem { get; set; }
        public bool DaGhiDeXungDot { get; set; }
        public string? LyDoGhiDe { get; set; }
        public int NguoiTrinhId { get; set; }
        public string TenNguoiTrinh { get; set; } = string.Empty;
        public string PhongBanNguoiTrinh { get; set; } = string.Empty;
        public string ChucVuNguoiTrinh { get; set; } = string.Empty;
        public string ChiNhanhNguoiTrinh { get; set; } = string.Empty;
        public List<LichTrinhNguoiThamDuDto> NguoiThamDus { get; set; } = new();
        public List<LichTrinhTepDto> Teps { get; set; } = new();
        public LichTrinhKetQuaDto? KetQua { get; set; }
        public List<LichTrinhCongViecDto> CongViecs { get; set; } = new();
        public string? GhiChuLanhDao { get; set; }
    }

    public class SuKienLanhDaoViewDto
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int LanhDaoId { get; set; }
        public byte Loai { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public bool CaNgay { get; set; }
        public bool LaCung { get; set; }
        public bool LaRiengTu { get; set; }
        public string? DiaDiem { get; set; }
        public string? GhiChu { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public int? NotifyTargetUserId { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public string? NotifyActorName { get; set; }
    }

    public class TroLyThongKeDto
    {
        public int ChoXuLy { get; set; }
        public int Gap { get; set; }
        public int LichHomNay { get; set; }
        public int ChoPhanHoi { get; set; }
        public int TongPhutHomNay { get; set; }
    }

    public class TroLyDashboardDto
    {
        public string Ngay { get; set; } = string.Empty;
        public LanhDaoInfoDto LanhDao { get; set; } = new();
        public LanhDaoCauHinhDto CauHinh { get; set; } = new();
        public List<MucUuTienItemDto> MucUuTiens { get; set; } = new();
        public List<TroLyYeuCauItemDto> HangCho { get; set; } = new();
        public List<LichTrinhViewDto> LichNgay { get; set; } = new();
        public List<SuKienLanhDaoViewDto> SuKienNgay { get; set; } = new();
        public TroLyThongKeDto ThongKe { get; set; } = new();
    }

    public class WeekScheduleResponseDto
    {
        public string TuNgay { get; set; } = string.Empty;
        public string DenNgay { get; set; } = string.Empty;
        public LanhDaoInfoDto LanhDao { get; set; } = new();
        public LanhDaoCauHinhDto CauHinh { get; set; } = new();
        public List<LichTrinhViewDto> LichTrinhs { get; set; } = new();
        public List<SuKienLanhDaoViewDto> SuKiens { get; set; } = new();
    }

    public class TiepNhanRequest
    {
        public int? MucUuTienId { get; set; }
    }

    public class CapNhatUuTienRequest
    {
        public int? MucUuTienId { get; set; }
    }

    public class XepLichRequest
    {
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public string? DiaDiem { get; set; }
        public int? MucUuTienId { get; set; }
        public string? GhiChu { get; set; }
        public bool YeuCauXacNhanNV { get; set; }
    }

    public class YeuCauBoSungRequest
    {
        public string NoiDung { get; set; } = string.Empty;
    }

    public class TuChoiYeuCauRequest
    {
        public string LyDo { get; set; } = string.Empty;
    }

    public class CapNhatTrangThaiLichRequest
    {
        public byte TrangThaiYeuCau { get; set; }
        public string? LyDo { get; set; }
    }

    public class SuKienLanhDaoInput
    {
        public byte Loai { get; set; } = 1;
        public string TieuDe { get; set; } = string.Empty;
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public bool CaNgay { get; set; }
        public bool LaCung { get; set; } = true;
        public bool LaRiengTu { get; set; }
        public string? DiaDiem { get; set; }
        public string? GhiChu { get; set; }
    }

    public class TroLyActionResultDto
    {
        public int YeuCauId { get; set; }
        public int? LichTrinhId { get; set; }
        public string MaYeuCau { get; set; } = string.Empty;
        public string TieuDe { get; set; } = string.Empty;
        public int NguoiTaoId { get; set; }
        public int LanhDaoUserId { get; set; }
        public bool CoXungDot { get; set; }
        public bool LaCapNhat { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
