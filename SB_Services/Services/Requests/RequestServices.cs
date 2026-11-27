using Dapper;
using Microsoft.AspNetCore.SignalR;
using SB_DAL.DapperContext;
using SB_Services.DTO;
using SB_Services.Helpers;
using System.Data;

namespace SB_Services.Services.Requests
{
    public class RequestServices(IDapperContext dapperContext) : IRequestServices
    {
        private readonly IDapperContext _dapperContext = dapperContext;
        // ---------------------------------------------------------------
        // Form tạo yêu cầu
        // ---------------------------------------------------------------
        public async Task<List<LanhDaoChonDto>> GetLanhDaoChonAsync(int userId)
        {
            var rows = await _dapperContext.GetStoreAsync<LanhDaoChonDto>("dbo.usp_LanhDao_DanhSachChon", new { UserId = userId });
            return rows.ToList();
        }

        public Task<LichBanResult> GetLichBanAsync(int userId, int lanhDaoId, DateTime tuNgay, DateTime denNgay)
        {
            return _dapperContext.GetMultipleAsync("dbo.usp_LanhDao_LichBan",
                new { UserId = userId, LanhDaoId = lanhDaoId, TuNgay = tuNgay, DenNgay = denNgay },
                async grid => new LichBanResult
                {
                    GioLamViec = await grid.ReadSingleAsync<LichLamViecDto>(),
                    KhoangBan = (await grid.ReadAsync<KhoangBanDto>()).ToList()
                });
        }

        // ---------------------------------------------------------------
        // Ghi
        // ---------------------------------------------------------------
        public Task<TaoYeuCauResult> TaoAsync(int userId, TaoYeuCauRequest req)
        {
            var param = new
            {
                NguoiTaoId = userId,
                DanhSachLanhDao = BuildLanhDaoTable(new[] { req.LanhDaoId }).AsTableValuedParameter("dbo.TVP_LanhDaoId"),
                req.LoaiYeuCauId,
                req.TieuDe,
                req.TomTat,
                req.MucKhan,
                req.LyDoKhan,
                req.ThoiLuongPhut,
                req.HanChot,
                req.LaBaoMat,
                req.GuiNgay,
                ThoiGianDeXuat = BuildThoiGianTable(Array.Empty<ThoiGianDeXuatInput>()).AsTableValuedParameter("dbo.TVP_ThoiGianDeXuat"),
                NguoiThamDu = BuildNguoiThamDuTable(req.NguoiThamDus).AsTableValuedParameter("dbo.TVP_NguoiThamDu"),
                TepDinhKem = BuildTepTable(req.TepDinhKems).AsTableValuedParameter("dbo.TVP_TepDinhKem")
            };

            // SP trả 2 result set: yêu cầu vừa tạo + danh sách trợ lý cần thông báo
            return _dapperContext.GetMultipleAsync("dbo.usp_YeuCau_Tao", param,
                async grid => new TaoYeuCauResult
                {
                    DaTao = (await grid.ReadAsync<YeuCauMoiDto>()).ToList(),
                    TroLyCanBao = (await grid.ReadAsync<TroLyCanBaoDto>()).ToList()
                });
        }

        public async Task<List<NguoiCanBaoDto>> GuiAsync(int userId, int yeuCauId)
        {
            var rows = await _dapperContext.GetStoreAsync<NguoiCanBaoDto>("dbo.usp_YeuCau_Gui",
                new { YeuCauId = yeuCauId, NguoiTaoId = userId });
            return rows.ToList();
        }

        public async Task<List<HuyYeuCauNotifyDto>> HuyAsync(int userId, int yeuCauId, string? lyDo)
        {
            var rows = await _dapperContext.GetStoreAsync<HuyYeuCauNotifyDto>("dbo.usp_YeuCau_Huy",
                new { YeuCauId = yeuCauId, NguoiTaoId = userId, LyDo = lyDo });
            return rows.ToList();   // rỗng nếu hủy bản nháp
        }

        public async Task XoaAsync(int userId, int yeuCauId)
        {
            await _dapperContext.ExecuteStoreAsync("dbo.usp_YeuCau_XoaMem",
                new { YeuCauId = yeuCauId, NguoiTaoId = userId });
        }

