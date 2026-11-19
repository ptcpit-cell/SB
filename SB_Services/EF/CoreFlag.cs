namespace SB_Services.EF
{
    public class CoreFlag { }

    public enum TrangThaiYeuCau : byte
    {
        Nhap = 0,
        ChoXuLy = 1,
        DangXemXet = 2,
        DeXuatDoiLich = 3,
        YeuCauBoSung = 4,
        DaDuyet = 5,
        DaTrinh = 6,
        HoanThanh = 7,
        TuChoi = 8,
        DaHuy = 9,
        Hoan = 10,        // Hoãn/dời sau khi đã duyệt
        Vang = 11         // Người trình vắng / không thực hiện được
    }

    public enum MucKhan : byte { Thuong = 1, Gap = 2, RatGap = 3 }             // Nhân viên tự chọn
    public enum MucUuTienCode : byte { P1 = 1, P2 = 2, P3 = 3, P4 = 4 }        // Trợ lý chốt

    public enum LoaiSuKien : byte { Hop = 1, CongTac = 2, NghiPhep = 3, Khac = 4 }

    public enum TrangThaiLichTrinh : byte { DaXep = 1, DaTrinh = 2, DaHuy = 3, Hoan = 4, Vang = 5 }

    public enum HanhDongLichTrinh : byte { Tao = 1, DoiGio = 2, Huy = 3, Hoan = 4, HoanThanh = 5, Vang = 6, GhiDeXungDot = 7 }

    public enum KenhThongBao : byte { TrongApp = 1, Email = 2, Zalo = 3, Teams = 4, Sms = 5 }

    public enum LoaiLapLai : byte { Khong = 0, HangTuan = 1, HangThang = 2 }

    public enum LoaiHanhDongNhatKy : byte { Tao = 1, Sua = 2, Xoa = 3, KhoaMo = 4, DangNhap = 5, PhanQuyen = 6, Khac = 99 }
}
