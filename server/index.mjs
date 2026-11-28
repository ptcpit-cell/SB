import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import { db, nextId, getChiNhanhVaCha, getUserPermissions, enrichUser } from './store.mjs';
import { registerTroLyRoutes } from './routes/tro-ly.routes.mjs';
import { registerLanhDaoRoutes } from './routes/lanh-dao.routes.mjs';
import { registerAdminRoutes } from './routes/admin.routes.mjs';
import { registerProfileRoutes } from './routes/profile.routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIST = path.join(ROOT_DIR, 'sb.client', 'dist', 'sb.client', 'browser');
const UPLOAD_ROOT = path.join(__dirname, 'uploads');

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tCKxFPOVqsTpOsy+zJbmYeha/P2HHjxGWmVxYJ9j7RErvz/fzMM7c5TQ8HB6hxvb';
const REFRESH_COOKIE = 'sb_refreshToken';
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.zip']);

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const app = express();
app.use(cookieParser());
app.use(express.json({ strict: false, limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploaded files
app.use('/Files', express.static(UPLOAD_ROOT));
const legacyFilesDir = path.join(ROOT_DIR, 'SB.Server', 'wwwroot', 'Files');
app.use('/Files', express.static(legacyFilesDir));

// =========================================================================
// SignalR Hub (/hubs/thongbao) — JSON Hub Protocol over WebSocket
// =========================================================================
const RECORD_SEP = '\x1e';
const branchGroups = new Map(); // chiNhanhId (string) -> Set<WebSocket>

function addToBranchGroup(branchKey, ws) {
  if (!branchGroups.has(branchKey)) branchGroups.set(branchKey, new Set());
  branchGroups.get(branchKey).add(ws);
  if (!ws._branchGroups) ws._branchGroups = new Set();
  ws._branchGroups.add(branchKey);
}

function removeFromAllGroups(ws) {
  if (!ws._branchGroups) return;
  for (const key of ws._branchGroups) {
    const set = branchGroups.get(key);
    if (set) {
      set.delete(ws);
      if (set.size === 0) branchGroups.delete(key);
    }
  }
}

function broadcastHubEvent(chiNhanhId, target, payload) {
  const set = branchGroups.get(String(chiNhanhId));
  if (!set) return;
  const frame = JSON.stringify({
    type: 1,
    target,
    arguments: [payload]
  }) + RECORD_SEP;
  for (const ws of set) {
    if (ws.readyState === 1) {
      ws.send(frame);
    }
  }
}

/**
 * Emit Type 1: Basic notification (ThongBao)
 * Format: "Yêu cầu {mã} vừa được/bị {trạng thái}"
 */
function emitThongBao(chiNhanhId, createdBy, noiDung, nguoiNhanId = null) {
  const item = {
    id: nextId(db.thongBaos, 'id'),
    noiDung,
    createdAt: new Date().toISOString(),
    createdBy,
    chiNhanhId,
    nguoiNhanId
  };
  db.thongBaos.push(item);
  broadcastHubEvent(chiNhanhId, 'ReceiveNewNotification', {
    ...item,
    thongBaoId: item.id,
    noiDungTB: item.noiDung,
    isRead: false
  });
  return item;
}

/**
 * Emit Type 2: Actionable schedule/work notification (ThongBaoLichTrinh)
 * Supports click-to-navigate to routeUrl (e.g. /nhan-vien/detail-request/:id, /tro-ly, /lanh-dao)
 */
function emitThongBaoLichTrinh({
  chiNhanhId,
  nguoiNhanId,
  tieuDe,
  noiDung,
  loaiSuKien,
  yeuCauId = null,
  lichTrinhId = null,
  routeUrl = '/'
}) {
  if (!nguoiNhanId) return null;
  const item = {
    id: nextId(db.thongBaoLichTrinhs, 'id'),
    chiNhanhId,
    nguoiNhanId,
    tieuDe,
    noiDung,
    loaiSuKien,
    yeuCauId,
    lichTrinhId,
    routeUrl,
    daDoc: false,
    ngayDoc: null,
    createdAt: new Date().toISOString()
  };
  db.thongBaoLichTrinhs.push(item);
  broadcastHubEvent(chiNhanhId, 'ReceiveScheduleNotification', item);
  return item;
}

app.all(/^\/hubs\/thongbao\/negotiate\/?$/i, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  const connectionId = crypto.randomUUID();
  return res.status(200).json({
    negotiateVersion: 1,
    connectionId,
    connectionToken: connectionId,
    availableTransports: [
      {
        transport: 'WebSockets',
        transferFormats: ['Text', 'Binary']
      }
    ]
  });
});

app.use('/hubs', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(404).json({ message: 'SignalR hub endpoint not found.' });
});

// =========================================================================
// Auth & HeaderFilter Middleware (mirrors BaseController + HeaderFilter.cs)
// =========================================================================
function generateAuthResponse(user, rotate = true) {
  const permissions = getUserPermissions(user.userId);
  const accessToken = jwt.sign(
    {
      sub: String(user.userId),
      nameid: String(user.userId),
      unique_name: user.userName,
      ChiNhanhId: String(user.chiNhanhId),
      permissions
    },
    JWT_SECRET,
    { expiresIn: '2h', issuer: 'SB', audience: 'SBClient' }
  );

  if (rotate || !user.refreshToken) {
    user.refreshToken = crypto.randomUUID();
    user.expiryToken = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  }

  const enriched = enrichUser(user);
  return {
    payload: {
      userId: user.userId,
      userName: user.userName,
      tenNguoiDung: user.tenNguoiDung,
      tenChiNhanh: enriched.tenChiNhanh,
      tenChucVu: enriched.tenChucVu,
      tenPhongBan: enriched.tenPhongBan,
      chiNhanhId: user.chiNhanhId,
      permissions,
      accessToken
    },
    refreshToken: user.refreshToken,
    refreshTokenExpiry: new Date(user.expiryToken)
  };
}

function setRefreshCookie(req, res, refreshToken, expires) {
  if (!refreshToken) return;
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/api/Account',
    expires
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.nameid || decoded.sub);
    const claimChiNhanhId = Number(decoded.ChiNhanhId);
    if (!Number.isFinite(userId) || !Number.isFinite(claimChiNhanhId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const headerCn = req.headers['x-chinhanh-id'];
    if (headerCn !== undefined && headerCn !== '') {
      const parsed = Number(headerCn);
      if (!Number.isFinite(parsed)) {
        return res.status(400).send('Mã chi nhánh không hợp lệ.');
      }
      if (parsed !== claimChiNhanhId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    req.currentUserId = userId;
    req.currentChiNhanhId = claimChiNhanhId;
    next();
  } catch {
    return res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ.' });
  }
}

// =========================================================================
// Helpers
// =========================================================================
function formatMaYeuCau(now, seq) {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `YC${yy}${mm}${dd}-${String(seq).padStart(6, '0')}`;
}

function normalizeHanChot(hanChotRaw) {
  if (!hanChotRaw) return null;
  const d = new Date(hanChotRaw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 0);
  return d;
}

function formatTimeShort(isoStr) {
  if (!isoStr) return '';
  const m = String(isoStr).match(/T(\d{2}:\d{2})/);
  if (m) return m[1];
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateVi(isoStr) {
  if (!isoStr) return '';
  const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getYmd(isoStr) {
  if (!isoStr) return '';
  const m = String(isoStr).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function activeTroLysForLanhDao(lanhDaoId) {
  return db.troLys.filter((t) => {
    if (t.lanhDaoId !== lanhDaoId || t.isDeleted || !t.isActived) return false;
    const u = db.users.find((x) => x.userId === t.userId && !x.isDeleted && x.isActived);
    return Boolean(u);
  });
}

function getLanhDaoOfTroLy(troLyUserId) {
  const tl = db.troLys.find((t) => t.userId === troLyUserId && !t.isDeleted && t.isActived);
  if (!tl) return null;
  const ld = db.lanhDaos.find((x) => x.id === tl.lanhDaoId && !x.isDeleted && x.isActived);
  if (!ld) return null;
  const u = db.users.find((x) => x.userId === ld.userId);
  const cn = db.chiNhanhs.find((c) => c.chiNhanhId === ld.chiNhanhId);
  const cv = u ? db.chucVus.find((c) => c.id === u.chucVuId) : null;
  return {
    troLy: tl,
    lanhDao: ld,
    info: {
      lanhDaoId: ld.id,
      userId: ld.userId,
      hoTen: u?.tenNguoiDung ?? '',
      tenChucVu: cv?.tenChucVu ?? 'Lãnh đạo',
      tenChiNhanh: cn?.tenChiNhanh ?? '',
      phongLamViec: ld.phongLamViec ?? ''
    }
  };
}

function getLanhDaoOfUser(userId) {
  const ld = db.lanhDaos.find((x) => x.userId === userId && !x.isDeleted && x.isActived);
  if (!ld) return null;
  const u = db.users.find((x) => x.userId === ld.userId);
  const cn = db.chiNhanhs.find((c) => c.chiNhanhId === ld.chiNhanhId);
  const cv = u ? db.chucVus.find((c) => c.id === u.chucVuId) : null;
  const tl = activeTroLysForLanhDao(ld.id)[0] ?? null;
  const tlUser = tl ? db.users.find((x) => x.userId === tl.userId) : null;
  return {
    lanhDao: ld,
    info: {
      lanhDaoId: ld.id,
      userId: ld.userId,
      hoTen: u?.tenNguoiDung ?? '',
      tenChucVu: cv?.tenChucVu ?? 'Lãnh đạo',
      tenChiNhanh: cn?.tenChiNhanh ?? '',
      phongLamViec: ld.phongLamViec ?? '',
      troLyUserId: tl?.userId ?? null,
      tenTroLy: tlUser?.tenNguoiDung ?? null
    }
  };
}

function getOrCreateCauHinh(lanhDaoId, chiNhanhId) {
  let ch = db.lanhDaoCauHinhs.find((c) => c.lanhDaoId === lanhDaoId && !c.isDeleted);
  if (!ch) {
    ch = {
      id: nextId(db.lanhDaoCauHinhs, 'id'),
      chiNhanhId,
      lanhDaoId,
      gioBatDau: '08:00:00',
      gioKetThuc: '17:00:00',
      nghiTruaTu: '12:00:00',
      nghiTruaDen: '13:30:00',
      thoiGianDemPhut: 10,
      gioiHanPhutMoiNgay: 180,
      soNgayLamViecMask: 62,
      choNhanVienXemLichTrongBan: true,
      isActived: true,
      isDeleted: false
    };
    db.lanhDaoCauHinhs.push(ch);
  }
  return ch;
}

function buildChiTietYeuCau(yc, includeInternal = false) {
  const id = yc.id;
  const lo = db.loaiYeuCaus.find((x) => x.id === yc.loaiYeuCauId);
  const ld = db.lanhDaos.find((x) => x.id === yc.lanhDaoId);
  const ul = ld ? db.users.find((u) => u.userId === ld.userId) : null;
  const nguoiTao = db.users.find((u) => u.userId === yc.nguoiTaoId);
  const enrichedNguoiTao = nguoiTao ? enrichUser(nguoiTao) : null;
  const nh = yc.nhomYeuCauId ? db.nhomYeuCaus.find((n) => n.id === yc.nhomYeuCauId) : null;
  const mu = yc.mucUuTienId ? db.mucUuTiens.find((m) => m.id === yc.mucUuTienId) : null;
  const ut = yc.troLyXuLyId ? db.users.find((u) => u.userId === yc.troLyXuLyId) : null;
  const ketQuaIds = new Set(db.ketQuaTrinhs.filter((k) => k.yeuCauId === id && !k.isDeleted).map((k) => k.id));

  return {
    chung: {
      id: yc.id,
      maYeuCau: yc.maYeuCau,
      nhomYeuCauId: yc.nhomYeuCauId,
      maNhom: nh?.maNhom ?? null,
      nguoiTaoId: yc.nguoiTaoId,
      tenNguoiTao: enrichedNguoiTao?.tenNguoiDung ?? '',
      phongBanNguoiTao: enrichedNguoiTao?.tenPhongBan ?? '',
      chucVuNguoiTao: enrichedNguoiTao?.tenChucVu ?? '',
      chiNhanhNguoiTao: enrichedNguoiTao?.tenChiNhanh ?? '',
      lanhDaoId: yc.lanhDaoId,
      tenLanhDao: ul?.tenNguoiDung ?? '',
      loaiYeuCauId: yc.loaiYeuCauId,
      tenLoai: lo?.tenLoai ?? '',
      tieuDe: yc.tieuDe,
      tomTat: yc.tomTat,
      mucKhan: yc.mucKhan,
      lyDoKhan: yc.lyDoKhan,
      mucUuTienId: yc.mucUuTienId,
      tenMucUuTien: mu?.ten ?? null,
      mauMucUuTien: mu?.mauHienThi ?? null,
      thoiLuongPhut: yc.thoiLuongPhut,
      hanChot: yc.hanChot,
      laBaoMat: yc.laBaoMat,
      trangThai: yc.trangThai,
      tenTroLy: ut?.tenNguoiDung ?? null,
      ngayGui: yc.ngayGui,
      ngayTiepNhan: yc.ngayTiepNhan,
      ngayHoanTat: yc.ngayHoanTat,
      lyDoTuChoiHuy: yc.lyDoTuChoiHuy,
      createdAt: yc.createdAt
    },
    gioDeXuats: db.yeuCauThoiGianDeXuats
      .filter((t) => t.yeuCauId === id && !t.isDeleted && t.isActived)
      .sort((a, b) => b.nguonDeXuat - a.nguonDeXuat || a.thuTuUuTien - b.thuTuUuTien || b.id - a.id),
    nguoiThamDus: db.yeuCauNguoiThamDus
      .filter((p) => p.yeuCauId === id && !p.isDeleted && p.isActived)
      .map((p) => {
        const u = p.userId ? db.users.find((x) => x.userId === p.userId) : null;
        return {
          id: p.id,
          userId: p.userId ?? null,
          hoTen: u?.tenNguoiDung ?? p.hoTenNgoai ?? null,
          donViNgoai: p.donViNgoai ?? null,
          vaiTro: p.vaiTro ?? null
        };
      }),
    teps: db.tepDinhKems
      .filter((t) => !t.isDeleted && t.isActived && (t.yeuCauId === id || (t.ketQuaTrinhId && ketQuaIds.has(t.ketQuaTrinhId))))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    binhLuans: db.yeuCauBinhLuans
      .filter((b) => b.yeuCauId === id && !b.isDeleted && b.isActived && (includeInternal || !b.chiNoiBo))
      .map((b) => ({
        id: b.id,
        userId: b.userId,
        tenNguoiDung: db.users.find((u) => u.userId === b.userId)?.tenNguoiDung ?? '',
        noiDung: b.noiDung,
        chiNoiBo: Boolean(b.chiNoiBo),
        createdAt: b.createdAt
      })),
    timeline: db.yeuCauLichSuTrangThais
      .filter((h) => h.yeuCauId === id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id)
      .map((h) => ({
        id: h.id,
        tuTrangThai: h.tuTrangThai,
        denTrangThai: h.denTrangThai,
        vaiTroThucHien: h.vaiTroThucHien,
        nguoiThucHien: db.users.find((u) => u.userId === h.nguoiThucHienId)?.tenNguoiDung ?? '',
        lyDo: h.lyDo,
        ghiChu: h.ghiChu,
        createdAt: h.createdAt
      })),
    lichTrinhs: db.lichTrinhs
      .filter((lt) => lt.yeuCauId === id && !lt.isDeleted)
      .map((lt) => ({
        id: lt.id,
        batDau: lt.batDau,
        ketThuc: lt.ketThuc,
        diaDiem: lt.diaDiem,
        trangThai: lt.trangThai,
        thuTuTrongNgay: lt.thuTuTrongNgay,
        ngayChot: lt.ngayChot,
        daGhiDeXungDot: lt.daGhiDeXungDot,
        lyDoGhiDe: lt.lyDoGhiDe,
        ...(includeInternal ? { ghiChuLanhDao: lt.ghiChuLanhDao } : {})
      })),
    lichSuLich: db.lichTrinhLichSus
      .filter((s) => s.yeuCauId === id)
      .map((s) => ({
        ...s,
        nguoiThucHien: db.users.find((u) => u.userId === s.nguoiThucHienId)?.tenNguoiDung ?? ''
      })),
    ketQuas: db.ketQuaTrinhs
      .filter((k) => k.yeuCauId === id && !k.isDeleted)
      .map((k) => ({
        ...k,
        nguoiGhiNhan: db.users.find((u) => u.userId === k.nguoiGhiNhanId)?.tenNguoiDung ?? ''
      })),
    congViecs: db.congViecSauTrinhs
      .filter((cv) => ketQuaIds.has(cv.ketQuaTrinhId) && !cv.isDeleted && cv.isActived)
      .map((cv) => ({
        ...cv,
        nguoiPhuTrach: db.users.find((u) => u.userId === cv.nguoiPhuTrachId)?.tenNguoiDung ?? null
      }))
  };
}

function buildLichTrinhView(lt, includePrivateNote = false) {
  const yc = db.yeuCaus.find((x) => x.id === lt.yeuCauId);
  if (!yc) return null;
  const lo = db.loaiYeuCaus.find((x) => x.id === yc.loaiYeuCauId);
  const mu = yc.mucUuTienId ? db.mucUuTiens.find((m) => m.id === yc.mucUuTienId) : null;
  const nguoiTao = db.users.find((u) => u.userId === yc.nguoiTaoId);
  const enrichedCreator = nguoiTao ? enrichUser(nguoiTao) : null;
  const ketQua = db.ketQuaTrinhs
    .filter((k) => k.lichTrinhId === lt.id && !k.isDeleted)
    .sort((a, b) => b.id - a.id)[0] ?? null;
  const congViecs = ketQua
    ? db.congViecSauTrinhs.filter((cv) => cv.ketQuaTrinhId === ketQua.id && !cv.isDeleted && cv.isActived)
    : [];
  const nguoiThamDus = db.yeuCauNguoiThamDus
    .filter((p) => p.yeuCauId === yc.id && !p.isDeleted && p.isActived)
    .map((p) => {
      const u = p.userId ? db.users.find((x) => x.userId === p.userId) : null;
      return {
        id: p.id,
        userId: p.userId ?? null,
        hoTen: u?.tenNguoiDung ?? p.hoTenNgoai ?? '',
        donViNgoai: p.donViNgoai ?? '',
        vaiTro: p.vaiTro ?? ''
      };
    });
  const teps = db.tepDinhKems
    .filter((t) => t.yeuCauId === yc.id && !t.isDeleted && t.isActived)
    .map((t) => ({
      id: t.id,
      tenFile: t.tenFile,
      duongDan: t.duongDan,
      contentType: t.contentType,
      kichThuoc: t.kichThuoc
    }));

  return {
    lichTrinhId: lt.id,
    yeuCauId: yc.id,
    maYeuCau: yc.maYeuCau,
    tieuDe: yc.tieuDe,
    tomTat: yc.tomTat,
    tenLoai: lo?.tenLoai ?? '',
    mucKhan: yc.mucKhan,
    lyDoKhan: yc.lyDoKhan,
    mucUuTienId: yc.mucUuTienId,
    tenMucUuTien: mu?.ten ?? null,
    maMucUuTien: mu?.code ?? null,
    mauMucUuTien: mu?.mauHienThi ?? null,
    laBaoMat: yc.laBaoMat,
    thoiLuongPhut: yc.thoiLuongPhut,
    hanChot: yc.hanChot,
    trangThaiYeuCau: yc.trangThai,
    trangThaiLich: lt.trangThai,
    batDau: lt.batDau,
    ketThuc: lt.ketThuc,
    diaDiem: lt.diaDiem,
    daGhiDeXungDot: lt.daGhiDeXungDot,
    lyDoGhiDe: lt.lyDoGhiDe,
    nguoiTrinhId: yc.nguoiTaoId,
    tenNguoiTrinh: enrichedCreator?.tenNguoiDung ?? '',
    phongBanNguoiTrinh: enrichedCreator?.tenPhongBan ?? '',
    chucVuNguoiTrinh: enrichedCreator?.tenChucVu ?? '',
    chiNhanhNguoiTrinh: enrichedCreator?.tenChiNhanh ?? '',
    nguoiThamDus,
    teps,
    ketQua: ketQua
      ? {
          id: ketQua.id,
          ketQua: ketQua.ketQua,
          thoiGianThucTe: ketQua.thoiGianThucTe,
          chiDaoCuaLanhDao: ketQua.chiDaoCuaLanhDao,
          ghiChu: ketQua.ghiChu,
          createdAt: ketQua.createdAt
        }
      : null,
    congViecs,
    ...(includePrivateNote ? { ghiChuLanhDao: lt.ghiChuLanhDao } : {})
  };
}

// =========================================================================
// AccountController (/api/Account/*)
// =========================================================================
app.post('/api/Account/login', (req, res) => {
  const userName = req.body?.userName ?? req.body?.UserName ?? '';
  const password = req.body?.password ?? req.body?.Password ?? '';
  const user = db.users.find(
    (u) => u.userName.toLowerCase() === String(userName).toLowerCase() && !u.isDeleted && u.isActived
  );
  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    return res.status(401).send('Tài khoản hoặc mật khẩu không đúng.');
  }

  const result = generateAuthResponse(user, true);
  setRefreshCookie(req, res, result.refreshToken, result.refreshTokenExpiry);
  return res.json(result.payload);
});

app.post('/api/Account/refresh-token', (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) return res.status(401).end();

  const now = Date.now();
  const user = db.users.find(
    (u) => u.refreshToken === refreshToken && u.expiryToken && new Date(u.expiryToken).getTime() > now && !u.isDeleted && u.isActived
  );
  if (!user) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/Account' });
    return res.status(401).end();
  }

  const result = generateAuthResponse(user, false);
  setRefreshCookie(req, res, result.refreshToken, result.refreshTokenExpiry);
  return res.json(result.payload);
});

app.post('/api/Account/logout', (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    const user = db.users.find((u) => u.refreshToken === refreshToken);
    if (user) {
      user.refreshToken = null;
      user.expiryToken = null;
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/Account' });
  return res.status(204).end();
});

app.post('/api/Account/ChangePassword/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  const oldPassword = req.body?.oldPassword ?? req.body?.OldPassword ?? '';
  const newPassword = req.body?.newPassword ?? req.body?.NewPassword ?? '';

  if (!oldPassword || !newPassword) {
    return res.status(400).send('Dữ liệu mật khẩu không được để trống.');
  }
  if (oldPassword === newPassword) {
    return res.status(400).send('Mật khẩu mới không được trùng với mật khẩu cũ.');
  }

  const user = db.users.find((u) => u.userId === userId && !u.isDeleted);
  if (!user || !bcrypt.compareSync(String(oldPassword), user.password)) {
    return res.status(400).send('Mật khẩu cũ không chính xác hoặc tài khoản không tồn tại trên hệ thống.');
  }

  user.password = bcrypt.hashSync(String(newPassword), 10);
  user.refreshToken = null;
  user.expiryToken = null;
  return res.json({ message: 'Thay đổi mật khẩu thành công!' });
});

// =========================================================================
// CommonController (/api/Common/*) — includes 2-tier notifications
// =========================================================================
app.get('/api/Common/GetChiNhanh', requireAuth, (req, res) => {
  res.json(db.chiNhanhs.filter((c) => c.isActived !== false));
});

app.post('/api/Common/CreateChiNhanh', requireAuth, (req, res) => {
  const body = req.body || {};
  const maChiNhanh = String(body.maChiNhanh ?? body.MaChiNhanh ?? '').trim();
  const tenChiNhanh = String(body.tenChiNhanh ?? body.TenChiNhanh ?? '').trim();
  const chiNhanhType = Number(body.chiNhanhType ?? body.ChiNhanhType ?? 3);
  const rawParent = body.parentId ?? body.ParentId;
  const parentId = rawParent !== null && rawParent !== undefined && rawParent !== '' && rawParent !== 'null'
    ? Number(rawParent)
    : null;

  if (!maChiNhanh || !tenChiNhanh) {
    return res.status(400).json({ message: 'Vui lòng nhập mã và tên chi nhánh.' });
  }
  if (![2, 3].includes(chiNhanhType)) {
    return res.status(400).json({ message: 'Loại chi nhánh chỉ nhận Đại lý (2) hoặc Cửa hàng (3).' });
  }

  db.chiNhanhs.push({
    chiNhanhId: nextId(db.chiNhanhs, 'chiNhanhId'),
    parentId,
    chiNhanhType,
    maChiNhanh,
    tenChiNhanh,
    address: null,
    phone: null,
    isActived: true
  });
  res.json(true);
});

app.put('/api/Common/UpdateChiNhanh', requireAuth, (req, res) => {
  const body = req.body || {};
  const id = Number(body.chiNhanhId ?? body.ChiNhanhId);
  const maChiNhanh = String(body.maChiNhanh ?? body.MaChiNhanh ?? '').trim();
  const tenChiNhanh = String(body.tenChiNhanh ?? body.TenChiNhanh ?? '').trim();
  const chiNhanhType = Number(body.chiNhanhType ?? body.ChiNhanhType ?? 3);
  const rawParent = body.parentId ?? body.ParentId;
  const parentId = rawParent !== null && rawParent !== undefined && rawParent !== '' && rawParent !== 'null'
    ? Number(rawParent)
    : null;

  if (!maChiNhanh || !tenChiNhanh) {
    return res.status(400).json({ message: 'Vui lòng nhập mã và tên chi nhánh.' });
  }
  if (parentId !== null && parentId === id) {
    return res.status(400).json({ message: 'Chi nhánh cha không thể trùng với chính chi nhánh này.' });
  }

  const cn = db.chiNhanhs.find((c) => c.chiNhanhId === id);
  if (cn) {
    cn.parentId = parentId;
    cn.chiNhanhType = chiNhanhType;
    cn.maChiNhanh = maChiNhanh;
    cn.tenChiNhanh = tenChiNhanh;
    cn.address = null;
    cn.phone = null;
  }
  res.json(true);
});

app.delete('/api/Common/DeleteChiNhanh/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const cn = db.chiNhanhs.find((c) => c.chiNhanhId === id);
  if (cn) cn.isActived = false;
  res.json(true);
});

app.get('/api/Common/GetMyNotifications', requireAuth, (req, res) => {
  const userId = Number(req.query.userId || req.currentUserId);
  const readSet = new Set(db.docThongBaos.filter((d) => d.userId === userId).map((d) => d.thongBaoId));
  const list = db.thongBaos
    .filter((tb) => tb.chiNhanhId === req.currentChiNhanhId && (tb.nguoiNhanId == null || tb.nguoiNhanId === userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((tb) => ({
      id: tb.id,
      thongBaoId: tb.id,
      noiDung: tb.noiDung,
      noiDungTB: tb.noiDung,
      createdAt: tb.createdAt,
      chiNhanhId: tb.chiNhanhId,
      isRead: readSet.has(tb.id)
    }));
  res.json(list);
});

app.post('/api/Common/MarkAsReadBulk', requireAuth, (req, res) => {
  const userId = Number(req.query.userId || req.currentUserId);
  const ids = Array.isArray(req.body) ? req.body.map(Number) : [];
  for (const id of ids) {
    if (!db.docThongBaos.some((d) => d.thongBaoId === id && d.userId === userId)) {
      db.docThongBaos.push({ thongBaoId: id, userId });
    }
  }
  res.json({ message: 'Đã cập nhật trạng thái đọc thành công.' });
});

app.get('/api/Common/GetThongBaoLichTrinh', requireAuth, (req, res) => {
  const userId = req.currentUserId;
  const list = db.thongBaoLichTrinhs
    .filter((t) => t.nguoiNhanId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.post('/api/Common/MarkThongBaoLichTrinhRead/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const item = db.thongBaoLichTrinhs.find((t) => t.id === id && t.nguoiNhanId === req.currentUserId);
  if (item) {
    item.daDoc = true;
    item.ngayDoc = new Date().toISOString();
  }
  res.json({ message: 'Đã đánh dấu đã đọc.' });
});

app.post('/api/Common/MarkAllThongBaoLichTrinhRead', requireAuth, (req, res) => {
  const nowIso = new Date().toISOString();
  for (const item of db.thongBaoLichTrinhs) {
    if (item.nguoiNhanId === req.currentUserId && !item.daDoc) {
      item.daDoc = true;
      item.ngayDoc = nowIso;
    }
  }
  res.json({ message: 'Đã đánh dấu tất cả đã đọc.' });
});

app.get('/api/Common/GetPhongBan', requireAuth, (req, res) => {
  const list = db.phongBans.filter((p) => !p.isDeleted).sort((a, b) => b.id - a.id);
  res.json(list);
});

app.post('/api/Common/CreatePhongBan', requireAuth, (req, res) => {
  const body = req.body || {};
  db.phongBans.push({
    id: nextId(db.phongBans, 'id'),
    chiNhanhId: Number(body.chiNhanhId ?? body.ChiNhanhId ?? req.currentChiNhanhId),
    parentId: body.parentId ?? body.ParentId ?? null,
    maPhongBan: body.maPhongBan ?? body.MaPhongBan ?? '',
    tenPhongBan: body.tenPhongBan ?? body.TenPhongBan ?? '',
    isDeleted: false
  });
  res.json(true);
});

app.put('/api/Common/UpdatePhongBan', requireAuth, (req, res) => {
  const body = req.body || {};
  const id = Number(body.id ?? body.Id);
  const pb = db.phongBans.find((p) => p.id === id);
  if (pb) {
    pb.chiNhanhId = Number(body.chiNhanhId ?? body.ChiNhanhId ?? pb.chiNhanhId);
    pb.parentId = body.parentId ?? body.ParentId ?? null;
    pb.maPhongBan = body.maPhongBan ?? body.MaPhongBan ?? pb.maPhongBan;
    pb.tenPhongBan = body.tenPhongBan ?? body.TenPhongBan ?? pb.tenPhongBan;
  }
  res.json(true);
});

app.delete('/api/Common/DeletePhongBan/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const pb = db.phongBans.find((p) => p.id === id);
  if (pb) pb.isDeleted = true;
  res.json(true);
});

app.get('/api/Common/GetChucVu', requireAuth, (req, res) => {
  const list = [...db.chucVus].sort((a, b) => a.capBac - b.capBac);
  res.json(list);
});

// =========================================================================
// UserController (/api/User/*)
// =========================================================================
app.get('/api/User/GetPermission', requireAuth, (req, res) => {
  res.json(db.permissions);
});

app.post('/api/User/UpdatePermissionStatus', requireAuth, (req, res) => {
  const permissionId = Number(req.query.permissionId ?? req.query.PermissionId ?? req.body?.permissionId);
  const isActived = String(req.query.isActived ?? req.query.IsActived ?? req.body?.isActived) === 'true';
  const perm = db.permissions.find((p) => p.permissionId === permissionId);
  if (perm) perm.isActived = isActived;
  res.json({ message: 'Cập nhật trạng thái quyền thành công' });
});

app.post('/api/User/UpdatePermissionStatus/:permissionId', requireAuth, (req, res) => {
  const permissionId = Number(req.params.permissionId);
  const isActived = typeof req.body === 'boolean' ? req.body : Boolean(req.body?.isActived);
  const perm = db.permissions.find((p) => p.permissionId === permissionId);
  if (perm) perm.isActived = isActived;
  res.json({ message: 'Cập nhật trạng thái quyền thành công' });
});

app.get('/api/User/GetRole', requireAuth, (req, res) => {
  res.json(db.roles.filter((r) => !r.isDeleted));
});

app.post('/api/User/UpdateRoleStatus/:roleId', requireAuth, (req, res) => {
  const roleId = Number(req.params.roleId);
  const isActived = typeof req.body === 'boolean' ? req.body : Boolean(req.body?.isActived);
  const role = db.roles.find((r) => r.roleId === roleId);
  if (role) role.isActived = isActived;
  res.json({ message: 'Cập nhật trạng thái nhóm quyền thành công' });
});

app.get('/api/User/GetPermissionIdsByRoleId/:roleId', requireAuth, (req, res) => {
  const roleId = Number(req.params.roleId);
  const list = db.rolePermissions
    .filter((rp) => rp.roleId === roleId)
    .map((rp) => ({ permissionId: rp.permissionId }));
  res.json(list);
});

app.post('/api/User/UpdatePermissions', requireAuth, (req, res) => {
  const body = req.body || {};
  const tenRole = body.tenRole ?? body.TenRole ?? '';
  if (!tenRole) {
    return res.status(400).json({ message: 'Tên nhóm quyền không được để trống' });
  }

  let roleId = Number(body.roleId ?? body.RoleId ?? 0);
  if (roleId === 0) {
    roleId = nextId(db.roles, 'roleId');
    db.roles.push({ roleId, tenRole, isDeleted: false, isActived: true });
  } else {
    const role = db.roles.find((r) => r.roleId === roleId);
    if (role) role.tenRole = tenRole;
  }

  db.rolePermissions = db.rolePermissions.filter((rp) => rp.roleId !== roleId);
  const permissionIds = body.permissionIds ?? body.PermissionIds ?? [];
  for (const pId of permissionIds) {
    db.rolePermissions.push({ roleId, permissionId: Number(pId) });
  }

  const userIds = body.userIds ?? body.UserIds;
  if (Array.isArray(userIds) && userIds.length > 0) {
    db.userRoles = db.userRoles.filter((ur) => ur.roleId !== roleId);
    for (const uId of userIds) {
      db.userRoles.push({ userId: Number(uId), roleId });
    }
  }

  res.json({ message: 'Lưu cấu hình quyền thành công' });
});

app.delete('/api/User/DeleteRole/:roleId', requireAuth, (req, res) => {
  const roleId = Number(req.params.roleId);
  const role = db.roles.find((r) => r.roleId === roleId);
  if (role) role.isDeleted = true;
  res.json(true);
});

app.get('/api/User/GetAllUsers', requireAuth, (req, res) => {
  const list = db.users.filter((u) => !u.isDeleted).map(enrichUser);
  res.json(list);
});

app.post('/api/User/UpdateUserStatus/:userId', requireAuth, (req, res) => {
  const userId = Number(req.params.userId);
  const isActived = typeof req.body === 'boolean' ? req.body : Boolean(req.body?.isActived);
  const user = db.users.find((u) => u.userId === userId);
  if (user) user.isActived = isActived;
  res.json({ message: 'Cập nhật trạng thái người dùng thành công' });
});

app.get('/api/User/GetAllUserRoles', requireAuth, (req, res) => {
  res.json(db.userRoles.map((ur) => ({ userId: ur.userId, roleId: ur.roleId })));
});

app.post('/api/User/CreateUser', requireAuth, (req, res) => {
  const body = req.body || {};
  const userName = String(body.userName ?? body.UserName ?? '').trim();
  if (!userName || db.users.some((u) => u.userName.toLowerCase() === userName.toLowerCase() && !u.isDeleted)) {
    return res.status(400).json({ message: 'Tên tài khoản đã tồn tại hoặc có lỗi xảy ra.' });
  }

  const newUserId = nextId(db.users, 'userId');
  const password = String(body.password ?? body.Password ?? '123456');
  db.users.push({
    userId: newUserId,
    userName,
    password: bcrypt.hashSync(password, 10),
    tenNguoiDung: body.tenNguoiDung ?? body.TenNguoiDung ?? userName,
    email: body.email ?? body.Email ?? '',
    phone: body.phone ?? body.Phone ?? '',
    phongBanId: body.phongBanId ?? body.PhongBanId ?? null,
    chucVuId: body.chucVuId ?? body.ChucVuId ?? null,
    chiNhanhId: Number(body.chiNhanhId ?? body.ChiNhanhId ?? req.currentChiNhanhId),
    isDeleted: false,
    isActived: true,
    trangThai: null,
    refreshToken: null,
    expiryToken: null,
    zaloId: null
  });

  const roleIds = body.roleIds ?? body.RoleIds ?? [];
  for (const rId of roleIds) {
    db.userRoles.push({ userId: newUserId, roleId: Number(rId) });
  }

  res.json({ message: 'Thêm mới thành công' });
});

app.put('/api/User/UpdateUser', requireAuth, (req, res) => {
  const body = req.body || {};
  const userId = Number(body.userId ?? body.UserId);
  const user = db.users.find((u) => u.userId === userId && !u.isDeleted);
  if (!user) {
    return res.status(400).json({ message: 'Không thể cập nhật người dùng.' });
  }

  user.tenNguoiDung = body.tenNguoiDung ?? body.TenNguoiDung ?? user.tenNguoiDung;
  user.email = body.email ?? body.Email ?? user.email;
  user.phone = body.phone ?? body.Phone ?? user.phone;
  user.phongBanId = body.phongBanId ?? body.PhongBanId ?? null;
  user.chucVuId = body.chucVuId ?? body.ChucVuId ?? null;
  if (body.chiNhanhId ?? body.ChiNhanhId) {
    user.chiNhanhId = Number(body.chiNhanhId ?? body.ChiNhanhId);
  }
  const newPassword = body.password ?? body.Password;
  if (newPassword) {
    user.password = bcrypt.hashSync(String(newPassword), 10);
  }

  db.userRoles = db.userRoles.filter((ur) => ur.userId !== userId);
  const roleIds = body.roleIds ?? body.RoleIds ?? [];
  for (const rId of roleIds) {
    db.userRoles.push({ userId, roleId: Number(rId) });
  }

  res.json({ message: 'Cập nhật thành công' });
});

app.delete('/api/User/DeleteUser/:userId', requireAuth, (req, res) => {
  const userId = Number(req.params.userId);
  const user = db.users.find((u) => u.userId === userId);
  if (user) user.isDeleted = true;
  res.json(true);
});

// =========================================================================
// RequestController (/api/Request/*) — Employee Request Flow
// =========================================================================
app.get('/api/Request/GetLanhDaoChon', requireAuth, (req, res) => {
  const user = db.users.find((u) => u.userId === req.currentUserId && !u.isDeleted && u.isActived);
  if (!user) return res.status(400).json({ message: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa.' });

  const allowedBranches = getChiNhanhVaCha(user.chiNhanhId);
  const rows = db.lanhDaos
    .filter((ld) => !ld.isDeleted && ld.isActived && ld.userId !== user.userId && allowedBranches.has(ld.chiNhanhId))
    .map((ld) => {
      const u = db.users.find((x) => x.userId === ld.userId && !x.isDeleted && x.isActived);
      if (!u) return null;
      const cn = db.chiNhanhs.find((c) => c.chiNhanhId === ld.chiNhanhId);
      const cv = db.chucVus.find((c) => c.id === u.chucVuId);
      const ch = db.lanhDaoCauHinhs.find((c) => c.lanhDaoId === ld.id && !c.isDeleted);
      return {
        lanhDaoId: ld.id,
        chiNhanhId: ld.chiNhanhId,
        tenChiNhanh: cn?.tenChiNhanh ?? '',
        hoTen: u.tenNguoiDung,
        tenChucVu: cv?.tenChucVu ?? null,
        capDo: ld.capDo,
        phongLamViec: ld.phongLamViec ?? null,
        choXemLich: ch ? Boolean(ch.choNhanVienXemLichTrongBan) : true,
        _thuTu: ld.thuTuHienThi
      };
    })
    .filter(Boolean)
    .sort((a, b) => a._thuTu - b._thuTu || a.capDo - b.capDo || a.hoTen.localeCompare(b.hoTen))
    .map(({ _thuTu, ...rest }) => rest);

  res.json(rows);
});

app.get('/api/Request/GetLoaiYeuCau', requireAuth, (req, res) => {
  const user = db.users.find((u) => u.userId === req.currentUserId && !u.isDeleted && u.isActived);
  if (!user) return res.status(400).json({ message: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa.' });

  const allowedBranches = getChiNhanhVaCha(user.chiNhanhId);
  const rows = db.loaiYeuCaus
    .filter((l) => !l.isDeleted && l.isActived && allowedBranches.has(l.chiNhanhId))
    .sort((a, b) => a.thuTu - b.thuTu || a.tenLoai.localeCompare(b.tenLoai))
    .map((l) => ({
      id: l.id,
      maLoai: l.maLoai,
      tenLoai: l.tenLoai,
      thoiLuongMacDinhPhut: l.thoiLuongMacDinhPhut
    }));
  res.json(rows);
});

app.get('/api/Request/GetLichBan/:id', requireAuth, (req, res) => {
  const lanhDaoId = Number(req.params.id);
  const tuNgay = new Date(req.query.tuNgay);
  const denNgay = new Date(req.query.denNgay);
  const user = db.users.find((u) => u.userId === req.currentUserId && !u.isDeleted && u.isActived);
  if (!user) return res.status(400).json({ message: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa.' });

  const allowedBranches = getChiNhanhVaCha(user.chiNhanhId);
  const ld = db.lanhDaos.find(
    (x) => x.id === lanhDaoId && !x.isDeleted && x.isActived && allowedBranches.has(x.chiNhanhId)
  );
  if (!ld) return res.status(400).json({ message: 'Lãnh đạo không hợp lệ.' });
  if (Number.isNaN(tuNgay.getTime()) || Number.isNaN(denNgay.getTime()) || denNgay <= tuNgay) {
    return res.status(400).json({ message: 'Khoảng thời gian xem lịch không hợp lệ (tối đa 62 ngày).' });
  }

  const ch = db.lanhDaoCauHinhs.find((c) => c.lanhDaoId === lanhDaoId && !c.isDeleted);
  const choXemLich = ch ? Boolean(ch.choNhanVienXemLichTrongBan) : true;
  const gioLamViec = {
    gioBatDau: ch?.gioBatDau ?? '08:00:00',
    gioKetThuc: ch?.gioKetThuc ?? '17:00:00',
    nghiTruaTu: ch?.nghiTruaTu ?? null,
    nghiTruaDen: ch?.nghiTruaDen ?? null,
    soNgayLamViecMask: ch?.soNgayLamViecMask ?? 62,
    choXemLich
  };

  let khoangBan = [];
  if (choXemLich) {
    const ltRows = db.lichTrinhs
      .filter((lt) => lt.lanhDaoId === lanhDaoId && !lt.isDeleted && lt.isActived && [1, 2].includes(lt.trangThai))
      .filter((lt) => new Date(lt.batDau) < denNgay && new Date(lt.ketThuc) > tuNgay)
      .map((lt) => ({ batDau: lt.batDau, ketThuc: lt.ketThuc, caNgay: false }));
    const skRows = db.suKienLanhDaos
      .filter((sk) => sk.lanhDaoId === lanhDaoId && !sk.isDeleted && sk.isActived)
      .filter((sk) => new Date(sk.batDau) < denNgay && new Date(sk.ketThuc) > tuNgay)
      .map((sk) => ({ batDau: sk.batDau, ketThuc: sk.ketThuc, caNgay: Boolean(sk.caNgay) }));
    khoangBan = [...ltRows, ...skRows].sort((a, b) => new Date(a.batDau) - new Date(b.batDau));
  }

  res.json({ gioLamViec, khoangBan });
});

app.get('/api/Request/GetYeuCau', requireAuth, (req, res) => {
  const nhomTrangThai = Number(req.query.nhomTrangThai ?? 0);
  const trangThai = req.query.trangThai !== undefined && req.query.trangThai !== '' ? Number(req.query.trangThai) : null;
  const lanhDaoId = req.query.lanhDaoId !== undefined && req.query.lanhDaoId !== '' ? Number(req.query.lanhDaoId) : null;
  const parseLocalDay = (raw, addDays = 0) => {
    if (!raw) return null;
    const str = String(raw).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + addDays, 0, 0, 0, 0);
    }
    const dt = new Date(str);
    if (isNaN(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + addDays, 0, 0, 0, 0);
  };
  const tuNgay = parseLocalDay(req.query.tuNgay, 0);
  const denNgay = parseLocalDay(req.query.denNgay, 1);
  const tuKhoa = req.query.tuKhoa ? String(req.query.tuKhoa).trim().toLowerCase() : null;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  const processingStatuses = new Set([0, 1, 2, 3, 4, 5, 10]);
  const historyStatuses = new Set([6, 7, 8, 9, 11]);

  const filtered = db.yeuCaus
    .filter((yc) => yc.nguoiTaoId === req.currentUserId && !yc.isDeleted && yc.isActived)
    .filter((yc) => {
      if (nhomTrangThai === 1 && !processingStatuses.has(yc.trangThai)) return false;
      if (nhomTrangThai === 2 && !historyStatuses.has(yc.trangThai)) return false;
      if (trangThai !== null && yc.trangThai !== trangThai) return false;
      if (lanhDaoId !== null && yc.lanhDaoId !== lanhDaoId) return false;
      if (tuNgay || denNgay) {
        const created = new Date(yc.createdAt);
        if (tuNgay && created < tuNgay) return false;
        if (denNgay && created >= denNgay) return false;
      }
      if (tuKhoa && !yc.tieuDe.toLowerCase().includes(tuKhoa) && !yc.maYeuCau.toLowerCase().includes(tuKhoa)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);

  const tongSo = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize).map((yc) => {
    const lo = db.loaiYeuCaus.find((x) => x.id === yc.loaiYeuCauId);
    const ld = db.lanhDaos.find((x) => x.id === yc.lanhDaoId);
    const ul = ld ? db.users.find((u) => u.userId === ld.userId) : null;
    const nh = yc.nhomYeuCauId ? db.nhomYeuCaus.find((n) => n.id === yc.nhomYeuCauId) : null;
    const latestLich = db.lichTrinhs
      .filter((lt) => lt.yeuCauId === yc.id && !lt.isDeleted)
      .sort((a, b) => b.id - a.id)[0];
    const coDeXuatChoPhanHoi =
      yc.trangThai === 3 &&
      db.yeuCauThoiGianDeXuats.some(
        (t) => t.yeuCauId === yc.id && t.nguonDeXuat === 2 && t.nhanVienDongY === null && !t.isDeleted && t.isActived
      );

    return {
      yeuCauId: yc.id,
      maYeuCau: yc.maYeuCau,
      tieuDe: yc.tieuDe,
      trangThai: yc.trangThai,
      mucKhan: yc.mucKhan,
      tenLoai: lo?.tenLoai ?? '',
      lanhDaoId: yc.lanhDaoId,
      tenLanhDao: ul?.tenNguoiDung ?? '',
      maNhom: nh?.maNhom ?? null,
      ngayGui: yc.ngayGui,
      ngayHoanTat: yc.ngayHoanTat,
      hanChot: yc.hanChot,
      lyDoTuChoiHuy: yc.lyDoTuChoiHuy,
      createdAt: yc.createdAt,
      lichBatDau: latestLich?.batDau ?? null,
      lichKetThuc: latestLich?.ketThuc ?? null,
      trangThaiLich: latestLich?.trangThai ?? null,
      coDeXuatChoPhanHoi,
      tongSo
    };
  });

  res.json(paged);
});

app.get('/api/Request/GetThongKe', requireAuth, (req, res) => {
  const mine = db.yeuCaus.filter((yc) => yc.nguoiTaoId === req.currentUserId && !yc.isDeleted && yc.isActived);
  const counts = new Map();
  for (const yc of mine) {
    counts.set(yc.trangThai, (counts.get(yc.trangThai) || 0) + 1);
  }
  const theoTrangThai = Array.from(counts.entries()).map(([trangThai, soLuong]) => ({ trangThai, soLuong }));
  const canHanhDong = mine.filter((yc) => yc.trangThai === 3 || yc.trangThai === 4).length;
  res.json({ theoTrangThai, canHanhDong });
});

app.get('/api/Request/GetChiTiet/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const yc = db.yeuCaus.find((x) => x.id === id && !x.isDeleted && x.isActived);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

  // Authorize: creator OR assigned assistant OR assigned leader
  const isOwner = yc.nguoiTaoId === req.currentUserId;
  const troLyCtx = getLanhDaoOfTroLy(req.currentUserId);
  const isTroLy = troLyCtx && troLyCtx.lanhDao.id === yc.lanhDaoId;
  const lanhDaoCtx = getLanhDaoOfUser(req.currentUserId);
  const isLanhDao = lanhDaoCtx && lanhDaoCtx.lanhDao.id === yc.lanhDaoId;

  if (!isOwner && !isTroLy && !isLanhDao) {
    return res.status(403).json({ message: 'Bạn không có quyền xem yêu cầu này.' });
  }

  res.json(buildChiTietYeuCau(yc, Boolean(isTroLy || isLanhDao)));
});

app.get('/api/Request/GetPhanHoi', requireAuth, (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const myYcs = new Map(
    db.yeuCaus.filter((yc) => yc.nguoiTaoId === req.currentUserId && !yc.isDeleted && yc.isActived).map((yc) => [yc.id, yc])
  );

  const items = [];
  for (const k of db.ketQuaTrinhs) {
    const yc = myYcs.get(k.yeuCauId);
    if (!yc || k.isDeleted || !k.isActived || !k.chiDaoCuaLanhDao) continue;
    const ld = db.lanhDaos.find((x) => x.id === yc.lanhDaoId);
    const ul = ld ? db.users.find((u) => u.userId === ld.userId) : null;
    items.push({
      loai: 1,
      yeuCauId: yc.id,
      maYeuCau: yc.maYeuCau,
      tieuDe: yc.tieuDe,
      trangThaiYeuCau: yc.trangThai,
      denTrangThai: null,
      ketQua: k.ketQua,
      noiDung: k.chiDaoCuaLanhDao,
      nguoiPhanHoi: ul?.tenNguoiDung ?? '',
      thoiDiem: k.thoiGianThucTe || k.createdAt
    });
  }
  for (const h of db.yeuCauLichSuTrangThais) {
    const yc = myYcs.get(h.yeuCauId);
    if (!yc || ![3, 4, 5, 8].includes(h.denTrangThai) || !['TROLY', 'LANHDAO'].includes(h.vaiTroThucHien)) continue;
    items.push({
      loai: 2,
      yeuCauId: yc.id,
      maYeuCau: yc.maYeuCau,
      tieuDe: yc.tieuDe,
      trangThaiYeuCau: yc.trangThai,
      denTrangThai: h.denTrangThai,
      ketQua: null,
      noiDung: h.lyDo || h.ghiChu || null,
      nguoiPhanHoi: db.users.find((u) => u.userId === h.nguoiThucHienId)?.tenNguoiDung ?? '',
      thoiDiem: h.createdAt
    });
  }

  items.sort((a, b) => new Date(b.thoiDiem) - new Date(a.thoiDiem) || b.yeuCauId - a.yeuCauId);
  const tongSo = items.length;
  res.json(items.slice((page - 1) * pageSize, page * pageSize).map((x) => ({ ...x, tongSo })));
});

app.post('/api/Request/Tao', requireAuth, (req, res) => {
  const body = req.body || {};
  const tepDinhKems = Array.isArray(body.tepDinhKems) ? body.tepDinhKems : [];
  if (tepDinhKems.some((t) => !String(t.duongDan || '').startsWith('yeu-cau/') || String(t.duongDan || '').includes('..'))) {
    return res.status(400).json({ message: 'Tệp đính kèm không hợp lệ.' });
  }

  const user = db.users.find((u) => u.userId === req.currentUserId && !u.isDeleted && u.isActived);
  if (!user) return res.status(400).json({ message: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa.' });

  const tieuDe = String(body.tieuDe || '').trim();
  if (!tieuDe) return res.status(400).json({ message: 'Tiêu đề không được để trống.' });

  const mucKhan = Number(body.mucKhan ?? 1);
  if (![1, 2, 3].includes(mucKhan)) return res.status(400).json({ message: 'Mức khẩn không hợp lệ.' });
  if (mucKhan > 1 && !String(body.lyDoKhan || '').trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập lý do khi chọn mức Gấp hoặc Rất gấp.' });
  }

  const allowedBranches = getChiNhanhVaCha(user.chiNhanhId);
  const ld = db.lanhDaos.find(
    (x) => x.id === Number(body.lanhDaoId) && !x.isDeleted && x.isActived && allowedBranches.has(x.chiNhanhId)
  );
  if (!ld) return res.status(400).json({ message: 'Có lãnh đạo không hợp lệ hoặc nằm ngoài phạm vi được trình.' });

  const loai = db.loaiYeuCaus.find(
    (x) => x.id === Number(body.loaiYeuCauId) && !x.isDeleted && x.isActived && allowedBranches.has(x.chiNhanhId)
  );
  if (!loai) return res.status(400).json({ message: 'Loại yêu cầu không hợp lệ.' });

  const thoiLuongPhut = Number(body.thoiLuongPhut ?? loai.thoiLuongMacDinhPhut);
  if (thoiLuongPhut <= 0 || thoiLuongPhut > 480) {
    return res.status(400).json({ message: 'Thời lượng không hợp lệ.' });
  }

  const now = new Date();
  const hanChotDate = normalizeHanChot(body.hanChot);
  if (hanChotDate && hanChotDate.getTime() > now.getTime() + 31 * 86400000) {
    return res.status(400).json({ message: 'Hạn chót không được quá 30 ngày kể từ hôm nay.' });
  }

  const guiNgay = Boolean(body.guiNgay);
  const troLys = activeTroLysForLanhDao(ld.id);
  if (guiNgay) {
    if (!hanChotDate) return res.status(400).json({ message: 'Vui lòng chọn hạn chót.' });
    if (hanChotDate <= now) return res.status(400).json({ message: 'Hạn chót phải ở tương lai.' });
    if (troLys.length === 0) {
      return res.status(400).json({ message: 'Có lãnh đạo chưa được phân công trợ lý, vui lòng liên hệ quản trị.' });
    }
  }

  db.seqMaYeuCau += 1;
  const maYeuCau = formatMaYeuCau(now, db.seqMaYeuCau);
  const ycId = nextId(db.yeuCaus, 'id');
  const trangThai = guiNgay ? 1 : 0;
  const nowIso = now.toISOString();

  db.yeuCaus.push({
    id: ycId,
    chiNhanhId: ld.chiNhanhId,
    chiNhanhNguoiTaoId: user.chiNhanhId,
    nhomYeuCauId: null,
    maYeuCau,
    nguoiTaoId: user.userId,
    lanhDaoId: ld.id,
    loaiYeuCauId: loai.id,
    tieuDe,
    tomTat: body.tomTat ?? null,
    mucKhan,
    lyDoKhan: body.lyDoKhan ?? null,
    mucUuTienId: null,
    thoiLuongPhut,
    hanChot: hanChotDate ? hanChotDate.toISOString() : null,
    laBaoMat: Boolean(body.laBaoMat),
    trangThai,
    troLyXuLyId: null,
    ngayGui: guiNgay ? nowIso : null,
    ngayTiepNhan: null,
    ngayHoanTat: null,
    yeuCauLapLaiId: null,
    lyDoTuChoiHuy: null,
    isActived: true,
    isDeleted: false,
    createdAt: nowIso,
    createdBy: user.userId,
    updatedAt: null,
    updatedBy: null
  });

  const nguoiThamDus = Array.isArray(body.nguoiThamDus) ? body.nguoiThamDus : [];
  for (const p of nguoiThamDus) {
    db.yeuCauNguoiThamDus.push({
      id: nextId(db.yeuCauNguoiThamDus, 'id'),
      chiNhanhId: ld.chiNhanhId,
      yeuCauId: ycId,
      userId: p.userId ?? null,
      hoTenNgoai: p.hoTenNgoai ?? null,
      donViNgoai: p.donViNgoai ?? null,
      vaiTro: p.vaiTro ?? null,
      isActived: true,
      isDeleted: false,
      createdAt: nowIso,
      createdBy: user.userId
    });
  }

  for (const t of tepDinhKems) {
    db.tepDinhKems.push({
      id: nextId(db.tepDinhKems, 'id'),
      chiNhanhId: ld.chiNhanhId,
      yeuCauId: ycId,
      ketQuaTrinhId: null,
      tenFile: t.tenFile,
      duongDan: t.duongDan,
      contentType: t.contentType ?? null,
      kichThuoc: Number(t.kichThuoc || 0),
      checksum: t.checksum ?? null,
      isActived: true,
      isDeleted: false,
      createdAt: nowIso,
      createdBy: user.userId
    });
  }

  db.yeuCauLichSuTrangThais.push({
    id: nextId(db.yeuCauLichSuTrangThais, 'id'),
    chiNhanhId: ld.chiNhanhId,
    yeuCauId: ycId,
    tuTrangThai: null,
    denTrangThai: trangThai,
    nguoiThucHienId: user.userId,
    vaiTroThucHien: 'NHANVIEN',
    lyDo: guiNgay ? 'Tạo và gửi yêu cầu' : 'Lưu nháp',
    ghiChu: null,
    createdAt: nowIso
  });

  if (guiNgay) {
    for (const tl of troLys) {
      emitThongBao(ld.chiNhanhId, user.userId, `Yêu cầu ${maYeuCau} vừa được gửi`, tl.userId);
      emitThongBaoLichTrinh({
        chiNhanhId: ld.chiNhanhId,
        nguoiNhanId: tl.userId,
        tieuDe: mucKhan >= 2 ? 'Yêu cầu gấp mới cần xếp lịch' : 'Yêu cầu mới cần xếp lịch',
        noiDung: `${user.tenNguoiDung} vừa gửi yêu cầu "${tieuDe}" (hạn chót ${formatDateVi(hanChotDate.toISOString())}).`,
        loaiSuKien: 'YEUCAU_MOI',
        yeuCauId: ycId,
        routeUrl: '/tro-ly'
      });
    }
  }

  res.json([
    {
      yeuCauId: ycId,
      maYeuCau,
      lanhDaoId: ld.id,
      chiNhanhId: ld.chiNhanhId,
      nhomYeuCauId: null,
      trangThai
    }
  ]);
});

app.post('/api/Request/SendYeuCau/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const yc = db.yeuCaus.find((x) => x.id === id && x.nguoiTaoId === req.currentUserId && !x.isDeleted && x.isActived);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu hoặc bạn không có quyền.' });
  if (yc.trangThai !== 0) return res.status(400).json({ message: 'Chỉ gửi được yêu cầu đang ở trạng thái Nháp.' });
  if (!yc.hanChot) return res.status(400).json({ message: 'Vui lòng chọn hạn chót trước khi gửi.' });

  const now = new Date();
  if (new Date(yc.hanChot) <= now) return res.status(400).json({ message: 'Hạn chót phải ở tương lai.' });
  const troLys = activeTroLysForLanhDao(yc.lanhDaoId);
  if (troLys.length === 0) {
    return res.status(400).json({ message: 'Lãnh đạo chưa được phân công trợ lý, vui lòng liên hệ quản trị.' });
  }

  const nowIso = now.toISOString();
  yc.trangThai = 1;
  yc.ngayGui = nowIso;
  yc.updatedAt = nowIso;
  yc.updatedBy = req.currentUserId;

  db.yeuCauLichSuTrangThais.push({
    id: nextId(db.yeuCauLichSuTrangThais, 'id'),
    chiNhanhId: yc.chiNhanhId,
    yeuCauId: yc.id,
    tuTrangThai: 0,
    denTrangThai: 1,
    nguoiThucHienId: req.currentUserId,
    vaiTroThucHien: 'NHANVIEN',
    lyDo: 'Gửi yêu cầu',
    ghiChu: null,
    createdAt: nowIso
  });

  const user = db.users.find((u) => u.userId === req.currentUserId);
  for (const tl of troLys) {
    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được gửi`, tl.userId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: tl.userId,
      tieuDe: 'Yêu cầu mới cần xử lý',
      noiDung: `${user?.tenNguoiDung ?? 'Nhân viên'} vừa gửi yêu cầu "${yc.tieuDe}" cần xếp lịch.`,
      loaiSuKien: 'YEUCAU_MOI',
      yeuCauId: yc.id,
      routeUrl: '/tro-ly'
    });
  }
  res.status(200).end();
});

app.post('/api/Request/CancelYeuCau/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const yc = db.yeuCaus.find((x) => x.id === id && x.nguoiTaoId === req.currentUserId && !x.isDeleted && x.isActived);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu hoặc bạn không có quyền.' });
  if ([6, 7, 8, 9, 11].includes(yc.trangThai)) {
    return res.status(400).json({ message: 'Không thể hủy yêu cầu ở trạng thái hiện tại.' });
  }

  const oldStatus = yc.trangThai;
  const nowIso = new Date().toISOString();
  const lyDo = req.body?.lyDo ?? null;

  const activeLichs = db.lichTrinhs.filter((lt) => lt.yeuCauId === id && !lt.isDeleted && [1, 4].includes(lt.trangThai));
  for (const lt of activeLichs) {
    db.lichTrinhLichSus.push({
      id: nextId(db.lichTrinhLichSus, 'id'),
      chiNhanhId: lt.chiNhanhId,
      lichTrinhId: lt.id,
      yeuCauId: id,
      lanhDaoId: lt.lanhDaoId,
      hanhDong: 3,
      batDauCu: lt.batDau,
      ketThucCu: lt.ketThuc,
      batDauMoi: null,
      ketThucMoi: null,
      lyDo: lyDo || 'Nhân viên hủy yêu cầu',
      nguoiThucHienId: req.currentUserId,
      createdAt: nowIso
    });
    lt.trangThai = 3;
  }

  yc.trangThai = 9;
  yc.lyDoTuChoiHuy = lyDo;
  yc.ngayHoanTat = nowIso;
  yc.updatedAt = nowIso;
  yc.updatedBy = req.currentUserId;

  db.yeuCauLichSuTrangThais.push({
    id: nextId(db.yeuCauLichSuTrangThais, 'id'),
    chiNhanhId: yc.chiNhanhId,
    yeuCauId: yc.id,
    tuTrangThai: oldStatus,
    denTrangThai: 9,
    nguoiThucHienId: req.currentUserId,
    vaiTroThucHien: 'NHANVIEN',
    lyDo,
    ghiChu: null,
    createdAt: nowIso
  });

  if (oldStatus !== 0) {
    const creator = db.users.find((u) => u.userId === req.currentUserId);
    const troLys = activeTroLysForLanhDao(yc.lanhDaoId);
    for (const tl of troLys) {
      emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa bị hủy`, tl.userId);
      emitThongBaoLichTrinh({
        chiNhanhId: yc.chiNhanhId,
        nguoiNhanId: tl.userId,
        tieuDe: 'Nhân viên đã hủy yêu cầu',
        noiDung: `${creator?.tenNguoiDung ?? 'Nhân viên'} vừa hủy yêu cầu "${yc.tieuDe}".`,
        loaiSuKien: 'DA_HUY',
        yeuCauId: yc.id,
        routeUrl: '/tro-ly'
      });
    }
    if (activeLichs.length > 0) {
      const ld = db.lanhDaos.find((x) => x.id === yc.lanhDaoId);
      if (ld) {
        emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa bị hủy`, ld.userId);
        emitThongBaoLichTrinh({
          chiNhanhId: yc.chiNhanhId,
          nguoiNhanId: ld.userId,
          tieuDe: 'Buổi trình đã bị hủy',
          noiDung: `${creator?.tenNguoiDung ?? 'Nhân viên'} đã hủy buổi trình "${yc.tieuDe}".`,
          loaiSuKien: 'DA_HUY',
          yeuCauId: yc.id,
          routeUrl: '/lanh-dao'
        });
      }
    }
  }
  res.status(200).end();
});

app.delete('/api/Request/DeleteYeuCau/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const yc = db.yeuCaus.find((x) => x.id === id && x.nguoiTaoId === req.currentUserId && !x.isDeleted);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu hoặc bạn không có quyền xóa.' });

  const nowIso = new Date().toISOString();
  yc.isDeleted = true;
  yc.updatedAt = nowIso;
  yc.updatedBy = req.currentUserId;

  for (const lt of db.lichTrinhs) {
    if (lt.yeuCauId === id && !lt.isDeleted) {
      lt.isDeleted = true;
      lt.updatedAt = nowIso;
      lt.updatedBy = req.currentUserId;
    }
  }

  res.status(200).end();
});

app.post('/api/Request/Sua/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const tepDinhKems = Array.isArray(body.tepDinhKems) ? body.tepDinhKems : [];
  if (tepDinhKems.some((t) => !String(t.duongDan || '').startsWith('yeu-cau/') || String(t.duongDan || '').includes('..'))) {
    return res.status(400).json({ message: 'Tệp đính kèm không hợp lệ.' });
  }

  const yc = db.yeuCaus.find((x) => x.id === id && x.nguoiTaoId === req.currentUserId && !x.isDeleted && x.isActived);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu hoặc bạn không có quyền.' });
  if (yc.trangThai !== 0) return res.status(400).json({ message: 'Chỉ sửa được yêu cầu đang ở trạng thái Nháp.' });

  const now = new Date();
  const hanChotDate = normalizeHanChot(body.hanChot);
  if (hanChotDate && hanChotDate.getTime() > now.getTime() + 31 * 86400000) {
    return res.status(400).json({ message: 'Hạn chót không được quá 30 ngày kể từ hôm nay.' });
  }

  const guiNgay = Boolean(body.guiNgay);
  const troLys = activeTroLysForLanhDao(yc.lanhDaoId);
  if (guiNgay) {
    if (!hanChotDate) return res.status(400).json({ message: 'Vui lòng chọn hạn chót.' });
    if (hanChotDate <= now) return res.status(400).json({ message: 'Hạn chót phải ở tương lai.' });
    if (troLys.length === 0) {
      return res.status(400).json({ message: 'Lãnh đạo chưa được phân công trợ lý, vui lòng liên hệ quản trị.' });
    }
  }

  const nowIso = now.toISOString();
  yc.loaiYeuCauId = Number(body.loaiYeuCauId ?? yc.loaiYeuCauId);
  yc.tomTat = body.tomTat ?? null;
  yc.mucKhan = Number(body.mucKhan ?? yc.mucKhan);
  yc.lyDoKhan = body.lyDoKhan ?? null;
  yc.thoiLuongPhut = Number(body.thoiLuongPhut ?? yc.thoiLuongPhut);
  yc.hanChot = hanChotDate ? hanChotDate.toISOString() : null;
  yc.laBaoMat = Boolean(body.laBaoMat);
  if (guiNgay) {
    yc.trangThai = 1;
    yc.ngayGui = nowIso;
  }
  yc.updatedAt = nowIso;
  yc.updatedBy = req.currentUserId;

  for (const p of db.yeuCauNguoiThamDus) {
    if (p.yeuCauId === id && !p.isDeleted) p.isDeleted = true;
  }
  const nguoiThamDus = Array.isArray(body.nguoiThamDus) ? body.nguoiThamDus : [];
  for (const p of nguoiThamDus) {
    db.yeuCauNguoiThamDus.push({
      id: nextId(db.yeuCauNguoiThamDus, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: id,
      userId: p.userId ?? null,
      hoTenNgoai: p.hoTenNgoai ?? null,
      donViNgoai: p.donViNgoai ?? null,
      vaiTro: p.vaiTro ?? null,
      isActived: true,
      isDeleted: false,
      createdAt: nowIso,
      createdBy: req.currentUserId
    });
  }

  const keptPaths = new Set(tepDinhKems.map((t) => t.duongDan));
  for (const t of db.tepDinhKems) {
    if (t.yeuCauId === id && !t.isDeleted && !keptPaths.has(t.duongDan)) {
      t.isDeleted = true;
    }
  }
  for (const t of tepDinhKems) {
    const exists = db.tepDinhKems.some((x) => x.yeuCauId === id && !x.isDeleted && x.duongDan === t.duongDan);
    if (!exists) {
      db.tepDinhKems.push({
        id: nextId(db.tepDinhKems, 'id'),
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: id,
        ketQuaTrinhId: null,
        tenFile: t.tenFile,
        duongDan: t.duongDan,
        contentType: t.contentType ?? null,
        kichThuoc: Number(t.kichThuoc || 0),
        checksum: t.checksum ?? null,
        isActived: true,
        isDeleted: false,
        createdAt: nowIso,
        createdBy: req.currentUserId
      });
    }
  }

  if (guiNgay) {
    db.yeuCauLichSuTrangThais.push({
      id: nextId(db.yeuCauLichSuTrangThais, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: id,
      tuTrangThai: 0,
      denTrangThai: 1,
      nguoiThucHienId: req.currentUserId,
      vaiTroThucHien: 'NHANVIEN',
      lyDo: 'Sửa bản nháp và gửi yêu cầu',
      ghiChu: null,
      createdAt: nowIso
    });
    const creator = db.users.find((u) => u.userId === req.currentUserId);
    for (const tl of troLys) {
      emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được gửi`, tl.userId);
      emitThongBaoLichTrinh({
        chiNhanhId: yc.chiNhanhId,
        nguoiNhanId: tl.userId,
        tieuDe: 'Yêu cầu mới cần xếp lịch',
        noiDung: `${creator?.tenNguoiDung ?? 'Nhân viên'} vừa gửi yêu cầu "${yc.tieuDe}".`,
        loaiSuKien: 'YEUCAU_MOI',
        yeuCauId: id,
        routeUrl: '/tro-ly'
      });
    }
  }

  res.status(200).end();
});

app.post('/api/Request/BoSung/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const noiDung = String(body.noiDung || '').trim();
  if (!noiDung) return res.status(400).json({ message: 'Vui lòng nhập nội dung bổ sung.' });

  const yc = db.yeuCaus.find((x) => x.id === id && x.nguoiTaoId === req.currentUserId && !x.isDeleted && x.isActived);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu hoặc bạn không có quyền.' });
  if (yc.trangThai !== 4) return res.status(400).json({ message: 'Yêu cầu hiện không ở trạng thái cần bổ sung.' });

  const nowIso = new Date().toISOString();
  db.yeuCauBinhLuans.push({
    id: nextId(db.yeuCauBinhLuans, 'id'),
    chiNhanhId: yc.chiNhanhId,
    yeuCauId: id,
    userId: req.currentUserId,
    noiDung,
    chiNoiBo: false,
    isActived: true,
    isDeleted: false,
    createdAt: nowIso
  });

  const tepDinhKems = Array.isArray(body.tepDinhKems) ? body.tepDinhKems : [];
  for (const t of tepDinhKems) {
    db.tepDinhKems.push({
      id: nextId(db.tepDinhKems, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: id,
      ketQuaTrinhId: null,
      tenFile: t.tenFile,
      duongDan: t.duongDan,
      contentType: t.contentType ?? null,
      kichThuoc: Number(t.kichThuoc || 0),
      checksum: t.checksum ?? null,
      isActived: true,
      isDeleted: false,
      createdAt: nowIso,
      createdBy: req.currentUserId
    });
  }

  if (body.tomTat != null && String(body.tomTat).trim()) yc.tomTat = String(body.tomTat).trim();
  yc.trangThai = 1;
  yc.updatedAt = nowIso;
  yc.updatedBy = req.currentUserId;

  db.yeuCauLichSuTrangThais.push({
    id: nextId(db.yeuCauLichSuTrangThais, 'id'),
    chiNhanhId: yc.chiNhanhId,
    yeuCauId: id,
    tuTrangThai: 4,
    denTrangThai: 1,
    nguoiThucHienId: req.currentUserId,
    vaiTroThucHien: 'NHANVIEN',
    lyDo: 'Nhân viên đã bổ sung thông tin',
    ghiChu: noiDung,
    createdAt: nowIso
  });

  const creator = db.users.find((u) => u.userId === req.currentUserId);
  const recipients = yc.troLyXuLyId ? [yc.troLyXuLyId] : activeTroLysForLanhDao(yc.lanhDaoId).map((t) => t.userId);
  for (const rId of recipients) {
    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được bổ sung thông tin`, rId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: rId,
      tieuDe: 'Nhân viên đã bổ sung thông tin',
      noiDung: `${creator?.tenNguoiDung ?? 'Nhân viên'} vừa bổ sung thông tin cho yêu cầu "${yc.tieuDe}".`,
      loaiSuKien: 'BO_SUNG',
      yeuCauId: id,
      routeUrl: '/tro-ly'
    });
  }
  res.status(200).end();
});

app.post('/api/Request/PhanHoiDeXuat/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const yc = db.yeuCaus.find((x) => x.id === id && x.nguoiTaoId === req.currentUserId && !x.isDeleted && x.isActived);
  if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu hoặc bạn không có quyền.' });
  if (yc.trangThai !== 3) return res.status(400).json({ message: 'Yêu cầu không ở trạng thái chờ phản hồi đề xuất đổi lịch.' });

  const slot = db.yeuCauThoiGianDeXuats.find(
    (t) => t.id === Number(body.thoiGianDeXuatId) && t.yeuCauId === id && t.nguonDeXuat === 2 && t.nhanVienDongY === null && !t.isDeleted
  );
  if (!slot) return res.status(400).json({ message: 'Không tìm thấy khung giờ đề xuất hợp lệ.' });

  const nowIso = new Date().toISOString();
  const dongY = Boolean(body.dongY);
  slot.nhanVienDongY = dongY;
  slot.ngayPhanHoi = nowIso;
  if (body.ghiChu) slot.ghiChu = body.ghiChu;

  let lichId = null;
  if (dongY) {
    yc.trangThai = 5;
    const existingLich = db.lichTrinhs
      .filter((lt) => lt.yeuCauId === id && !lt.isDeleted && [1, 4].includes(lt.trangThai))
      .sort((a, b) => b.id - a.id)[0];

    const hasOverlap = db.lichTrinhs.some(
      (lt) =>
        lt.lanhDaoId === yc.lanhDaoId &&
        !lt.isDeleted &&
        lt.isActived &&
        lt.trangThai === 1 &&
        lt.yeuCauId !== id &&
        new Date(lt.batDau) < new Date(slot.ketThuc) &&
        new Date(lt.ketThuc) > new Date(slot.batDau)
    );

    if (!existingLich) {
      lichId = nextId(db.lichTrinhs, 'id');
      db.lichTrinhs.push({
        id: lichId,
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: id,
        lanhDaoId: yc.lanhDaoId,
        batDau: slot.batDau,
        ketThuc: slot.ketThuc,
        diaDiem: db.lanhDaos.find((x) => x.id === yc.lanhDaoId)?.phongLamViec ?? null,
        trangThai: 1,
        thuTuTrongNgay: null,
        nguoiChotId: yc.troLyXuLyId,
        ngayChot: nowIso,
        daGhiDeXungDot: hasOverlap,
        lyDoGhiDe: hasOverlap ? 'Cho phép xếp chồng khung giờ' : null,
        ghiChuLanhDao: null,
        isActived: true,
        isDeleted: false
      });
      db.lichTrinhLichSus.push({
        id: nextId(db.lichTrinhLichSus, 'id'),
        chiNhanhId: yc.chiNhanhId,
        lichTrinhId: lichId,
        yeuCauId: id,
        lanhDaoId: yc.lanhDaoId,
        hanhDong: 1,
        batDauCu: null,
        ketThucCu: null,
        batDauMoi: slot.batDau,
        ketThucMoi: slot.ketThuc,
        lyDo: 'Nhân viên đồng ý phương án trợ lý đề xuất',
        nguoiThucHienId: req.currentUserId,
        createdAt: nowIso
      });
    } else {
      lichId = existingLich.id;
      const oldStart = existingLich.batDau;
      const oldEnd = existingLich.ketThuc;
      existingLich.batDau = slot.batDau;
      existingLich.ketThuc = slot.ketThuc;
      existingLich.trangThai = 1;
      existingLich.ngayChot = nowIso;
      existingLich.daGhiDeXungDot = hasOverlap;
      db.lichTrinhLichSus.push({
        id: nextId(db.lichTrinhLichSus, 'id'),
        chiNhanhId: yc.chiNhanhId,
        lichTrinhId: lichId,
        yeuCauId: id,
        lanhDaoId: yc.lanhDaoId,
        hanhDong: 2,
        batDauCu: oldStart,
        ketThucCu: oldEnd,
        batDauMoi: slot.batDau,
        ketThucMoi: slot.ketThuc,
        lyDo: 'Nhân viên đồng ý phương án trợ lý đề xuất',
        nguoiThucHienId: req.currentUserId,
        createdAt: nowIso
      });
    }
  } else {
    yc.trangThai = 1;
    if (body.ghiChu) {
      db.yeuCauBinhLuans.push({
        id: nextId(db.yeuCauBinhLuans, 'id'),
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: id,
        userId: req.currentUserId,
        noiDung: body.ghiChu,
        chiNoiBo: false,
        isActived: true,
        isDeleted: false,
        createdAt: nowIso
      });
    }
  }

  db.yeuCauLichSuTrangThais.push({
    id: nextId(db.yeuCauLichSuTrangThais, 'id'),
    chiNhanhId: yc.chiNhanhId,
    yeuCauId: id,
    tuTrangThai: 3,
    denTrangThai: yc.trangThai,
    nguoiThucHienId: req.currentUserId,
    vaiTroThucHien: 'NHANVIEN',
    lyDo: dongY ? 'Đồng ý phương án giờ do trợ lý đề xuất' : (body.ghiChu || 'Không đồng ý phương án đề xuất'),
    ghiChu: null,
    createdAt: nowIso
  });

  const creator = db.users.find((u) => u.userId === req.currentUserId);
  const troLys = activeTroLysForLanhDao(yc.lanhDaoId);
  for (const tl of troLys) {
    emitThongBao(
      yc.chiNhanhId,
      req.currentUserId,
      dongY ? `Yêu cầu ${yc.maYeuCau} vừa được chốt lịch` : `Yêu cầu ${yc.maYeuCau} vừa bị từ chối khung giờ đề xuất`,
      tl.userId
    );
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: tl.userId,
      tieuDe: dongY ? 'Nhân viên đã đồng ý lịch' : 'Nhân viên đề nghị chọn khung giờ khác',
      noiDung: dongY
        ? `${creator?.tenNguoiDung ?? 'Nhân viên'} đồng ý lịch ${formatTimeShort(slot.batDau)}-${formatTimeShort(slot.ketThuc)} ngày ${formatDateVi(slot.batDau)} cho "${yc.tieuDe}".`
        : `${creator?.tenNguoiDung ?? 'Nhân viên'} không đồng ý khung giờ đề xuất cho "${yc.tieuDe}".`,
      loaiSuKien: dongY ? 'DA_DUYET' : 'TU_CHOI_DE_XUAT',
      yeuCauId: id,
      lichTrinhId: lichId,
      routeUrl: '/tro-ly'
    });
  }
  if (dongY) {
    const ld = db.lanhDaos.find((x) => x.id === yc.lanhDaoId);
    if (ld) {
      emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được xếp lịch`, ld.userId);
      emitThongBaoLichTrinh({
        chiNhanhId: yc.chiNhanhId,
        nguoiNhanId: ld.userId,
        tieuDe: 'Lịch trình mới đã chốt',
        noiDung: `${creator?.tenNguoiDung ?? 'Nhân viên'} trình "${yc.tieuDe}" lúc ${formatTimeShort(slot.batDau)}-${formatTimeShort(slot.ketThuc)} ngày ${formatDateVi(slot.batDau)}.`,
        loaiSuKien: 'DA_DUYET',
        yeuCauId: id,
        lichTrinhId: lichId,
        routeUrl: '/lanh-dao'
      });
    }
  }
  res.status(200).end();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.post('/api/Request/UploadTep', requireAuth, upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file || file.size === 0) return res.status(400).json({ message: 'Tệp rỗng.' });
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ message: 'Định dạng tệp không được hỗ trợ.' });

  const now = new Date();
  const rel = `yeu-cau/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID().replace(/-/g, '')}${ext}`;
  const full = path.join(UPLOAD_ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, file.buffer);

  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex').toUpperCase();
  res.json({
    tenFile: path.basename(file.originalname),
    duongDan: rel,
    contentType: file.mimetype,
    kichThuoc: file.size,
    checksum
  });
});

// =========================================================================
// Modular Feature Routes: TroLy (/api/TroLy/*) & LanhDao (/api/LanhDao/*)
// =========================================================================
const routeDeps = {
  db,
  requireAuth,
  nextId,
  getYmd,
  formatTimeShort,
  formatDateVi,
  enrichUser,
  getUserPermissions,
  getLanhDaoOfTroLy,
  getLanhDaoOfUser,
  getOrCreateCauHinh,
  buildLichTrinhView,
  emitThongBao,
  emitThongBaoLichTrinh
};
registerTroLyRoutes(app, routeDeps);
registerLanhDaoRoutes(app, routeDeps);
registerAdminRoutes(app, routeDeps);
registerProfileRoutes(app, routeDeps);

// =========================================================================
// Serve built Angular SPA from sb.client/dist/sb.client/browser
// Auto-build on cold start if dist/ is missing
// =========================================================================
const CLIENT_INDEX = path.join(CLIENT_DIST, 'index.html');
let clientBuildProc = null;
let clientBuildError = null;

function ensureClientBuild() {
  if (fs.existsSync(CLIENT_INDEX) || clientBuildProc) return;
  clientBuildError = null;
  console.log('[SB] Angular dist not found — running `npm --prefix sb.client run build`...');
  clientBuildProc = spawn('npm', ['--prefix', 'sb.client', 'run', 'build'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  clientBuildProc.on('exit', (code) => {
    clientBuildProc = null;
    if (code === 0) {
      console.log('[SB] Angular client build completed.');
    } else {
      clientBuildError = `Angular build exited with code ${code}`;
      console.error(`[SB] ${clientBuildError}`);
    }
  });
  clientBuildProc.on('error', (err) => {
    clientBuildProc = null;
    clientBuildError = err.message;
    console.error('[SB] Failed to start Angular build:', err);
  });
}

if (!fs.existsSync(CLIENT_INDEX)) {
  ensureClientBuild();
}

app.use(express.static(CLIENT_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/hubs/') || req.path.startsWith('/Files/')) return next();
  if (fs.existsSync(CLIENT_INDEX)) {
    return res.sendFile(CLIENT_INDEX);
  }
  ensureClientBuild();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="3" />
  <title>SB — Đang khởi tạo ứng dụng</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; }
    .box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px 28px; text-align: center; max-width: 380px; }
    .spin { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #0d6efd; border-radius: 50%; margin: 0 auto 12px; animation: s .8s linear infinite; }
    @keyframes s { to { transform: rotate(360deg); } }
    p { margin: 6px 0 0; font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spin"></div>
    <strong>Đang khởi tạo giao diện SB...</strong>
    <p>${clientBuildError ? 'Lỗi biên dịch: ' + clientBuildError : 'Trang sẽ tự động tải lại sau vài giây.'}</p>
  </div>
</body>
</html>`);
});

// =========================================================================
// HTTP + WebSocket Server on 0.0.0.0:3000
// =========================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const normalizedPath = url.pathname.replace(/\/+$/, '').toLowerCase();
  if (normalizedPath === '/hubs/thongbao') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  let handshaked = false;
  let isAlive = true;

  const safeSend = (payload) => {
    if (ws.readyState === 1) {
      try {
        ws.send(payload);
      } catch {
        // Ignore send errors on closing sockets
      }
    }
  };

  ws.on('pong', () => {
    isAlive = true;
  });

  // Periodic WebSocket + SignalR keep-alive to prevent reverse proxies (Cloud Run) from closing idle sockets with 1006
  const heartbeat = setInterval(() => {
    if (ws.readyState !== 1) {
      clearInterval(heartbeat);
      return;
    }
    if (!isAlive) {
      clearInterval(heartbeat);
      try {
        ws.terminate();
      } catch {
        // Ignore
      }
      return;
    }
    isAlive = false;
    try {
      ws.ping();
    } catch {
      // Ignore
    }
    if (handshaked) {
      safeSend(JSON.stringify({ type: 6 }) + RECORD_SEP);
    }
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    removeFromAllGroups(ws);
  };

  ws.on('message', (raw) => {
    isAlive = true;
    const text = raw.toString('utf8');
    const frames = text.split(RECORD_SEP).filter((f) => f.length > 0);
    for (const frame of frames) {
      let msg;
      try {
        msg = JSON.parse(frame);
      } catch {
        continue;
      }

      if (!handshaked && msg.protocol) {
        handshaked = true;
        safeSend(`{}${RECORD_SEP}`);
        continue;
      }

      if (msg.type === 6) {
        safeSend(JSON.stringify({ type: 6 }) + RECORD_SEP);
      } else if (msg.type === 1 && msg.target === 'JoinBranchGroup') {
        const branchId = String(msg.arguments?.[0] ?? '');
        if (branchId) addToBranchGroup(branchId, ws);
        if (msg.invocationId) {
          safeSend(JSON.stringify({ type: 3, invocationId: msg.invocationId }) + RECORD_SEP);
        }
      }
    }
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SB server listening on http://0.0.0.0:${PORT}`);
});
