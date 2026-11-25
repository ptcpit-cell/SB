// Leader daily schedule, optional feedback, and personal busy event routes (/api/LanhDao/*)

export function registerLanhDaoRoutes(app, deps) {
  const {
    db,
    requireAuth,
    nextId,
    getYmd,
    getLanhDaoOfUser,
    getOrCreateCauHinh,
    buildLichTrinhView,
    emitThongBao,
    emitThongBaoLichTrinh
  } = deps;

  app.get('/api/LanhDao/GetLichNgay', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfUser(req.currentUserId);
    if (!ctx) {
      return res.status(400).json({ message: 'Tài khoản của bạn chưa được cấu hình vai trò Lãnh đạo.' });
    }

    const ngay = String(req.query.ngay || getYmd(new Date().toISOString()));
    const lanhDaoId = ctx.lanhDao.id;
    const cauHinh = getOrCreateCauHinh(lanhDaoId, ctx.lanhDao.chiNhanhId);

    const lichTrinhs = db.lichTrinhs
      .filter((lt) => lt.lanhDaoId === lanhDaoId && !lt.isDeleted && lt.isActived && lt.trangThai !== 3 && getYmd(lt.batDau) === ngay)
      .map((lt) => buildLichTrinhView(lt, true))
      .filter(Boolean)
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    const suKiens = db.suKienLanhDaos
      .filter((sk) => {
        if (sk.lanhDaoId !== lanhDaoId || sk.isDeleted || !sk.isActived) return false;
        const s = getYmd(sk.batDau);
        const e = getYmd(sk.ketThuc || sk.batDau);
        return s <= ngay && e >= ngay;
      })
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    const thongKe = {
      tongBuoiTrinh: lichTrinhs.length,
      choTrinh: lichTrinhs.filter((x) => x.trangThaiLich === 1).length,
      daTrinh: lichTrinhs.filter((x) => x.trangThaiLich === 2).length,
      tongPhut: lichTrinhs.reduce((sum, x) => sum + (x.thoiLuongPhut || 0), 0),
      suKienKhac: suKiens.length
    };

    res.json({
      ngay,
      lanhDao: ctx.info,
      cauHinh,
      lichTrinhs,
      suKiens,
      thongKe
    });
  });

  app.get('/api/LanhDao/GetLichTuan', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfUser(req.currentUserId);
    if (!ctx) {
      return res.status(400).json({ message: 'Tài khoản của bạn chưa được cấu hình vai trò Lãnh đạo.' });
    }
    const tuNgay = String(req.query.tuNgay || getYmd(new Date().toISOString())).slice(0, 10);
    const denNgay = String(req.query.denNgay || tuNgay).slice(0, 10);
    const lanhDaoId = ctx.lanhDao.id;
    const cauHinh = getOrCreateCauHinh(lanhDaoId, ctx.lanhDao.chiNhanhId);

    const lichTrinhs = db.lichTrinhs
      .filter((lt) => {
        if (lt.lanhDaoId !== lanhDaoId || lt.isDeleted || !lt.isActived || lt.trangThai === 3) return false;
        const d = getYmd(lt.batDau);
        return d >= tuNgay && d <= denNgay;
      })
      .map((lt) => buildLichTrinhView(lt, true))
      .filter(Boolean)
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    const suKiens = db.suKienLanhDaos
      .filter((sk) => {
        if (sk.lanhDaoId !== lanhDaoId || sk.isDeleted || !sk.isActived) return false;
        const s = getYmd(sk.batDau);
        const e = getYmd(sk.ketThuc || sk.batDau);
        return s <= denNgay && e >= tuNgay;
      })
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    res.json({
      tuNgay,
      denNgay,
      lanhDao: ctx.info,
      cauHinh,
      lichTrinhs,
      suKiens
    });
  });

  app.post('/api/LanhDao/CapNhatPhanHoi/:lichTrinhId', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfUser(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền lãnh đạo.' });

    const lichTrinhId = Number(req.params.lichTrinhId);
    const lt = db.lichTrinhs.find((x) => x.id === lichTrinhId && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!lt) return res.status(400).json({ message: 'Không tìm thấy lịch trình.' });
    const yc = db.yeuCaus.find((x) => x.id === lt.yeuCauId);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    const body = req.body || {};
    const nowIso = new Date().toISOString();
    const oldStatus = yc.trangThai;

    const ketQuaCode = Number(body.ketQua ?? 1);
    const hoanThanh = Boolean(body.hoanThanh);
    const chiDaoCuaLanhDao = body.chiDaoCuaLanhDao ? String(body.chiDaoCuaLanhDao).trim() : null;
    const ghiChuLanhDao = body.ghiChuLanhDao !== undefined ? (String(body.ghiChuLanhDao || '').trim() || null) : lt.ghiChuLanhDao;

    lt.ghiChuLanhDao = ghiChuLanhDao;

    let newStatus = yc.trangThai;
    if (ketQuaCode === 1) {
      lt.trangThai = 2;
      newStatus = hoanThanh ? 7 : 6;
      yc.ngayHoanTat = nowIso;
    } else if (ketQuaCode === 2) {
      lt.trangThai = 5;
      newStatus = 11;
      yc.ngayHoanTat = nowIso;
    } else if (ketQuaCode === 3) {
      lt.trangThai = 4;
      newStatus = 10;
    }

    yc.trangThai = newStatus;
    yc.updatedAt = nowIso;
    yc.updatedBy = req.currentUserId;

    let kq = db.ketQuaTrinhs.find((k) => k.lichTrinhId === lt.id && !k.isDeleted);
    if (!kq) {
      kq = {
        id: nextId(db.ketQuaTrinhs, 'id'),
        chiNhanhId: yc.chiNhanhId,
        lichTrinhId: lt.id,
        yeuCauId: yc.id,
        ketQua: ketQuaCode,
        thoiGianThucTe: nowIso,
        chiDaoCuaLanhDao,
        ghiChu: body.ghiChu ?? null,
        nguoiGhiNhanId: req.currentUserId,
        createdAt: nowIso,
        isActived: true,
        isDeleted: false
      };
      db.ketQuaTrinhs.push(kq);
    } else {
      kq.ketQua = ketQuaCode;
      kq.chiDaoCuaLanhDao = chiDaoCuaLanhDao;
      kq.ghiChu = body.ghiChu ?? kq.ghiChu;
      kq.thoiGianThucTe = nowIso;
    }

    if (Array.isArray(body.congViecs)) {
      for (const cv of db.congViecSauTrinhs) {
        if (cv.ketQuaTrinhId === kq.id) cv.isDeleted = true;
      }
      for (const item of body.congViecs) {
        const nd = String(item?.noiDung || '').trim();
        if (!nd) continue;
        db.congViecSauTrinhs.push({
          id: nextId(db.congViecSauTrinhs, 'id'),
          chiNhanhId: yc.chiNhanhId,
          ketQuaTrinhId: kq.id,
          noiDung: nd,
          nguoiPhuTrachId: item.nguoiPhuTrachId ?? yc.nguoiTaoId,
          hanXuLy: item.hanXuLy || null,
          trangThai: Number(item.trangThai ?? 1),
          ngayHoanThanh: null,
          isActived: true,
          isDeleted: false
        });
      }
    }

    db.yeuCauLichSuTrangThais.push({
      id: nextId(db.yeuCauLichSuTrangThais, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: yc.id,
      tuTrangThai: oldStatus,
      denTrangThai: newStatus,
      nguoiThucHienId: req.currentUserId,
      vaiTroThucHien: 'LANHDAO',
      lyDo: chiDaoCuaLanhDao || (ketQuaCode === 1 ? 'Lãnh đạo đã ghi nhận buổi trình' : ketQuaCode === 3 ? 'Lãnh đạo hoãn lịch' : 'Không trình được'),
      ghiChu: null,
      createdAt: nowIso
    });

    // Notify Employee with BOTH ThongBao AND clickable ThongBaoLichTrinh
    const tenSep = ctx.info.hoTen;
    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được phản hồi`, yc.nguoiTaoId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: yc.nguoiTaoId,
      tieuDe: 'Phản hồi từ lãnh đạo',
      noiDung: `Sếp ${tenSep} vừa phản hồi yêu cầu "${yc.tieuDe}" của bạn`,
      loaiSuKien: 'PHAN_HOI_LANH_DAO',
      yeuCauId: yc.id,
      lichTrinhId: lt.id,
      routeUrl: `/nhan-vien/detail-request/${yc.id}`
    });

    if (ctx.info.troLyUserId) {
      emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được phản hồi`, ctx.info.troLyUserId);
      emitThongBaoLichTrinh({
        chiNhanhId: yc.chiNhanhId,
        nguoiNhanId: ctx.info.troLyUserId,
        tieuDe: 'Lãnh đạo đã cập nhật kết quả buổi trình',
        noiDung: `Sếp ${tenSep} vừa cập nhật phản hồi cho yêu cầu "${yc.tieuDe}".`,
        loaiSuKien: 'PHAN_HOI_LANH_DAO',
        yeuCauId: yc.id,
        lichTrinhId: lt.id,
        routeUrl: '/tro-ly'
      });
    }

    res.json({ message: 'Đã lưu phản hồi và gửi thông báo tới nhân viên.' });
  });

  app.post('/api/LanhDao/TaoSuKien', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfUser(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền lãnh đạo.' });
    const body = req.body || {};
    if (!body.tieuDe || !body.batDau || !body.ketThuc) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin sự kiện.' });
    }
    if (new Date(body.ketThuc) <= new Date(body.batDau)) {
      return res.status(400).json({ message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.' });
    }
    const loai = Number(body.loai ?? 1);
    const item = {
      id: nextId(db.suKienLanhDaos, 'id'),
      chiNhanhId: ctx.lanhDao.chiNhanhId,
      lanhDaoId: ctx.lanhDao.id,
      loai,
      tieuDe: String(body.tieuDe).trim(),
      batDau: body.batDau,
      ketThuc: body.ketThuc,
      caNgay: Boolean(body.caNgay),
      laCung: body.laCung !== false,
      laRiengTu: Boolean(body.laRiengTu),
      diaDiem: body.diaDiem ?? null,
      ghiChu: body.ghiChu ?? null,
      isActived: true,
      isDeleted: false
    };
    db.suKienLanhDaos.push(item);

    if (ctx.info.troLyUserId) {
      const loaiText = loai === 3 ? 'nghỉ phép' : loai === 2 ? 'công tác' : loai === 1 ? 'họp riêng' : 'lịch bận';
      const ngayLabel = getYmd(item.batDau).split('-').reverse().join('/');
      const endYmd = getYmd(item.ketThuc);
      const rangeLabel = endYmd !== getYmd(item.batDau) ? `${ngayLabel} - ${endYmd.split('-').reverse().join('/')}` : ngayLabel;
      emitThongBao(
        ctx.lanhDao.chiNhanhId,
        req.currentUserId,
        `Lãnh đạo ${ctx.info.hoTen} vừa thêm lịch ${loaiText}: ${item.tieuDe} (${rangeLabel})`,
        ctx.info.troLyUserId
      );
      emitThongBaoLichTrinh({
        chiNhanhId: ctx.lanhDao.chiNhanhId,
        nguoiNhanId: ctx.info.troLyUserId,
        tieuDe: loai === 3 ? 'Lãnh đạo đăng ký lịch nghỉ phép' : 'Lãnh đạo vừa thêm lịch bận',
        noiDung: `${ctx.info.hoTen} vừa thêm lịch ${loaiText} "${item.tieuDe}" (${rangeLabel}).`,
        loaiSuKien: loai === 3 ? 'CAN_BO_SUNG' : 'LICH_MOI',
        routeUrl: '/tro-ly'
      });
    }

    res.json(item);
  });

  app.delete('/api/LanhDao/XoaSuKien/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfUser(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền lãnh đạo.' });
    const id = Number(req.params.id);
    const sk = db.suKienLanhDaos.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id);
    if (sk) sk.isDeleted = true;
    res.json(true);
  });
}