        public async Task<List<NguoiCanBaoDto>> BoSungAsync(int userId, int yeuCauId, BoSungRequest req)
        {
            var rows = await _dapperContext.GetStoreAsync<NguoiCanBaoDto>("dbo.usp_YeuCau_BoSung", new
            {
                YeuCauId = yeuCauId,
                NguoiTaoId = userId,
                req.NoiDung,
                req.TomTat,
                TepDinhKem = BuildTepTable(req.TepDinhKems).AsTableValuedParameter("dbo.TVP_TepDinhKem")
            });
            return rows.ToList();
        }
        public async Task<List<NguoiCanBaoDto>> SuaAsync(int userId, int yeuCauId, SuaYeuCauRequest req)
        {
            var rows = await _dapperContext.GetStoreAsync<NguoiCanBaoDto>("dbo.usp_YeuCau_Sua", new
            {
                YeuCauId = yeuCauId,
                NguoiTaoId = userId,
                req.LoaiYeuCauId,
                req.TomTat,
                req.MucKhan,
                req.LyDoKhan,
                req.ThoiLuongPhut,
                req.HanChot,
                req.LaBaoMat,
                req.GuiNgay,
                ThoiGianDeXuat = BuildThoiGianTable(Array.Empty<ThoiGianDeXuatInput>()).AsTableValuedParameter("dbo.TVP_ThoiGianDeXuat"),
                NguoiThamDu = BuildNguoiThamDuTable(req.NguoiThamDus).AsTableValuedParameter("dbo.TVP_NguoiThamDu"),
                TepDinhKem = BuildTepTable(req.TepDinhKems).AsTableValuedParameter("dbo.TVP_TepDinhKem")
            });
            return rows.ToList();
        }
        public async Task<List<LoaiYeuCauChonDto>> GetLoaiYeuCauChonAsync(int userId)
        {
            var rows = await _dapperContext.GetStoreAsync<LoaiYeuCauChonDto>("dbo.usp_LoaiYeuCau_DanhSachChon", new { UserId = userId });
            return rows.ToList();
        }
        public async Task<List<NguoiCanBaoDto>> PhanHoiDeXuatAsync(int userId, int yeuCauId, PhanHoiDeXuatRequest req)
        {
            var rows = await _dapperContext.GetStoreAsync<NguoiCanBaoDto>("dbo.usp_YeuCau_PhanHoiDeXuat", new
            {
                YeuCauId = yeuCauId,
                NguoiTaoId = userId,
                ThoiGianDeXuatId = req.ThoiGianDeXuatId,
                req.DongY,
                req.GhiChu
            });
            return rows.ToList();
        }

        // ---------------------------------------------------------------
        // Đọc
        // ---------------------------------------------------------------
        public async Task<List<YeuCauItemDto>> GetDanhSachAsync(int userId, YeuCauQuery q)
        {
            var rows = await _dapperContext.GetStoreAsync<YeuCauItemDto>("dbo.usp_YeuCau_DanhSach", new
            {
                NguoiTaoId = userId,
                q.NhomTrangThai,
                q.TrangThai,
                q.LanhDaoId,
                q.TuNgay,
                q.DenNgay,
                q.TuKhoa,
                q.Page,
                q.PageSize
            });
            return rows.ToList();
        }

        public Task<YeuCauThongKeDto> GetThongKeAsync(int userId)
        {
            return _dapperContext.GetMultipleAsync("dbo.usp_YeuCau_ThongKe", new { NguoiTaoId = userId },
                async grid => new YeuCauThongKeDto
                {
                    TheoTrangThai = (await grid.ReadAsync<TrangThaiDemDto>()).ToList(),
                    CanHanhDong = await grid.ReadSingleAsync<int>()
                });
        }

