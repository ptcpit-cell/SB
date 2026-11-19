using System.ComponentModel.DataAnnotations;

namespace SB_Services.EF
{
    public class YeuCau : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }                    // Chi nhánh xử lý (của lãnh đạo)
        public int ChiNhanhNguoiTaoId { get; set; }            // Chi nhánh của người trình
        public int? NhomYeuCauId { get; set; }
        public string MaYeuCau { get; set; } = null!;          // Unique
        public int NguoiTaoId { get; set; }
        public int LanhDaoId { get; set; }
        public int LoaiYeuCauId { get; set; }
        public string TieuDe { get; set; } = null!;
        public string? TomTat { get; set; }
        public MucKhan MucKhan { get; set; } = MucKhan.Thuong;
        public string? LyDoKhan { get; set; }
        public int? MucUuTienId { get; set; }                  // Trợ lý chốt
        public int ThoiLuongPhut { get; set; }
        public DateTime? HanChot { get; set; }
        public bool LaBaoMat { get; set; }
        public TrangThaiYeuCau TrangThai { get; set; } = TrangThaiYeuCau.Nhap;
        public int? TroLyXuLyId { get; set; }
        public DateTime? NgayGui { get; set; }
        public DateTime? NgayTiepNhan { get; set; }
        public DateTime? NgayHoanTat { get; set; }
        public int? YeuCauLapLaiId { get; set; }
        public string? LyDoTuChoiHuy { get; set; }

        [Timestamp]
        public byte[] RowVersion { get; set; } = null!;        // rowversion: kiểm tra xung đột khi UPDATE
    }
    // Gom các yêu cầu con khi trình nhiều lãnh đạo
    public class NhomYeuCau : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public string MaNhom { get; set; } = null!;            // Unique
        public int NguoiTaoId { get; set; }
        public bool LaHopChung { get; set; }
        public string TieuDe { get; set; } = null!;
    }

    public class YeuCauThoiGianDeXuat : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int YeuCauId { get; set; }
        public DateTime BatDau { get; set; }
        public DateTime KetThuc { get; set; }
        public int ThuTuUuTien { get; set; }
        public byte NguonDeXuat { get; set; } = 1;             // 1 = Nhân viên, 2 = Trợ lý
        public bool? NhanVienDongY { get; set; }
        public DateTime? NgayPhanHoi { get; set; }
        public string? GhiChu { get; set; }
    }

    public class YeuCauNguoiThamDu : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int YeuCauId { get; set; }
        public int? UserId { get; set; }                       // Nội bộ
        public string? HoTenNgoai { get; set; }                // Khách ngoài hệ thống
        public string? DonViNgoai { get; set; }
        public string? VaiTro { get; set; }
    }

    public class YeuCauBinhLuan : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int YeuCauId { get; set; }
        public int UserId { get; set; }
        public string NoiDung { get; set; } = null!;
        public bool ChiNoiBo { get; set; }
    }

    public class TepDinhKem : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int? YeuCauId { get; set; }
        public int? KetQuaTrinhId { get; set; }
        public string TenFile { get; set; } = null!;
        public string DuongDan { get; set; } = null!;
        public string? ContentType { get; set; }
        public long KichThuoc { get; set; }
        public string? Checksum { get; set; }
    }

    // Yêu cầu định kỳ (báo cáo tuần/tháng)
    public class YeuCauLapLai : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public int NguoiTaoId { get; set; }
        public int LanhDaoId { get; set; }
        public int LoaiYeuCauId { get; set; }
        public string TieuDe { get; set; } = null!;
        public string? TomTat { get; set; }
        public LoaiLapLai LoaiLapLai { get; set; }
        public int KhoangCach { get; set; } = 1;               // Mỗi N tuần/tháng
        public byte? ThuTrongTuan { get; set; }                // 0..6
        public byte? NgayTrongThang { get; set; }
        public TimeSpan GioBatDau { get; set; }
        public int ThoiLuongPhut { get; set; }
        public DateTime TuNgay { get; set; }
        public DateTime? DenNgay { get; set; }
        public DateTime? LanSinhCuoi { get; set; }
    }
    public class LoaiYeuCau : BaseEntity
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public string MaLoai { get; set; } = null!;            // HO_SO, BAO_CAO, XIN_CHI_DAO, XIN_KY...
        public string TenLoai { get; set; } = null!;
        public int ThoiLuongMacDinhPhut { get; set; } = 30;
        public int ThuTu { get; set; }
    }

    public class MucUuTien
    {
        public int Id { get; set; }
        public int ChiNhanhId { get; set; }
        public MucUuTienCode Ma { get; set; }                  // P1..P4
        public string Ten { get; set; } = null!;
        public int TrongSo { get; set; }
        public string? MauHienThi { get; set; }
        public bool IsActived { get; set; } = true;     // Vô hiệu hóa tức thì
        public bool IsDeleted { get; set; } = false;    // Xóa mềm
    }
}
