namespace SB_Services.DTO
{
    public class LanhDaoThongKeDto
    {
        public int TongBuoiTrinh { get; set; }
        public int ChoTrinh { get; set; }
        public int DaTrinh { get; set; }
        public int TongPhut { get; set; }
        public int SuKienKhac { get; set; }
    }

    public class LanhDaoDashboardDto
    {
        public string Ngay { get; set; } = string.Empty;
        public LanhDaoInfoDto LanhDao { get; set; } = new();
        public LanhDaoCauHinhDto CauHinh { get; set; } = new();
        public List<LichTrinhViewDto> LichTrinhs { get; set; } = new();
        public List<SuKienLanhDaoViewDto> SuKiens { get; set; } = new();
        public LanhDaoThongKeDto ThongKe { get; set; } = new();
    }

    public class CongViecSauTrinhInput
    {
        public string NoiDung { get; set; } = string.Empty;
        public DateTime? HanXuLy { get; set; }
        public byte TrangThai { get; set; } = 1;
    }

    public class PhanHoiLanhDaoRequest
    {
        public byte KetQua { get; set; } = 1; // 1 = Đã trình, 2 = Vắng/Không trình được, 3 = Hoãn
        public bool HoanThanh { get; set; }
        public string? ChiDaoCuaLanhDao { get; set; } // Phản hồi cho nhân viên
        public string? GhiChuLanhDao { get; set; }    // Ghi chú riêng cho trợ lý
        public string? GhiChu { get; set; }
        public List<CongViecSauTrinhInput>? CongViecs { get; set; }
    }

    public class PhanHoiLanhDaoResultDto
    {
        public int KetQuaTrinhId { get; set; }
        public int LichTrinhId { get; set; }
        public int YeuCauId { get; set; }
        public string MaYeuCau { get; set; } = string.Empty;
        public string TieuDe { get; set; } = string.Empty;
        public int NguoiTaoId { get; set; }
        public int? TroLyUserId { get; set; }
        public string TenLanhDao { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