        public Task<YeuCauChiTietDto> GetChiTietAsync(int userId, int yeuCauId)
        {
            // Thứ tự đọc phải đúng thứ tự 10 result set trong usp_YeuCau_ChiTiet
            return _dapperContext.GetMultipleAsync("dbo.usp_YeuCau_ChiTiet",
                new { YeuCauId = yeuCauId, NguoiTaoId = userId },
                async grid => new YeuCauChiTietDto
                {
                    Chung = await grid.ReadSingleAsync<YeuCauChungDto>(),
                    GioDeXuats = (await grid.ReadAsync<GioDeXuatDto>()).ToList(),
                    NguoiThamDus = (await grid.ReadAsync<NguoiThamDuDto>()).ToList(),
                    Teps = (await grid.ReadAsync<TepDto>()).ToList(),
                    BinhLuans = (await grid.ReadAsync<BinhLuanDto>()).ToList(),
                    Timeline = (await grid.ReadAsync<TimelineDto>()).ToList(),
                    LichTrinhs = (await grid.ReadAsync<LichTrinhDto>()).ToList(),
                    LichSuLich = (await grid.ReadAsync<LichTrinhLichSuDto>()).ToList(),
                    KetQuas = (await grid.ReadAsync<KetQuaDto>()).ToList(),
                    CongViecs = (await grid.ReadAsync<CongViecDto>()).ToList()
                });
        }

        public async Task<List<PhanHoiDto>> GetPhanHoiAsync(int userId, int page, int pageSize)
        {
            var rows = await _dapperContext.GetStoreAsync<PhanHoiDto>("dbo.usp_PhanHoi_DanhSach",
                new { NguoiTaoId = userId, Page = page, PageSize = pageSize });
            return rows.ToList();
        }

        // ---------------------------------------------------------------
        // Tạo DataTable cho TVP (thứ tự cột PHẢI đúng thứ tự trong kiểu TVP)
        // ---------------------------------------------------------------
        private static DataTable BuildLanhDaoTable(IEnumerable<int> ids)
        {
            var dt = new DataTable();
            dt.Columns.Add("LanhDaoId", typeof(int));
            foreach (var id in ids.Distinct()) dt.Rows.Add(id);   // Distinct vì TVP có PRIMARY KEY
            return dt;
        }

        private static DataTable BuildThoiGianTable(IEnumerable<ThoiGianDeXuatInput> items)
        {
            var dt = new DataTable();
            dt.Columns.Add("BatDau", typeof(DateTime));
            dt.Columns.Add("KetThuc", typeof(DateTime));
            dt.Columns.Add("ThuTuUuTien", typeof(int));
            foreach (var x in items)
                dt.Rows.Add(x.BatDau, (object?)x.KetThuc ?? DBNull.Value, x.ThuTu);
            return dt;
        }

        private static DataTable BuildNguoiThamDuTable(IEnumerable<NguoiThamDuInput> items)
        {
            var dt = new DataTable();
            dt.Columns.Add("UserId", typeof(int));
            dt.Columns.Add("HoTenNgoai", typeof(string));
            dt.Columns.Add("DonViNgoai", typeof(string));
            dt.Columns.Add("VaiTro", typeof(string));
            foreach (var x in items)
                dt.Rows.Add((object?)x.UserId ?? DBNull.Value,
                            (object?)x.HoTenNgoai ?? DBNull.Value,
                            (object?)x.DonViNgoai ?? DBNull.Value,
                            (object?)x.VaiTro ?? DBNull.Value);
            return dt;
        }

