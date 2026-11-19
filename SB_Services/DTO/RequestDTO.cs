namespace SB_Services.DTO
{
    public class RequestDTO { }
    // ===== Request (nhận từ Angular) =====
    public class TaoYeuCauRequest
    {
        public int LanhDaoId { get; set; }                  // thay cho LanhDaoIds
        public int LoaiYeuCauId { get; set; }
        public string TieuDe { get; set; } = null!;
        public string? TomTat { get; set; }
        public byte MucKhan { get; set; } = 1;
        public string? LyDoKhan { get; set; }
        public int? ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }              // chỉ ngày, SP tự đưa về 23:59:59
        public bool LaBaoMat { get; set; }
        public bool GuiNgay { get; set; } = true;
        public List<NguoiThamDuInput> NguoiThamDus { get; set; } = new();
        public List<TepDinhKemInput> TepDinhKems { get; set; } = new();
    }

    // SuaYeuCauRequest: chỉ xóa dòng ThoiGians

    public class ThoiGianDeXuatInput
    {
        public DateTime BatDau { get; set; }
        public DateTime? KetThuc { get; set; }
        public int ThuTu { get; set; }
    }

    public class NguoiThamDuInput
    {
        public int? UserId { get; set; }
        public string? HoTenNgoai { get; set; }
        public string? DonViNgoai { get; set; }
        public string? VaiTro { get; set; }
    }

    public class TepDinhKemInput
    {
        public string TenFile { get; set; } = null!;
        public string DuongDan { get; set; } = null!;
        public string? ContentType { get; set; }
        public long KichThuoc { get; set; }
        public string? Checksum { get; set; }
    }

    public class YeuCauQuery
    {
        public byte NhomTrangThai { get; set; }
        public byte? TrangThai { get; set; }
        public int? LanhDaoId { get; set; }
        public DateTime? TuNgay { get; set; }
        public DateTime? DenNgay { get; set; }
        public string? TuKhoa { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class BoSungRequest
    {
        public string NoiDung { get; set; } = null!;
        public string? TomTat { get; set; }
        public List<TepDinhKemInput> TepDinhKems { get; set; } = new();
    }

    public class PhanHoiDeXuatRequest
    {
        public int ThoiGianDeXuatId { get; set; }
        public bool DongY { get; set; }
        public string? GhiChu { get; set; }
    }
    public class SuaYeuCauRequest
    {
        public int LoaiYeuCauId { get; set; }
        public string? TomTat { get; set; }
        public byte MucKhan { get; set; } = 1;
        public string? LyDoKhan { get; set; }
        public int ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }
        public bool LaBaoMat { get; set; }
        public bool GuiNgay { get; set; }
        public List<NguoiThamDuInput> NguoiThamDus { get; set; } = new();
        public List<TepDinhKemInput> TepDinhKems { get; set; } = new();
    }
    // ===== Kết quả SP ghi (để đẩy SignalR sau khi commit) =====
    public class YeuCauMoiDto
    {
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public int LanhDaoId { get; set; }
        public int ChiNhanhId { get; set; }
        public int? NhomYeuCauId { get; set; }
        public byte TrangThai { get; set; }
    }

    public class TroLyCanBaoDto
    {
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public int LanhDaoId { get; set; }
        public int UserId { get; set; }
        public bool IsTroLyChinh { get; set; }
    }

    // Dùng chung cho Gui / BoSung / PhanHoiDeXuat (các cột không có trong SP sẽ để mặc định)
    public class NguoiCanBaoDto
    {
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public string? TieuDe { get; set; }
        public int LanhDaoId { get; set; }
        public int TroLyUserId { get; set; }
        public bool IsTroLyChinh { get; set; }
        public int? TroLyXuLyId { get; set; }      // chỉ có ở BoSung
        public bool? DongY { get; set; }           // chỉ có ở PhanHoiDeXuat
        public int? LichTrinhId { get; set; }      // chỉ có ở PhanHoiDeXuat
    }

    public class HuyYeuCauNotifyDto
    {
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public string TieuDe { get; set; } = null!;
        public bool CoLich { get; set; }
        public int TroLyUserId { get; set; }
        public int LanhDaoUserId { get; set; }
    }

    public class TaoYeuCauResult
    {
        public List<YeuCauMoiDto> DaTao { get; set; } = new();
        public List<TroLyCanBaoDto> TroLyCanBao { get; set; } = new();
    }

    // ===== Form tạo yêu cầu =====
    public class LanhDaoChonDto
    {
        public int LanhDaoId { get; set; }
        public int ChiNhanhId { get; set; }
        public string TenChiNhanh { get; set; } = null!;
        public string HoTen { get; set; } = null!;
        public string? TenChucVu { get; set; }
        public int CapDo { get; set; }
        public string? PhongLamViec { get; set; }
        public bool ChoXemLich { get; set; }
    }

    public class LichLamViecDto
    {
        public TimeSpan GioBatDau { get; set; }
        public TimeSpan GioKetThuc { get; set; }
        public TimeSpan? NghiTruaTu { get; set; }
        public TimeSpan? NghiTruaDen { get; set; }
        public int SoNgayLamViecMask { get; set; }
        public bool ChoXemLich { get; set; }
    }

    public class KhoangBanDto
    {
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public bool CaNgay { get; set; }
    }

    public class LichBanResult
    {
        public LichLamViecDto GioLamViec { get; set; } = null!;
        public List<KhoangBanDto> KhoangBan { get; set; } = new();
    }

    // ===== Danh sách, thống kê =====
    public class YeuCauItemDto
    {
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public string TieuDe { get; set; } = null!;
        public byte TrangThai { get; set; }
        public byte MucKhan { get; set; }
        public string TenLoai { get; set; } = null!;
        public int LanhDaoId { get; set; }
        public string TenLanhDao { get; set; } = null!;
        public string? MaNhom { get; set; }
        public DateTime? NgayGui { get; set; }
        public DateTime? NgayHoanTat { get; set; }
        public DateTime? HanChot { get; set; }
        public string? LyDoTuChoiHuy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LichBatDau { get; set; }
        public DateTime? LichKetThuc { get; set; }
        public byte? TrangThaiLich { get; set; }
        public bool CoDeXuatChoPhanHoi { get; set; }
        public int TongSo { get; set; }
    }

    public class TrangThaiDemDto
    {
        public byte TrangThai { get; set; }
        public int SoLuong { get; set; }
    }

    public class YeuCauThongKeDto
    {
        public List<TrangThaiDemDto> TheoTrangThai { get; set; } = new();
        public int CanHanhDong { get; set; }
    }

    public class PhanHoiDto
    {
        public byte Loai { get; set; }                 // 1 = chỉ đạo lãnh đạo, 2 = phản hồi trợ lý
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public string TieuDe { get; set; } = null!;
        public byte TrangThaiYeuCau { get; set; }
        public byte? DenTrangThai { get; set; }
        public byte? KetQua { get; set; }
        public string? NoiDung { get; set; }
        public string NguoiPhanHoi { get; set; } = null!;
        public DateTime ThoiDiem { get; set; }
        public int TongSo { get; set; }
    }

    // ===== Chi tiết (10 result set) =====
    public class YeuCauChungDto
    {
        public int Id { get; set; }
        public string MaYeuCau { get; set; } = null!;
        public int? NhomYeuCauId { get; set; }
        public string? MaNhom { get; set; }
        public int LanhDaoId { get; set; }
        public string TenLanhDao { get; set; } = null!;
        public int LoaiYeuCauId { get; set; }
        public string TenLoai { get; set; } = null!;
        public string TieuDe { get; set; } = null!;
        public string? TomTat { get; set; }
        public byte MucKhan { get; set; }
        public string? LyDoKhan { get; set; }
        public string? TenMucUuTien { get; set; }
        public int ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }
        public bool LaBaoMat { get; set; }
        public byte TrangThai { get; set; }
        public string? TenTroLy { get; set; }
        public DateTime? NgayGui { get; set; }
        public DateTime? NgayTiepNhan { get; set; }
        public DateTime? NgayHoanTat { get; set; }
        public string? LyDoTuChoiHuy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GioDeXuatDto
    {
        public int Id { get; set; }
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public int ThuTuUuTien { get; set; }
        public byte NguonDeXuat { get; set; }          // 1 = nhân viên, 2 = trợ lý
        public bool? NhanVienDongY { get; set; }
        public DateTime? NgayPhanHoi { get; set; }
        public string? GhiChu { get; set; }
    }

    public class NguoiThamDuDto
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string? HoTen { get; set; }
        public string? DonViNgoai { get; set; }
        public string? VaiTro { get; set; }
    }

    public class TepDto
    {
        public int Id { get; set; }
        public int? YeuCauId { get; set; }
        public int? KetQuaTrinhId { get; set; }
        public string TenFile { get; set; } = null!;
        public string DuongDan { get; set; } = null!;
        public string? ContentType { get; set; }
        public long KichThuoc { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class BinhLuanDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string TenNguoiDung { get; set; } = null!;
        public string NoiDung { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class TimelineDto
    {
        public int Id { get; set; }
        public byte? TuTrangThai { get; set; }
        public byte DenTrangThai { get; set; }
        public string? VaiTroThucHien { get; set; }
        public string NguoiThucHien { get; set; } = null!;
        public string? LyDo { get; set; }
        public string? GhiChu { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class LichTrinhDto
    {
        public int Id { get; set; }
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public string? DiaDiem { get; set; }
        public byte TrangThai { get; set; }
        public int? ThuTuTrongNgay { get; set; }
        public DateTime? NgayChot { get; set; }
    }

    public class LichTrinhLichSuDto
    {
        public int Id { get; set; }
        public int LichTrinhId { get; set; }
        public byte HanhDong { get; set; }
        public DateTime? BatDauCu { get; set; }
        public DateTime? KetThucCu { get; set; }
        public DateTime? BatDauMoi { get; set; }
        public DateTime? KetThucMoi { get; set; }
        public string? LyDo { get; set; }
        public string NguoiThucHien { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class KetQuaDto
    {
        public int Id { get; set; }
        public int LichTrinhId { get; set; }
        public byte KetQua { get; set; }
        public DateTime? ThoiGianThucTe { get; set; }
        public string? ChiDaoCuaLanhDao { get; set; }
        public string NguoiGhiNhan { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class CongViecDto
    {
        public int Id { get; set; }
        public int KetQuaTrinhId { get; set; }
        public string NoiDung { get; set; } = null!;
        public int? NguoiPhuTrachId { get; set; }
        public string? NguoiPhuTrach { get; set; }
        public DateTime? HanXuLy { get; set; }
        public byte TrangThai { get; set; }
        public DateTime? NgayHoanThanh { get; set; }
    }

    public class YeuCauChiTietDto
    {
        public YeuCauChungDto Chung { get; set; } = null!;
        public List<GioDeXuatDto> GioDeXuats { get; set; } = new();
        public List<NguoiThamDuDto> NguoiThamDus { get; set; } = new();
        public List<TepDto> Teps { get; set; } = new();
        public List<BinhLuanDto> BinhLuans { get; set; } = new();
        public List<TimelineDto> Timeline { get; set; } = new();
        public List<LichTrinhDto> LichTrinhs { get; set; } = new();
        public List<LichTrinhLichSuDto> LichSuLich { get; set; } = new();
        public List<KetQuaDto> KetQuas { get; set; } = new();
        public List<CongViecDto> CongViecs { get; set; } = new();
    }
    public class HuyYeuCauRequest
    {
        public string? LyDo { get; set; }
    }
    public class LoaiYeuCauChonDto
    {
        public int Id { get; set; }
        public string MaLoai { get; set; } = null!;
        public string TenLoai { get; set; } = null!;
        public int ThoiLuongMacDinhPhut { get; set; }
    }
}
