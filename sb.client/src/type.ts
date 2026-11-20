export interface MainTab {
  id: string;
  label: string;
  icon: string;
  route: string | null;
  appHasPermission?: string;
}
export interface SubTab {
  id: string;
  label: string;
  icon: string;
  route: string;
  parentId: string; // xác định rõ subtab này thuộc main tab nào
  appHasPermission?: string;
}
export interface PermissionResult {
  permissionId: number;
}
export interface RoleSaveRequest {
  roleId: number;
  tenRole: string;
  permissionIds: number[];
  userIds: number[];
}
export interface RoleRow {
  roleId: number;
  tenRole: string;
  isActived: boolean;
  isDeleted: boolean;
}
export interface PermissionRow {
  permissionId: number;
  permissionName: string;
  component: string;
  isActived: boolean;
}
export interface UserRow {
  userId: number;
  userName: string;
  tenNguoiDung: string;
  tenPhongBan: string;
  tenChucVu: string;
  email: string | null;
  phone: string | null;
  chiNhanhId: number;
  phongBanId: number | null;
  chucVuId: number | null;
  tenChiNhanh: string;
  isActived: boolean;
}
export interface UserRoleRow {
  userId: number;
  roleId: number;
}
export interface UserSaveRequest {
  userId: number;
  userName: string;
  tenNguoiDung: string;
  email: string;
  phone: string;
  chiNhanhId: number;
  phongBanId: number | null;
  chucVuId: number | null;
  password: string; // rỗng khi sửa và không đổi pass -> backend tự giữ nguyên
  roleIds: number[];
}
export interface YeuCauItem {
  yeuCauId: number;
  maYeuCau: string;
  tieuDe: string;
  trangThai: number;
  mucKhan: number;
  tenLoai: string;
  lanhDaoId: number;
  tenLanhDao: string;
  maNhom?: string;
  ngayGui?: string;
  ngayHoanTat?: string;
  hanChot?: string;
  lyDoTuChoiHuy?: string;
  createdAt: string;
  lichBatDau?: string;
  lichKetThuc?: string;
  trangThaiLich?: number;
  coDeXuatChoPhanHoi: boolean;
  tongSo: number;
}

export interface YeuCauThongKe {
  theoTrangThai: { trangThai: number; soLuong: number }[];
  canHanhDong: number;
}

export interface YeuCauQuery {
  nhomTrangThai: number; // 0 tất cả, 1 đang xử lý, 2 lịch sử
  trangThai?: number | null;
  tuKhoa?: string;
  page: number; // bắt đầu từ 1
  pageSize: number;
}
export interface LanhDaoChon {
  lanhDaoId: number;
  chiNhanhId: number;
  tenChiNhanh: string;
  hoTen: string;
  tenChucVu?: string;
  capDo: number;
  phongLamViec?: string;
  choXemLich: boolean;
}

export interface LoaiYeuCauChon {
  id: number;
  maLoai: string;
  tenLoai: string;
  thoiLuongMacDinhPhut: number;
}

export interface GioLamViec {
  gioBatDau: string; // "08:00:00"
  gioKetThuc: string;
  nghiTruaTu?: string | null;
  nghiTruaDen?: string | null;
  soNgayLamViecMask: number; // bit0 = CN ... bit6 = T7
  choXemLich: boolean;
}

export interface KhoangBan {
  batDau: string;
  ketThuc: string;
  caNgay: boolean;
}
export interface LichBanResult {
  gioLamViec: GioLamViec;
  khoangBan: KhoangBan[];
}

export interface TepDinhKemInput {
  tenFile: string;
  duongDan: string;
  contentType?: string;
  kichThuoc: number;
  checksum?: string;
}

export interface TaoYeuCauRequest {
  lanhDaoId: number;                 // thay cho lanhDaoIds
  loaiYeuCauId: number;
  tieuDe: string;
  tomTat?: string | null;
  mucKhan: number;
  lyDoKhan?: string | null;
  thoiLuongPhut: number;
  hanChot?: string | null;           // yyyy-MM-ddT00:00:00
  laBaoMat: boolean;
  guiNgay: boolean;
  nguoiThamDus: { userId?: number | null; hoTenNgoai?: string; donViNgoai?: string; vaiTro?: string }[];
  tepDinhKems: TepDinhKemInput[];
}
export type SuaYeuCauRequest = Omit<TaoYeuCauRequest, 'lanhDaoId' | 'tieuDe'>;

export interface YeuCauMoi {
  yeuCauId: number;
  maYeuCau: string;
  lanhDaoId: number;
}

