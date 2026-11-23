using SB_Services.DTO;

namespace SB_Services.Services.TroLy
{
    public interface ITroLyServices
    {
        Task<TroLyDashboardDto> GetDashboardAsync(int troLyUserId, DateTime ngay);
        Task<WeekScheduleResponseDto> GetLichTuanAsync(int troLyUserId, DateTime tuNgay, DateTime denNgay);
        Task<TroLyActionResultDto> TiepNhanAsync(int troLyUserId, int yeuCauId, TiepNhanRequest req);
        Task<TroLyActionResultDto> CapNhatUuTienAsync(int troLyUserId, int yeuCauId, CapNhatUuTienRequest req);
        Task<TroLyActionResultDto> XepLichAsync(int troLyUserId, int yeuCauId, XepLichRequest req);
        Task<TroLyActionResultDto> YeuCauBoSungAsync(int troLyUserId, int yeuCauId, YeuCauBoSungRequest req);
        Task<TroLyActionResultDto> TuChoiAsync(int troLyUserId, int yeuCauId, TuChoiYeuCauRequest req);
        Task<TroLyActionResultDto> CapNhatTrangThaiLichAsync(int troLyUserId, int lichTrinhId, CapNhatTrangThaiLichRequest req);
        Task<LanhDaoCauHinhDto> CapNhatCauHinhLanhDaoAsync(int troLyUserId, LanhDaoCauHinhDto req);
        Task<SuKienLanhDaoViewDto> TaoSuKienLanhDaoAsync(int troLyUserId, SuKienLanhDaoInput req);
        Task<bool> XoaSuKienLanhDaoAsync(int troLyUserId, int suKienId);
    }
}
