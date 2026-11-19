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
    lanhDaoId: number;
    tenLanhDao: string;
    loaiYeuCauId: number;
    tieuDe: string;
    tomTat?: string;
    mucKhan: number;
    lyDoKhan?: string;
    thoiLuongPhut: number;
    hanChot?: string;
    laBaoMat: boolean;
    trangThai: number;
  };
  gioDeXuats: {
    batDau: string;
    ketThuc: string;
    thuTuUuTien: number;
    nguonDeXuat: number;
  }[];
  nguoiThamDus: {
    userId?: number;
    hoTen?: string;
    donViNgoai?: string;
    vaiTro?: string;
  }[];
  teps: {
    yeuCauId?: number;
    ketQuaTrinhId?: number;
    tenFile: string;
    duongDan: string;
    contentType?: string;
    kichThuoc: number;
  }[];
}