export interface YeuCauChiTiet {
  chung: {
    id: number;
    maYeuCau: string;
    nhomYeuCauId?: number | null;
    maNhom?: string | null;
    nguoiTaoId?: number;
    tenNguoiTao?: string;
    phongBanNguoiTao?: string;
    chucVuNguoiTao?: string;
    chiNhanhNguoiTao?: string;
    lanhDaoId: number;
    tenLanhDao: string;
    loaiYeuCauId: number;
    tenLoai?: string;
    tieuDe: string;
    tomTat?: string | null;
    mucKhan: number;
    lyDoKhan?: string | null;
    mucUuTienId?: number | null;
    tenMucUuTien?: string | null;
    mauMucUuTien?: string | null;
    thoiLuongPhut: number;
    hanChot?: string | null;
    laBaoMat: boolean;
    trangThai: number;
    tenTroLy?: string | null;
    ngayGui?: string | null;
    ngayTiepNhan?: string | null;
    ngayHoanTat?: string | null;
    lyDoTuChoiHuy?: string | null;
    createdAt?: string;
  };
  gioDeXuats: {
    id?: number;
    batDau: string;
    ketThuc: string;
    thuTuUuTien: number;
    nguonDeXuat: number;
    nhanVienDongY?: boolean | null;
    ngayPhanHoi?: string | null;
    ghiChu?: string | null;
  }[];
  nguoiThamDus: {
    id?: number;
    userId?: number | null;
    hoTen?: string | null;
    donViNgoai?: string | null;
    vaiTro?: string | null;
  }[];
  teps: {
    id?: number;
    yeuCauId?: number | null;
    ketQuaTrinhId?: number | null;
    tenFile: string;
    duongDan: string;
    contentType?: string;
    kichThuoc: number;
    createdAt?: string;
  }[];
  binhLuans?: {
    id: number;
    userId: number;
    tenNguoiDung: string;
    noiDung: string;
    chiNoiBo: boolean;
    createdAt: string;
  }[];
  timeline?: {
    id: number;
    tuTrangThai: number | null;
    denTrangThai: number;
    vaiTroThucHien: string;
    nguoiThucHien: string;
    lyDo?: string | null;
    ghiChu?: string | null;
    createdAt: string;
  }[];
  lichTrinhs?: {
    id: number;
    batDau: string;
    ketThuc: string;
    diaDiem?: string | null;
    trangThai: number;
    thuTuTrongNgay?: number | null;
    ngayChot?: string | null;
    daGhiDeXungDot?: boolean;
    lyDoGhiDe?: string | null;
    ghiChuLanhDao?: string | null;
  }[];
  lichSuLich?: {
    id: number;
    hanhDong: number;
    batDauCu?: string | null;
    ketThucCu?: string | null;
    batDauMoi?: string | null;
    ketThucMoi?: string | null;
    lyDo?: string | null;
    nguoiThucHien: string;
    createdAt: string;
  }[];
  ketQuas?: {
    id: number;
    lichTrinhId: number;
    ketQua: number;
    thoiGianThucTe?: string | null;
    chiDaoCuaLanhDao?: string | null;
    ghiChu?: string | null;
    nguoiGhiNhan: string;
    createdAt: string;
  }[];
  congViecs?: {
    id: number;
    ketQuaTrinhId: number;
    noiDung: string;
    nguoiPhuTrachId?: number | null;
    nguoiPhuTrach?: string | null;
    hanXuLy?: string | null;
    trangThai: number;
    ngayHoanThanh?: string | null;
  }[];
}

export interface ThongBaoItem {
  id?: number;
  thongBaoId: number;
  noiDung: string;
  noiDungTB: string;
  createdAt: string;
  chiNhanhId?: number;
  nguoiNhanId?: number | null;
  isRead: boolean;
}

export interface ThongBaoLichTrinhItem {
  id: number;
  chiNhanhId: number;
  nguoiNhanId: number;
  tieuDe: string;
  noiDung: string;
  loaiSuKien: string;
  yeuCauId?: number | null;
  lichTrinhId?: number | null;
  routeUrl?: string | null;
  daDoc: boolean;
  ngayDoc?: string | null;
  createdAt: string;
}

export interface MucUuTienItem {
  id: number;
  code: string;
  ten: string;
  trongSo: number;
  mauHienThi: string;
}

export interface LanhDaoInfo {
  lanhDaoId: number;
  userId: number;
  hoTen: string;
  tenChucVu?: string;
  tenChiNhanh?: string;
  phongLamViec?: string | null;
  capDo?: number;
  troLyUserId?: number | null;
  tenTroLy?: string | null;
}

export interface LanhDaoCauHinh {
  id?: number;
  chiNhanhId?: number;
  lanhDaoId: number;
  gioBatDau: string;
  gioKetThuc: string;
  nghiTruaTu?: string | null;
  nghiTruaDen?: string | null;
  thoiGianDemPhut: number;
  gioiHanPhutMoiNgay: number;
  soNgayLamViecMask: number;
  choNhanVienXemLichTrongBan: boolean;
}

