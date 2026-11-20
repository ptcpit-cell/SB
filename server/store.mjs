// In-memory data store seeded directly from /data.sql plus realistic operational
// seed data for Assistant (/tro-ly), Leader (/lanh-dao), and 2-tier Notifications.

export const db = {
  chiNhanhs: [
    { chiNhanhId: 1, parentId: null, chiNhanhType: 1, maChiNhanh: 'PTC', tenChiNhanh: 'Văn Phòng PTC', address: null, phone: null, isActived: true },
    { chiNhanhId: 3, parentId: 1, chiNhanhType: 3, maChiNhanh: 'PT1', tenChiNhanh: 'Phát Tiến 1', address: null, phone: null, isActived: true },
    { chiNhanhId: 4, parentId: 1, chiNhanhType: 3, maChiNhanh: 'PT2', tenChiNhanh: 'Phát Tiến 2', address: null, phone: null, isActived: true },
    { chiNhanhId: 5, parentId: 1, chiNhanhType: 3, maChiNhanh: 'PT3', tenChiNhanh: 'Phát Tiến 3', address: null, phone: null, isActived: true },
    { chiNhanhId: 6, parentId: 1, chiNhanhType: 3, maChiNhanh: 'PT4', tenChiNhanh: 'Phát Tiến 4', address: null, phone: null, isActived: true },
    { chiNhanhId: 7, parentId: 1, chiNhanhType: 3, maChiNhanh: 'PT5', tenChiNhanh: 'Phát Tiến 5', address: null, phone: null, isActived: true },
    { chiNhanhId: 8, parentId: 1, chiNhanhType: 3, maChiNhanh: 'PT6', tenChiNhanh: 'Phát Tiến 6', address: null, phone: null, isActived: true },
    { chiNhanhId: 9, parentId: 1, chiNhanhType: 2, maChiNhanh: 'TNK', tenChiNhanh: 'Toyota Ninh Kiều', address: null, phone: null, isActived: true },
    { chiNhanhId: 10, parentId: 1, chiNhanhType: 2, maChiNhanh: 'TAS', tenChiNhanh: 'Toyota An Sương', address: null, phone: null, isActived: true }
  ],

  chucVus: [
    { id: 1, chiNhanhId: 1, maChucVu: 'TP', tenChucVu: 'Trưởng phòng', capBac: 5 },
    { id: 2, chiNhanhId: 1, maChucVu: 'TBP', tenChucVu: 'Trưởng bộ phận', capBac: 6 },
    { id: 3, chiNhanhId: 1, maChucVu: 'NV', tenChucVu: 'Nhân viên', capBac: 7 },
    { id: 4, chiNhanhId: 1, maChucVu: 'TL', tenChucVu: 'Trợ lý', capBac: 4 },
    { id: 5, chiNhanhId: 1, maChucVu: 'GD', tenChucVu: 'Giám đốc', capBac: 3 },
    { id: 6, chiNhanhId: 1, maChucVu: 'PCT', tenChucVu: 'Phó Chủ tịch', capBac: 2 },
    { id: 7, chiNhanhId: 1, maChucVu: 'CT', tenChucVu: 'Chủ tịch', capBac: 1 }
  ],

  phongBans: [
    { id: 1, chiNhanhId: 1, parentId: null, maPhongBan: 'PMIT', tenPhongBan: 'Phần Mềm - IT', isDeleted: false },
    { id: 2, chiNhanhId: 1, parentId: null, maPhongBan: 'BGD', tenPhongBan: 'Ban giám đốc', isDeleted: false },
    { id: 3, chiNhanhId: 1, parentId: null, maPhongBan: 'TC', tenPhongBan: 'Tài chính', isDeleted: false },
    { id: 4, chiNhanhId: 1, parentId: null, maPhongBan: 'KeT', tenPhongBan: 'Kế toán', isDeleted: false }
  ],

  permissions: [
    { permissionId: 1, permissionName: 'View admin', component: 'Home', isActived: true },
    { permissionId: 2, permissionName: 'Xem role', component: 'Sidebar, Role', isActived: true },
    { permissionId: 3, permissionName: 'Xem user', component: 'Sidebar, User', isActived: true },
    { permissionId: 4, permissionName: 'Hiển thị sidebar', component: 'Sidebar', isActived: true },
    { permissionId: 5, permissionName: 'View trợ lý', component: 'Trợ lý', isActived: true },
    { permissionId: 6, permissionName: 'View lãnh đạo', component: 'Lãnh đạo', isActived: true },
    { permissionId: 7, permissionName: 'View nhân viên', component: 'Nhân viên', isActived: true },
    { permissionId: 8, permissionName: 'Xem phòng ban', component: 'Phòng ban', isActived: true },
    { permissionId: 9, permissionName: 'Xem chức vụ', component: 'Chức vụ', isActived: true },
    { permissionId: 10, permissionName: 'Tạo yêu cầu', component: 'Nhân viên', isActived: true },
    { permissionId: 11, permissionName: 'Sửa yêu cầu', component: 'Nhân viên', isActived: true },
    { permissionId: 12, permissionName: 'Xem chi tiết yêu cầu', component: 'Nhân viên', isActived: true }
  ],

  roles: [
    { roleId: 1, tenRole: 'admin', isDeleted: false, isActived: true },
    { roleId: 2, tenRole: 'trợ lý', isDeleted: false, isActived: true },
    { roleId: 3, tenRole: 'lãnh đạo', isDeleted: false, isActived: true },
    { roleId: 4, tenRole: 'nhân viên', isDeleted: false, isActived: true }
  ],

  rolePermissions: [
    { roleId: 1, permissionId: 1 },
    { roleId: 1, permissionId: 2 },
    { roleId: 1, permissionId: 3 },
    { roleId: 4, permissionId: 7 },
    { roleId: 1, permissionId: 4 },
    { roleId: 4, permissionId: 10 },
    { roleId: 3, permissionId: 6 },
    { roleId: 3, permissionId: 4 },
    { roleId: 1, permissionId: 8 },
    { roleId: 1, permissionId: 9 },
    { roleId: 4, permissionId: 11 },
    { roleId: 4, permissionId: 12 },
    { roleId: 2, permissionId: 5 },
    { roleId: 2, permissionId: 4 },
    { roleId: 2, permissionId: 12 },
    { roleId: 3, permissionId: 12 }
  ],

  userRoles: [
    { userId: 5, roleId: 3 },
    { userId: 2, roleId: 4 },
    { userId: 3, roleId: 4 },
    { userId: 1, roleId: 1 },
    { userId: 6, roleId: 3 },
    { userId: 4, roleId: 2 }
  ],

  users: [
    {
      userId: 1,
      userName: 'admin',
      password: '$2a$11$LZAysWE23YpxTZTuAjujbexgGBAvXS7qyEwFq5t6tOFqMgOkdBG6i',
      chiNhanhId: 1,
      isDeleted: false,
      tenNguoiDung: 'admin',
      trangThai: null,
      refreshToken: null,
      expiryToken: null,
      isActived: true,
      phongBanId: null,
      chucVuId: null,
      email: 'abc@gmail.com',
      phone: '0000000000',
      zaloId: null
    },
    {
      userId: 2,
      userName: 'thang.tran',
      password: '$2a$11$R9Fx9VYPBcWCEtEVSsL6PupQn9L/akUzJkCgILPKB8fLpwZ30iLRe',
      chiNhanhId: 1,
      isDeleted: false,
      tenNguoiDung: 'Xuân Thắng',
      trangThai: null,
      refreshToken: '8d66ccb8-552f-4432-b827-981033a29af3',
      expiryToken: '2026-12-03T03:19:48.197Z',
      isActived: true,
      phongBanId: 1,
      chucVuId: 1,
      email: '',
      phone: '',
      zaloId: null
    },
    {
      userId: 3,
      userName: 'chien.vo',
      password: '$2a$11$Oep3Zz0LRLeWscN59J/OROGGf9B3WiXbZZQQnFC4gNN4dY0ClNmsy',
      chiNhanhId: 1,
      isDeleted: false,
      tenNguoiDung: 'Võ Chiến',
      trangThai: null,
      refreshToken: null,
      expiryToken: null,
      isActived: true,
      phongBanId: 1,
      chucVuId: 2,
      email: '',
      phone: '',
      zaloId: null
    },
    {
      userId: 4,
      userName: 'tham.huynh',
      password: '$2a$11$xM6zl3GCSSX.Frk694GMdOaLpTLsAd4U/ZKMKQ8MlmXEvd.h8AMAK',
      chiNhanhId: 1,
      isDeleted: false,
      tenNguoiDung: 'Thanh Thắm',
      trangThai: null,
      refreshToken: null,
      expiryToken: null,
      isActived: true,
      phongBanId: 2,
      chucVuId: 4,
      email: '',
      phone: '',
      zaloId: null
    },
    {
      userId: 5,
      userName: 'phu.ho',
      password: '$2a$11$p6XCfNglDdK9Njntdomx9eAE0mUHsUROXSuCvybBf0JNIEl8EXamS',
      chiNhanhId: 1,
      isDeleted: false,
      tenNguoiDung: 'Phú Hồ',
      trangThai: null,
      refreshToken: null,
      expiryToken: null,
      isActived: true,
      phongBanId: 2,
      chucVuId: 5,
      email: '',
      phone: '',
      zaloId: null
    },
    {
      userId: 6,
      userName: 'phat.ho',
      password: '$2a$11$ScgdeiwoGFoFb6chdiyFJevZSE.7zUx8CFmUDkpbC3dtgCpi7L6Yi',
      chiNhanhId: 1,
      isDeleted: false,
      tenNguoiDung: 'Sếp Phát',
      trangThai: null,
      refreshToken: null,
      expiryToken: null,
      isActived: true,
      phongBanId: 2,
      chucVuId: 6,
      email: '',
      phone: '',
      zaloId: null
    }
  ],

  lanhDaos: [
    { id: 1, chiNhanhId: 1, userId: 5, capDo: 2, thuTuHienThi: 2, phongLamViec: 'Phòng Giám đốc - Tầng 3', isActived: true, isDeleted: false },
    { id: 2, chiNhanhId: 1, userId: 6, capDo: 1, thuTuHienThi: 1, phongLamViec: 'Phòng Phó Chủ tịch - Tầng 4', isActived: true, isDeleted: false }
  ],

  lanhDaoCauHinhs: [
    {
      id: 1,
      chiNhanhId: 1,
      lanhDaoId: 1,
      gioBatDau: '08:00:00',
      gioKetThuc: '17:30:00',
      nghiTruaTu: '12:00:00',
      nghiTruaDen: '13:30:00',
      thoiGianDemPhut: 10,
      gioiHanPhutMoiNgay: 240,
      soNgayLamViecMask: 126,
      choNhanVienXemLichTrongBan: true,
      isActived: true,
      isDeleted: false
    },
    {
      id: 2,
      chiNhanhId: 1,
      lanhDaoId: 2,
      gioBatDau: '08:00:00',
      gioKetThuc: '17:00:00',
      nghiTruaTu: '12:00:00',
      nghiTruaDen: '13:30:00',
      thoiGianDemPhut: 15,
      gioiHanPhutMoiNgay: 180,
      soNgayLamViecMask: 62,
      choNhanVienXemLichTrongBan: true,
      isActived: true,
      isDeleted: false
    }
  ],

  // 1 boss = 1 assigned assistant
  troLys: [
    { id: 1, chiNhanhId: 1, userId: 4, lanhDaoId: 1, isTroLyChinh: true, choPhepGhiDeXungDot: true, isActived: true, isDeleted: false }
  ],

  loaiYeuCaus: [
    { id: 1, chiNhanhId: 1, maLoai: 'BC', tenLoai: 'Báo cáo', thoiLuongMacDinhPhut: 15, thuTu: 1, isActived: true, isDeleted: false, createdAt: '2026-11-18T10:16:48.477' },
    { id: 2, chiNhanhId: 1, maLoai: 'HS', tenLoai: 'Trình hồ sơ', thoiLuongMacDinhPhut: 30, thuTu: 2, isActived: true, isDeleted: false, createdAt: '2026-11-18T10:16:48.477' },
    { id: 3, chiNhanhId: 1, maLoai: 'CD', tenLoai: 'Xin chỉ đạo', thoiLuongMacDinhPhut: 30, thuTu: 3, isActived: true, isDeleted: false, createdAt: '2026-11-18T10:16:48.477' },
    { id: 4, chiNhanhId: 1, maLoai: 'KY', tenLoai: 'Xin ký duyệt', thoiLuongMacDinhPhut: 15, thuTu: 4, isActived: true, isDeleted: false, createdAt: '2026-11-18T10:16:48.477' }
  ],

  mucUuTiens: [
    { id: 1, chiNhanhId: 1, ma: 1, code: 'P1', ten: 'P1 - Khẩn cấp', trongSo: 100, mauHienThi: '#dc3545', isActived: true, isDeleted: false },
    { id: 2, chiNhanhId: 1, ma: 2, code: 'P2', ten: 'P2 - Cao', trongSo: 75, mauHienThi: '#fd7e14', isActived: true, isDeleted: false },
    { id: 3, chiNhanhId: 1, ma: 3, code: 'P3', ten: 'P3 - Trung bình', trongSo: 50, mauHienThi: '#0d6efd', isActived: true, isDeleted: false },
    { id: 4, chiNhanhId: 1, ma: 4, code: 'P4', ten: 'P4 - Thấp', trongSo: 25, mauHienThi: '#6c757d', isActived: true, isDeleted: false }
  ],

  nhomYeuCaus: [],

  yeuCaus: [
    {
      id: 1, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261118-000001',
      nguoiTaoId: 2, lanhDaoId: 1, loaiYeuCauId: 1, tieuDe: 'Lý thuyết hệ thống', tomTat: 'Tổng hợp kiến trúc và luồng vận hành hệ thống quản lý lịch trình.',
      mucKhan: 2, lyDoKhan: 'Cần chốt phương án triển khai trong tuần này', mucUuTienId: 2, thoiLuongPhut: 30,
      hanChot: '2026-11-21T23:59:59.000', laBaoMat: false, trangThai: 1, troLyXuLyId: null,
      ngayGui: '2026-11-18T13:54:53.913', ngayTiepNhan: null, ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-18T13:54:53.913', createdBy: 2, updatedAt: null, updatedBy: null
    },
    {
      id: 2, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000002',
      nguoiTaoId: 2, lanhDaoId: 1, loaiYeuCauId: 1, tieuDe: 'Lý thuyết', tomTat: null,
      mucKhan: 1, lyDoKhan: null, mucUuTienId: null, thoiLuongPhut: 15,
      hanChot: '2026-11-19T15:00:00.000', laBaoMat: false, trangThai: 9, troLyXuLyId: null,
      ngayGui: '2026-11-19T10:21:52.377', ngayTiepNhan: null, ngayHoanTat: '2026-11-19T10:21:58.893',
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-19T10:12:27.357', createdBy: 2, updatedAt: '2026-11-19T10:21:58.893', updatedBy: 2
    },
    {
      id: 3, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000003',
      nguoiTaoId: 2, lanhDaoId: 2, loaiYeuCauId: 1, tieuDe: 'Lý thuyết', tomTat: 'demo!!!!!!!!!!!!!!!!!!',
      mucKhan: 1, lyDoKhan: null, mucUuTienId: null, thoiLuongPhut: 45,
      hanChot: null, laBaoMat: false, trangThai: 0, troLyXuLyId: null,
      ngayGui: null, ngayTiepNhan: null, ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-19T10:23:20.310', createdBy: 2, updatedAt: '2026-11-19T10:23:51.740', updatedBy: 2
    },
    {
      id: 4, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000004',
      nguoiTaoId: 2, lanhDaoId: 1, loaiYeuCauId: 1, tieuDe: 'test', tomTat: null,
      mucKhan: 1, lyDoKhan: null, mucUuTienId: null, thoiLuongPhut: 45,
      hanChot: '2026-11-22T00:00:00.000', laBaoMat: false, trangThai: 0, troLyXuLyId: null,
      ngayGui: null, ngayTiepNhan: null, ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-19T11:29:27.533', createdBy: 2, updatedAt: null, updatedBy: null
    },
    {
      id: 5, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000005',
      nguoiTaoId: 2, lanhDaoId: 2, loaiYeuCauId: 1, tieuDe: 'demoo', tomTat: null,
      mucKhan: 1, lyDoKhan: null, mucUuTienId: null, thoiLuongPhut: 120,
      hanChot: '2026-11-22T00:00:00.000', laBaoMat: false, trangThai: 0, troLyXuLyId: null,
      ngayGui: null, ngayTiepNhan: null, ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-19T11:51:30.143', createdBy: 2, updatedAt: '2026-11-19T11:57:31.657', updatedBy: 2
    },
    // Operational seed requests for today's demo (Leader 1 = Phú Hồ, Assistant 4 = Thanh Thắm)
    {
      id: 6, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000006',
      nguoiTaoId: 3, lanhDaoId: 1, loaiYeuCauId: 2, tieuDe: 'Trình duyệt ngân sách nâng cấp hạ tầng server Q4',
      tomTat: 'Báo giá 3 nhà cung cấp thiết bị lưu trữ và đề xuất phương án tối ưu chi phí 18%.',
      mucKhan: 3, lyDoKhan: 'Nhà cung cấp chỉ giữ báo giá ưu đãi đến hết ngày 20/11', mucUuTienId: 1, thoiLuongPhut: 30,
      hanChot: '2026-11-20T23:59:59.000', laBaoMat: true, trangThai: 1, troLyXuLyId: null,
      ngayGui: '2026-11-19T07:45:00.000', ngayTiepNhan: null, ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-19T07:45:00.000', createdBy: 3, updatedAt: null, updatedBy: null
    },
    {
      id: 7, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000007',
      nguoiTaoId: 2, lanhDaoId: 1, loaiYeuCauId: 1, tieuDe: 'Báo cáo tiến độ chuyển đổi số tháng 11',
      tomTat: 'Cập nhật KPI triển khai phần mềm tại các chi nhánh Phát Tiến 1-6 và Toyota An Sương.',
      mucKhan: 2, lyDoKhan: 'Cần báo cáo trước cuộc họp giao ban', mucUuTienId: 2, thoiLuongPhut: 30,
      hanChot: '2026-11-19T23:59:59.000', laBaoMat: false, trangThai: 5, troLyXuLyId: 4,
      ngayGui: '2026-11-18T15:00:00.000', ngayTiepNhan: '2026-11-18T15:30:00.000', ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-18T15:00:00.000', createdBy: 2, updatedAt: '2026-11-18T16:00:00.000', updatedBy: 4
    },
    {
      id: 8, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000008',
      nguoiTaoId: 3, lanhDaoId: 1, loaiYeuCauId: 4, tieuDe: 'Xin ký duyệt hợp đồng bảo trì hệ thống mạng',
      tomTat: 'Hồ sơ nghiệm thu và hợp đồng gia hạn bảo trì định kỳ 12 tháng đã qua pháp chế.',
      mucKhan: 1, lyDoKhan: null, mucUuTienId: 3, thoiLuongPhut: 30,
      hanChot: '2026-11-19T23:59:59.000', laBaoMat: false, trangThai: 5, troLyXuLyId: 4,
      ngayGui: '2026-11-18T16:10:00.000', ngayTiepNhan: '2026-11-18T16:20:00.000', ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-18T16:10:00.000', createdBy: 3, updatedAt: '2026-11-18T16:40:00.000', updatedBy: 4
    },
    {
      id: 9, chiNhanhId: 1, chiNhanhNguoiTaoId: 1, nhomYeuCauId: null, maYeuCau: 'YC261119-000009',
      nguoiTaoId: 2, lanhDaoId: 1, loaiYeuCauId: 3, tieuDe: 'Xin chỉ đạo kế hoạch tuyển dụng nhân sự IT năm 2027',
      tomTat: 'Đề xuất bổ sung 2 lập trình viên và 1 chuyên viên dữ liệu cho dự án ERP.',
      mucKhan: 1, lyDoKhan: null, mucUuTienId: 3, thoiLuongPhut: 45,
      hanChot: '2026-11-24T23:59:59.000', laBaoMat: false, trangThai: 5, troLyXuLyId: 4,
      ngayGui: '2026-11-18T14:00:00.000', ngayTiepNhan: '2026-11-18T14:20:00.000', ngayHoanTat: null,
      yeuCauLapLaiId: null, lyDoTuChoiHuy: null, isActived: true, isDeleted: false,
      createdAt: '2026-11-18T14:00:00.000', createdBy: 2, updatedAt: '2026-11-18T15:10:00.000', updatedBy: 4
    }
  ],

  yeuCauLichSuTrangThais: [
    { id: 1, chiNhanhId: 1, yeuCauId: 1, tuTrangThai: null, denTrangThai: 1, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Tạo và gửi yêu cầu', ghiChu: null, createdAt: '2026-11-18T13:54:53.913' },
    { id: 2, chiNhanhId: 1, yeuCauId: 2, tuTrangThai: null, denTrangThai: 0, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Lưu nháp', ghiChu: null, createdAt: '2026-11-19T10:12:27.357' },
    { id: 3, chiNhanhId: 1, yeuCauId: 2, tuTrangThai: 0, denTrangThai: 1, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Gửi yêu cầu', ghiChu: null, createdAt: '2026-11-19T10:21:52.377' },
    { id: 4, chiNhanhId: 1, yeuCauId: 2, tuTrangThai: 1, denTrangThai: 9, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: null, ghiChu: null, createdAt: '2026-11-19T10:21:58.893' },
    { id: 5, chiNhanhId: 1, yeuCauId: 3, tuTrangThai: null, denTrangThai: 0, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Lưu nháp', ghiChu: null, createdAt: '2026-11-19T10:23:20.310' },
    { id: 6, chiNhanhId: 1, yeuCauId: 4, tuTrangThai: null, denTrangThai: 0, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Lưu nháp', ghiChu: null, createdAt: '2026-11-19T11:29:27.533' },
    { id: 7, chiNhanhId: 1, yeuCauId: 5, tuTrangThai: null, denTrangThai: 0, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Lưu nháp', ghiChu: null, createdAt: '2026-11-19T11:51:30.143' },
    { id: 8, chiNhanhId: 1, yeuCauId: 6, tuTrangThai: null, denTrangThai: 1, nguoiThucHienId: 3, vaiTroThucHien: 'NHANVIEN', lyDo: 'Tạo và gửi yêu cầu', ghiChu: null, createdAt: '2026-11-19T07:45:00.000' },
    { id: 9, chiNhanhId: 1, yeuCauId: 7, tuTrangThai: null, denTrangThai: 1, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Tạo và gửi yêu cầu', ghiChu: null, createdAt: '2026-11-18T15:00:00.000' },
    { id: 10, chiNhanhId: 1, yeuCauId: 7, tuTrangThai: 1, denTrangThai: 5, nguoiThucHienId: 4, vaiTroThucHien: 'TROLY', lyDo: 'Đã xếp lịch trình 09:00 - 09:30 ngày 19/11/2026', ghiChu: null, createdAt: '2026-11-18T16:00:00.000' },
    { id: 11, chiNhanhId: 1, yeuCauId: 8, tuTrangThai: null, denTrangThai: 1, nguoiThucHienId: 3, vaiTroThucHien: 'NHANVIEN', lyDo: 'Tạo và gửi yêu cầu', ghiChu: null, createdAt: '2026-11-18T16:10:00.000' },
    { id: 12, chiNhanhId: 1, yeuCauId: 8, tuTrangThai: 1, denTrangThai: 5, nguoiThucHienId: 4, vaiTroThucHien: 'TROLY', lyDo: 'Đã xếp lịch trình 09:15 - 09:45 ngày 19/11/2026 (xếp chồng linh hoạt)', ghiChu: null, createdAt: '2026-11-18T16:40:00.000' },
    { id: 13, chiNhanhId: 1, yeuCauId: 9, tuTrangThai: null, denTrangThai: 1, nguoiThucHienId: 2, vaiTroThucHien: 'NHANVIEN', lyDo: 'Tạo và gửi yêu cầu', ghiChu: null, createdAt: '2026-11-18T14:00:00.000' },
    { id: 14, chiNhanhId: 1, yeuCauId: 9, tuTrangThai: 1, denTrangThai: 5, nguoiThucHienId: 4, vaiTroThucHien: 'TROLY', lyDo: 'Đã xếp lịch trình 14:00 - 14:45 ngày 19/11/2026', ghiChu: null, createdAt: '2026-11-18T15:10:00.000' }
  ],

  yeuCauThoiGianDeXuats: [
    { id: 1, chiNhanhId: 1, yeuCauId: 1, batDau: '2026-11-18T14:30:00.000', ketThuc: '2026-11-18T14:45:00.000', thuTuUuTien: 1, nguonDeXuat: 1, nhanVienDongY: null, ngayPhanHoi: null, ghiChu: null, isActived: true, isDeleted: false, createdAt: '2026-11-18T13:54:53.913', createdBy: 2 },
    { id: 2, chiNhanhId: 1, yeuCauId: 2, batDau: '2026-11-19T13:30:00.000', ketThuc: '2026-11-19T13:45:00.000', thuTuUuTien: 1, nguonDeXuat: 1, nhanVienDongY: null, ngayPhanHoi: null, ghiChu: null, isActived: true, isDeleted: false, createdAt: '2026-11-19T10:12:27.357', createdBy: 2 },
    { id: 3, chiNhanhId: 1, yeuCauId: 3, batDau: '2026-11-20T14:30:00.000', ketThuc: '2026-11-20T14:45:00.000', thuTuUuTien: 1, nguonDeXuat: 1, nhanVienDongY: null, ngayPhanHoi: null, ghiChu: null, isActived: true, isDeleted: true, createdAt: '2026-11-19T10:23:20.310', createdBy: 2 },
    { id: 4, chiNhanhId: 1, yeuCauId: 3, batDau: '2026-11-20T14:30:00.000', ketThuc: '2026-11-20T14:45:00.000', thuTuUuTien: 1, nguonDeXuat: 1, nhanVienDongY: null, ngayPhanHoi: null, ghiChu: null, isActived: true, isDeleted: true, createdAt: '2026-11-19T10:23:43.123', createdBy: 2 },
    { id: 5, chiNhanhId: 1, yeuCauId: 3, batDau: '2026-11-20T14:30:00.000', ketThuc: '2026-11-20T15:15:00.000', thuTuUuTien: 1, nguonDeXuat: 1, nhanVienDongY: null, ngayPhanHoi: null, ghiChu: null, isActived: true, isDeleted: false, createdAt: '2026-11-19T10:23:51.740', createdBy: 2 }
  ],

  yeuCauNguoiThamDus: [
    { id: 1, chiNhanhId: 1, yeuCauId: 7, userId: 3, hoTenNgoai: null, donViNgoai: 'Phòng Phần Mềm - IT', vaiTro: 'Đồng trình bày', isActived: true, isDeleted: false, createdAt: '2026-11-18T15:00:00.000', createdBy: 2 }
  ],
  tepDinhKems: [],
  yeuCauBinhLuans: [],

  // Seed today's schedule (2026-11-19) including 2 overlapping slots (09:00-09:30 & 09:15-09:45)
  lichTrinhs: [
    {
      id: 1, chiNhanhId: 1, yeuCauId: 7, lanhDaoId: 1,
      batDau: '2026-11-19T09:00:00', ketThuc: '2026-11-19T09:30:00',
      diaDiem: 'Phòng Giám đốc - Tầng 3', trangThai: 1, thuTuTrongNgay: 1,
      nguoiChotId: 4, ngayChot: '2026-11-18T16:00:00.000',
      daGhiDeXungDot: false, lyDoGhiDe: null, ghiChuLanhDao: null,
      isActived: true, isDeleted: false
    },
    {
      id: 2, chiNhanhId: 1, yeuCauId: 8, lanhDaoId: 1,
      batDau: '2026-11-19T09:15:00', ketThuc: '2026-11-19T09:45:00',
      diaDiem: 'Phòng Giám đốc - Tầng 3', trangThai: 1, thuTuTrongNgay: 2,
      nguoiChotId: 4, ngayChot: '2026-11-18T16:40:00.000',
      daGhiDeXungDot: true, lyDoGhiDe: 'Trình ký nhanh, có thể gối đầu sau báo cáo', ghiChuLanhDao: null,
      isActived: true, isDeleted: false
    },
    {
      id: 3, chiNhanhId: 1, yeuCauId: 9, lanhDaoId: 1,
      batDau: '2026-11-19T14:00:00', ketThuc: '2026-11-19T14:45:00',
      diaDiem: 'Phòng Họp A - Tầng 3', trangThai: 1, thuTuTrongNgay: 3,
      nguoiChotId: 4, ngayChot: '2026-11-18T15:10:00.000',
      daGhiDeXungDot: false, lyDoGhiDe: null, ghiChuLanhDao: null,
      isActived: true, isDeleted: false
    }
  ],

  lichTrinhLichSus: [
    { id: 1, chiNhanhId: 1, lichTrinhId: 1, yeuCauId: 7, lanhDaoId: 1, hanhDong: 1, batDauCu: null, ketThucCu: null, batDauMoi: '2026-11-19T09:00:00', ketThucMoi: '2026-11-19T09:30:00', lyDo: 'Trợ lý xếp lịch trình', nguoiThucHienId: 4, createdAt: '2026-11-18T16:00:00.000' },
    { id: 2, chiNhanhId: 1, lichTrinhId: 2, yeuCauId: 8, lanhDaoId: 1, hanhDong: 7, batDauCu: null, ketThucCu: null, batDauMoi: '2026-11-19T09:15:00', ketThucMoi: '2026-11-19T09:45:00', lyDo: 'Xếp chồng linh hoạt trong khung sáng', nguoiThucHienId: 4, createdAt: '2026-11-18T16:40:00.000' },
    { id: 3, chiNhanhId: 1, lichTrinhId: 3, yeuCauId: 9, lanhDaoId: 1, hanhDong: 1, batDauCu: null, ketThucCu: null, batDauMoi: '2026-11-19T14:00:00', ketThucMoi: '2026-11-19T14:45:00', lyDo: 'Trợ lý xếp lịch trình', nguoiThucHienId: 4, createdAt: '2026-11-18T15:10:00.000' }
  ],

  suKienLanhDaos: [
    {
      id: 1, chiNhanhId: 1, lanhDaoId: 1, loai: 1,
      tieuDe: 'Họp giao ban Ban Giám đốc',
      batDau: '2026-11-19T10:30:00', ketThuc: '2026-11-19T11:30:00',
      caNgay: false, laCung: true, laRiengTu: false,
      diaDiem: 'Phòng họp lớn Tầng 5', ghiChu: 'Họp định kỳ hàng tuần',
      isActived: true, isDeleted: false
    }
  ],

  ketQuaTrinhs: [],
  congViecSauTrinhs: [],

  // Basic bell notifications (ThongBao)
  thongBaos: [
    { id: 1, noiDung: 'Yêu cầu YC261119-000007 vừa được duyệt lịch', createdAt: '2026-11-18T16:00:00.000', createdBy: 4, chiNhanhId: 1, nguoiNhanId: 2 },
    { id: 2, noiDung: 'Yêu cầu YC261119-000009 vừa được duyệt lịch', createdAt: '2026-11-18T15:10:00.000', createdBy: 4, chiNhanhId: 1, nguoiNhanId: 2 },
    { id: 3, noiDung: 'Yêu cầu YC261119-000006 vừa được gửi', createdAt: '2026-11-19T07:45:00.000', createdBy: 3, chiNhanhId: 1, nguoiNhanId: 4 },
    { id: 4, noiDung: 'Yêu cầu YC261119-000007 vừa được xếp lịch', createdAt: '2026-11-18T16:00:00.000', createdBy: 4, chiNhanhId: 1, nguoiNhanId: 5 }
  ],
  docThongBaos: [],

  // Actionable schedule/work notifications (ThongBaoLichTrinh) with clickable navigation
  thongBaoLichTrinhs: [
    {
      id: 1, chiNhanhId: 1, nguoiNhanId: 2,
      tieuDe: 'Lịch trình đã được chốt',
      noiDung: 'Yêu cầu "Báo cáo tiến độ chuyển đổi số tháng 11" đã được xếp lịch lúc 09:00 - 09:30 ngày 19/11/2026.',
      loaiSuKien: 'DA_DUYET', yeuCauId: 7, lichTrinhId: 1,
      routeUrl: '/nhan-vien/detail-request/7',
      daDoc: false, ngayDoc: null, createdAt: '2026-11-18T16:00:00.000'
    },
    {
      id: 2, chiNhanhId: 1, nguoiNhanId: 4,
      tieuDe: 'Yêu cầu rất gấp cần xếp lịch',
      noiDung: 'Võ Chiến vừa gửi yêu cầu "Trình duyệt ngân sách nâng cấp hạ tầng server Q4" (Rất gấp, hạn chót 20/11).',
      loaiSuKien: 'YEUCAU_MOI', yeuCauId: 6, lichTrinhId: null,
      routeUrl: '/tro-ly',
      daDoc: false, ngayDoc: null, createdAt: '2026-11-19T07:45:00.000'
    },
    {
      id: 3, chiNhanhId: 1, nguoiNhanId: 5,
      tieuDe: 'Lịch trình hôm nay (19/11)',
      noiDung: 'Bạn có 3 buổi trình hôm nay, bắt đầu lúc 09:00 với Xuân Thắng (Báo cáo tiến độ chuyển đổi số tháng 11).',
      loaiSuKien: 'LICH_HOM_NAY', yeuCauId: 7, lichTrinhId: 1,
      routeUrl: '/lanh-dao',
      daDoc: false, ngayDoc: null, createdAt: '2026-11-19T07:30:00.000'
    }
  ],

  seqMaYeuCau: 9
};

export function nextId(list, key = 'id') {
  return list.reduce((max, item) => Math.max(max, Number(item[key]) || 0), 0) + 1;
}

export function getChiNhanhVaCha(chiNhanhId) {
  const result = new Set();
  let cur = db.chiNhanhs.find((c) => c.chiNhanhId === Number(chiNhanhId));
  while (cur && !result.has(cur.chiNhanhId)) {
    result.add(cur.chiNhanhId);
    cur = cur.parentId != null ? db.chiNhanhs.find((c) => c.chiNhanhId === cur.parentId) : null;
  }
  return result;
}

export function getUserPermissions(userId) {
  const roleIds = new Set(
    db.userRoles
      .filter((ur) => ur.userId === userId)
      .map((ur) => ur.roleId)
  );
  const permIds = new Set(
    db.rolePermissions
      .filter((rp) => roleIds.has(rp.roleId))
      .map((rp) => rp.permissionId)
  );
  return db.permissions
    .filter((p) => permIds.has(p.permissionId))
    .map((p) => p.permissionName);
}

export function enrichUser(user) {
  const cn = db.chiNhanhs.find((c) => c.chiNhanhId === user.chiNhanhId);
  const pb = db.phongBans.find((p) => p.id === user.phongBanId);
  const cv = db.chucVus.find((c) => c.id === user.chucVuId);
  return {
    userId: user.userId,
    userName: user.userName,
    tenNguoiDung: user.tenNguoiDung,
    email: user.email,
    phone: user.phone,
    chiNhanhId: user.chiNhanhId,
    phongBanId: user.phongBanId,
    chucVuId: user.chucVuId,
    tenChiNhanh: cn?.tenChiNhanh ?? null,
    tenPhongBan: pb?.tenPhongBan ?? null,
    tenChucVu: cv?.tenChucVu ?? null,
    isActived: user.isActived
  };
}
