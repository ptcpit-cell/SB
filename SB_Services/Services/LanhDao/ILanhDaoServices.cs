using SB_Services.DTO;

namespace SB_Services.Services.LanhDao
{
    public interface ILanhDaoServices
    {
        Task<LanhDaoDashboardDto> GetLichNgayAsync(int lanhDaoUserId, DateTime ngay);
        Task<WeekScheduleResponseDto> GetLichTuanAsync(int lanhDaoUserId, DateTime tuNgay, DateTime denNgay);
        Task<PhanHoiLanhDaoResultDto> CapNhatPhanHoiAsync(int lanhDaoUserId, int lichTrinhId, PhanHoiLanhDaoRequest req);
        Task<SuKienLanhDaoViewDto> TaoSuKienAsync(int lanhDaoUserId, SuKienLanhDaoInput req);
        Task<bool> XoaSuKienAsync(int lanhDaoUserId, int suKienId);
    }
}