        private static DataTable BuildTepTable(IEnumerable<TepDinhKemInput> items)
        {
            var dt = new DataTable();
            dt.Columns.Add("TenFile", typeof(string));
            dt.Columns.Add("DuongDan", typeof(string));
            dt.Columns.Add("ContentType", typeof(string));
            dt.Columns.Add("KichThuoc", typeof(long));
            dt.Columns.Add("Checksum", typeof(string));
            foreach (var x in items)
                dt.Rows.Add(x.TenFile, x.DuongDan,
                            (object?)x.ContentType ?? DBNull.Value,
                            x.KichThuoc,
                            (object?)x.Checksum ?? DBNull.Value);
            return dt;
        }
    }
    public class ThongBaoNotifier(
        IDapperContext dapperContext,
        IHubContext<ThongBao> hubContext) : IThongBaoNotifier
    {
        private readonly IDapperContext _dapperContext = dapperContext;
        private readonly IHubContext<ThongBao> _hubContext = hubContext;

        public async Task GuiAsync(IEnumerable<int> nguoiNhanIds, string noiDung, int chiNhanhId, int nguoiTaoId)
        {
            var receivers = nguoiNhanIds.Where(x => x > 0).Distinct().ToList();
            if (receivers.Count == 0 || string.IsNullOrWhiteSpace(noiDung)) return;

            var now = DateTime.Now;
            const string sqlInsert = @"
                INSERT INTO dbo.ThongBao (NoiDung, CreatedAt, CreatedBy, ChiNhanhId)
                OUTPUT INSERTED.Id
                VALUES (@NoiDung, @CreatedAt, @CreatedBy, @ChiNhanhId)";

            int thongBaoId = await _dapperContext.ExecuteScalarAsync<int>(sqlInsert, new
            {
                NoiDung = noiDung.Trim(),
                CreatedAt = now,
                CreatedBy = nguoiTaoId,
                ChiNhanhId = chiNhanhId
            });

            var payload = new
            {
                id = thongBaoId,
                thongBaoId,
                noiDung = noiDung.Trim(),
                noiDungTB = noiDung.Trim(),
                createdAt = now,
                chiNhanhId,
                nguoiNhanId = receivers.Count == 1 ? receivers[0] : (int?)null,
                nguoiNhanIds = receivers,
                isRead = false
            };

            await _hubContext.Clients
                .Group(chiNhanhId.ToString())
                .SendAsync("ReceiveNewNotification", payload);
        }

        public async Task<ThongBaoLichTrinhDto?> GuiLichTrinhAsync(ThongBaoLichTrinhCreateInput input)
        {
            if (input.NguoiNhanId <= 0 || string.IsNullOrWhiteSpace(input.NoiDung)) return null;

            var now = DateTime.Now;
            const string sqlInsert = @"
                INSERT INTO dbo.ThongBaoLichTrinh (
                    ChiNhanhId, NguoiNhanId, TieuDe, NoiDung, Kenh, LoaiSuKien,
                    YeuCauId, LichTrinhId, DaDoc, NgayDoc, NgayGuiDuKien, NgayGuiThucTe,
                    TrangThaiGui, SoLanThu, LoiGui, IsActived, IsDeleted, CreatedAt, CreatedBy
                )
                OUTPUT INSERTED.Id
                VALUES (
                    @ChiNhanhId, @NguoiNhanId, @TieuDe, @NoiDung, 1, @LoaiSuKien,
                    @YeuCauId, @LichTrinhId, 0, NULL, @Now, @Now,
                    1, 1, NULL, 1, 0, @Now, @CreatedBy
                )";

            int newId = await _dapperContext.ExecuteScalarAsync<int>(sqlInsert, new
            {
                input.ChiNhanhId,
                input.NguoiNhanId,
                TieuDe = string.IsNullOrWhiteSpace(input.TieuDe) ? "Thông báo lịch trình" : input.TieuDe.Trim(),
                NoiDung = input.NoiDung.Trim(),
                input.LoaiSuKien,
                input.YeuCauId,
                input.LichTrinhId,
                Now = now,
                input.CreatedBy
            });

            var dto = new ThongBaoLichTrinhDto
            {
                Id = newId,
                ChiNhanhId = input.ChiNhanhId,
                NguoiNhanId = input.NguoiNhanId,
                TieuDe = string.IsNullOrWhiteSpace(input.TieuDe) ? "Thông báo lịch trình" : input.TieuDe.Trim(),
                NoiDung = input.NoiDung.Trim(),
                LoaiSuKien = input.LoaiSuKien,
                YeuCauId = input.YeuCauId,
                LichTrinhId = input.LichTrinhId,
                RouteUrl = !string.IsNullOrWhiteSpace(input.RouteUrl)
                    ? input.RouteUrl
                    : (input.YeuCauId.HasValue ? $"/nhan-vien/detail-request/{input.YeuCauId.Value}" : "/nhan-vien"),
                DaDoc = false,
                NgayDoc = null,
                CreatedAt = now
            };

            await _hubContext.Clients
                .Group(input.ChiNhanhId.ToString())
                .SendAsync("ReceiveScheduleNotification", dto);

            return dto;
        }
    }
}