export interface TroLyYeuCauItem {
  yeuCauId: number;
  maYeuCau: string;
  tieuDe: string;
  tomTat?: string | null;
  tenLoai: string;
  trangThai: number;
  mucKhan: number;
  lyDoKhan?: string | null;
  mucUuTienId?: number | null;
  tenMucUuTien?: string | null;
  maMucUuTien?: string | null;
  mauMucUuTien?: string | null;
  trongSoUuTien: number;
  thoiLuongPhut: number;
  hanChot?: string | null;
  laBaoMat: boolean;
  ngayGui?: string | null;
  tenNguoiTrinh: string;
  phongBanNguoiTrinh: string;
  chucVuNguoiTrinh: string;
  soTep: number;
  soThamDu: number;
}

export interface LichTrinhView {
  lichTrinhId: number;
  yeuCauId: number;
  maYeuCau: string;
  tieuDe: string;
  tomTat?: string | null;
  tenLoai: string;
  mucKhan: number;
  lyDoKhan?: string | null;
  mucUuTienId?: number | null;
  tenMucUuTien?: string | null;
  maMucUuTien?: string | null;
  mauMucUuTien?: string | null;
  laBaoMat: boolean;
  thoiLuongPhut: number;
  hanChot?: string | null;
  trangThaiYeuCau: number;
  trangThaiLich: number;
  batDau: string;
  ketThuc: string;
  diaDiem?: string | null;
  daGhiDeXungDot: boolean;
  lyDoGhiDe?: string | null;
  nguoiTrinhId: number;
  tenNguoiTrinh: string;
  phongBanNguoiTrinh: string;
  chucVuNguoiTrinh: string;
  chiNhanhNguoiTrinh: string;
  nguoiThamDus: {
    id: number;
    userId?: number | null;
    hoTen: string;
    donViNgoai?: string;
    vaiTro?: string;
  }[];
  teps: {
    id: number;
    tenFile: string;
    duongDan: string;
    contentType?: string | null;
    kichThuoc: number;
  }[];
  ketQua?: {
    id: number;
    ketQua: number;
    thoiGianThucTe?: string | null;
    chiDaoCuaLanhDao?: string | null;
    ghiChu?: string | null;
    createdAt: string;
  } | null;
  congViecs: {
    id: number;
    ketQuaTrinhId: number;
    noiDung: string;
    nguoiPhuTrachId?: number | null;
    hanXuLy?: string | null;
    trangThai: number;
  }[];
  ghiChuLanhDao?: string | null;
}

export interface SuKienLanhDaoView {
  id: number;
  chiNhanhId: number;
  lanhDaoId: number;
  loai: number;
  tieuDe: string;
  batDau: string;
  ketThuc: string;
  caNgay: boolean;
  laCung: boolean;
  laRiengTu: boolean;
  diaDiem?: string | null;
  ghiChu?: string | null;
}

export interface TroLyDashboard {
  ngay: string;
  lanhDao: LanhDaoInfo;
  cauHinh: LanhDaoCauHinh;
  mucUuTiens: MucUuTienItem[];
  hangCho: TroLyYeuCauItem[];
  lichNgay: LichTrinhView[];
  suKienNgay: SuKienLanhDaoView[];
  thongKe: {
    choXuLy: number;
    gap: number;
    lichHomNay: number;
    choPhanHoi: number;
    tongPhutHomNay: number;
  };
}

export interface LanhDaoDashboard {
  ngay: string;
  lanhDao: LanhDaoInfo;
  cauHinh: LanhDaoCauHinh;
  lichTrinhs: LichTrinhView[];
  suKiens: SuKienLanhDaoView[];
  thongKe: {
    tongBuoiTrinh: number;
    choTrinh: number;
    daTrinh: number;
    tongPhut: number;
    suKienKhac: number;
  };
}

export interface XepLichRequest {
  batDau: string;
  ketThuc: string;
  diaDiem?: string | null;
  mucUuTienId?: number | null;
  ghiChu?: string | null;
  yeuCauXacNhanNV?: boolean;
}

export interface BoSungRequest {
  noiDung: string;
  tomTat?: string | null;
  tepDinhKems?: TepDinhKemInput[];
}

export interface PhanHoiDeXuatRequest {
  thoiGianDeXuatId: number;
  dongY: boolean;
  ghiChu?: string | null;
}

export interface PhanHoiLanhDaoRequest {
  ketQua: number; // 1 = Đã trình, 2 = Vắng/Không trình được, 3 = Hoãn
  hoanThanh?: boolean;
  chiDaoCuaLanhDao?: string | null;
  ghiChuLanhDao?: string | null;
  ghiChu?: string | null;
  congViecs?: {
    noiDung: string;
    hanXuLy?: string | null;
    trangThai?: number;
  }[];
}

