using SB_Services.DTO;

namespace SB_Services.Services.Requests
{
    public interface IRequestServices
    {
        Task<List<LanhDaoChonDto>> GetLanhDaoChonAsync(int userId);
        Task<LichBanResult> GetLichBanAsync(int userId, int lanhDaoId, DateTime tuNgay, DateTime denNgay);

        // Ghi
        Task<TaoYeuCauResult> TaoAsync(int userId, TaoYeuCauRequest req);
        Task<List<NguoiCanBaoDto>> GuiAsync(int userId, int yeuCauId);
        Task<List<HuyYeuCauNotifyDto>> HuyAsync(int userId, int yeuCauId, string? lyDo);
        Task<List<NguoiCanBaoDto>> BoSungAsync(int userId, int yeuCauId, BoSungRequest req);
        Task<List<NguoiCanBaoDto>> SuaAsync(int userId, int yeuCauId, SuaYeuCauRequest req);
        Task<List<NguoiCanBaoDto>> PhanHoiDeXuatAsync(int userId, int yeuCauId, PhanHoiDeXuatRequest req);
        Task<List<LoaiYeuCauChonDto>> GetLoaiYeuCauChonAsync(int userId);

        // Đọc
        Task<List<YeuCauItemDto>> GetDanhSachAsync(int userId, YeuCauQuery q);
        Task<YeuCauThongKeDto> GetThongKeAsync(int userId);
        Task<YeuCauChiTietDto> GetChiTietAsync(int userId, int yeuCauId);
        Task<List<PhanHoiDto>> GetPhanHoiAsync(int userId, int page, int pageSize);
    }
    public interface IThongBaoNotifier
    {
        // Ghi dòng vào ThongBao/DocThongBao và đẩy SignalR đến từng người nhận
        Task GuiAsync(IEnumerable<int> nguoiNhanIds, string noiDung, int chiNhanhId, int nguoiTaoId);
    }
}
