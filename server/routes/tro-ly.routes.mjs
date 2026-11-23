// Assistant scheduling, request triage, and Leader working-hours routes (/api/TroLy/*)

export function registerTroLyRoutes(app, deps) {
  const {
    db,
    requireAuth,
    nextId,
    getYmd,
    formatTimeShort,
    formatDateVi,
    enrichUser,
    getLanhDaoOfTroLy,
    getOrCreateCauHinh,
    buildLichTrinhView,
    emitThongBao,
    emitThongBaoLichTrinh
  } = deps;

  app.get('/api/TroLy/GetDashboard', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) {
      return res.status(400).json({ message: 'Tài khoản của bạn chưa được phân công hỗ trợ lãnh đạo nào.' });
    }

    const ngay = String(req.query.ngay || getYmd(new Date().toISOString()));
    const lanhDaoId = ctx.lanhDao.id;
    const cauHinh = getOrCreateCauHinh(lanhDaoId, ctx.lanhDao.chiNhanhId);

    const allRequestsForBoss = db.yeuCaus.filter(
      (yc) => yc.lanhDaoId === lanhDaoId && !yc.isDeleted && yc.isActived && yc.trangThai !== 0
    );

    const queueStatuses = new Set([1, 2, 3, 4, 10]);
    const hangCho = allRequestsForBoss
      .filter((yc) => queueStatuses.has(yc.trangThai))
      .map((yc) => {
        const lo = db.loaiYeuCaus.find((x) => x.id === yc.loaiYeuCauId);
        const mu = yc.mucUuTienId ? db.mucUuTiens.find((m) => m.id === yc.mucUuTienId) : null;
        const creator = db.users.find((u) => u.userId === yc.nguoiTaoId);
        const enrichedCreator = creator ? enrichUser(creator) : null;
        const soTep = db.tepDinhKems.filter((t) => t.yeuCauId === yc.id && !t.isDeleted && t.isActived).length;
        const soThamDu = db.yeuCauNguoiThamDus.filter((p) => p.yeuCauId === yc.id && !p.isDeleted && p.isActived).length;
        return {
          yeuCauId: yc.id,
          maYeuCau: yc.maYeuCau,
          tieuDe: yc.tieuDe,
          tomTat: yc.tomTat,
          tenLoai: lo?.tenLoai ?? '',
          trangThai: yc.trangThai,
          mucKhan: yc.mucKhan,
          lyDoKhan: yc.lyDoKhan,
          mucUuTienId: yc.mucUuTienId,
          tenMucUuTien: mu?.ten ?? null,
          maMucUuTien: mu?.code ?? null,
          mauMucUuTien: mu?.mauHienThi ?? null,
          trongSoUuTien: mu?.trongSo ?? 0,
          thoiLuongPhut: yc.thoiLuongPhut,
          hanChot: yc.hanChot,
          laBaoMat: yc.laBaoMat,
          ngayGui: yc.ngayGui,
          tenNguoiTrinh: enrichedCreator?.tenNguoiDung ?? '',
          phongBanNguoiTrinh: enrichedCreator?.tenPhongBan ?? '',
          chucVuNguoiTrinh: enrichedCreator?.tenChucVu ?? '',
          soTep,
          soThamDu
        };
      })
      .sort((a, b) => b.trongSoUuTien - a.trongSoUuTien || b.mucKhan - a.mucKhan || new Date(a.hanChot || '2099-01-01') - new Date(b.hanChot || '2099-01-01'));

    const lichNgay = db.lichTrinhs
      .filter((lt) => lt.lanhDaoId === lanhDaoId && !lt.isDeleted && lt.isActived && lt.trangThai !== 3 && getYmd(lt.batDau) === ngay)
      .map((lt) => buildLichTrinhView(lt, true))
      .filter(Boolean)
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    const suKienNgay = db.suKienLanhDaos
      .filter((sk) => sk.lanhDaoId === lanhDaoId && !sk.isDeleted && sk.isActived && getYmd(sk.batDau) === ngay)
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    const thongKe = {
      choXuLy: allRequestsForBoss.filter((yc) => yc.trangThai === 1 || yc.trangThai === 2).length,
      gap: hangCho.filter((yc) => yc.mucKhan >= 2).length,
      lichHomNay: lichNgay.length,
      choPhanHoi: allRequestsForBoss.filter((yc) => yc.trangThai === 3 || yc.trangThai === 4).length,
      tongPhutHomNay: lichNgay.reduce((sum, x) => sum + (x.thoiLuongPhut || 0), 0)
    };

    res.json({
      ngay,
      lanhDao: ctx.info,
      cauHinh,
      mucUuTiens: db.mucUuTiens.filter((m) => m.isActived && !m.isDeleted),
      hangCho,
      lichNgay,
      suKienNgay,
      thongKe
    });
  });

  app.get('/api/TroLy/GetLichTuan', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) {
      return res.status(400).json({ message: 'Tài khoản của bạn chưa được phân công hỗ trợ lãnh đạo nào.' });
    }
    const tuNgay = String(req.query.tuNgay || getYmd(new Date().toISOString())).slice(0, 10);
    const denNgay = String(req.query.denNgay || tuNgay).slice(0, 10);
    const lanhDaoId = ctx.lanhDao.id;
    const cauHinh = getOrCreateCauHinh(lanhDaoId, ctx.lanhDao.chiNhanhId);

    const lichTuan = db.lichTrinhs
      .filter((lt) => {
        if (lt.lanhDaoId !== lanhDaoId || lt.isDeleted || !lt.isActived || lt.trangThai === 3) return false;
        const d = getYmd(lt.batDau);
        return d >= tuNgay && d <= denNgay;
      })
      .map((lt) => buildLichTrinhView(lt, true))
      .filter(Boolean)
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    const suKienTuan = db.suKienLanhDaos
      .filter((sk) => {
        if (sk.lanhDaoId !== lanhDaoId || sk.isDeleted || !sk.isActived) return false;
        const d = getYmd(sk.batDau);
        return d >= tuNgay && d <= denNgay;
      })
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    res.json({
      tuNgay,
      denNgay,
      lanhDao: ctx.info,
      cauHinh,
      lichTrinhs: lichTuan,
      suKiens: suKienTuan
    });
  });

  app.post('/api/TroLy/TiepNhan/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const id = Number(req.params.id);
    const yc = db.yeuCaus.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    const oldStatus = yc.trangThai;
    const nowIso = new Date().toISOString();
    yc.troLyXuLyId = req.currentUserId;
    yc.ngayTiepNhan = yc.ngayTiepNhan || nowIso;
    if (req.body?.mucUuTienId !== undefined) {
      yc.mucUuTienId = req.body.mucUuTienId ? Number(req.body.mucUuTienId) : null;
    }
    if (yc.trangThai === 1) {
      yc.trangThai = 2;
      db.yeuCauLichSuTrangThais.push({
        id: nextId(db.yeuCauLichSuTrangThais, 'id'),
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: yc.id,
        tuTrangThai: oldStatus,
        denTrangThai: 2,
        nguoiThucHienId: req.currentUserId,
        vaiTroThucHien: 'TROLY',
        lyDo: 'Trợ lý tiếp nhận xem xét',
        ghiChu: null,
        createdAt: nowIso
      });
      emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được tiếp nhận xem xét`, yc.nguoiTaoId);
    }
    yc.updatedAt = nowIso;
    yc.updatedBy = req.currentUserId;
    res.json({ message: 'Đã tiếp nhận yêu cầu.' });
  });

  app.post('/api/TroLy/CapNhatUuTien/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const id = Number(req.params.id);
    const yc = db.yeuCaus.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    yc.mucUuTienId = req.body?.mucUuTienId ? Number(req.body.mucUuTienId) : null;
    yc.troLyXuLyId = req.currentUserId;
    yc.updatedAt = new Date().toISOString();
    yc.updatedBy = req.currentUserId;
    res.json({ message: 'Đã cập nhật mức ưu tiên.' });
  });

  app.post('/api/TroLy/XepLich/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });

    const id = Number(req.params.id);
    const yc = db.yeuCaus.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    const body = req.body || {};
    const batDau = String(body.batDau || '');
    const ketThuc = String(body.ketThuc || '');
    if (!batDau || !ketThuc || new Date(ketThuc) <= new Date(batDau)) {
      return res.status(400).json({ message: 'Khung giờ không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).' });
    }

    const nowIso = new Date().toISOString();
    const oldStatus = yc.trangThai;
    yc.troLyXuLyId = req.currentUserId;
    yc.ngayTiepNhan = yc.ngayTiepNhan || nowIso;
    if (body.mucUuTienId !== undefined) {
      yc.mucUuTienId = body.mucUuTienId ? Number(body.mucUuTienId) : yc.mucUuTienId;
    }

    const yeuCauXacNhanNV = Boolean(body.yeuCauXacNhanNV);
    const diaDiem = null;
    const ghiChu = body.ghiChu ?? null;

    if (yeuCauXacNhanNV) {
      const slotId = nextId(db.yeuCauThoiGianDeXuats, 'id');
      db.yeuCauThoiGianDeXuats.push({
        id: slotId,
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: yc.id,
        batDau,
        ketThuc,
        thuTuUuTien: 1,
        nguonDeXuat: 2,
        nhanVienDongY: null,
        ngayPhanHoi: null,
        ghiChu,
        isActived: true,
        isDeleted: false,
        createdAt: nowIso,
        createdBy: req.currentUserId
      });
      yc.trangThai = 3;
      yc.updatedAt = nowIso;
      yc.updatedBy = req.currentUserId;

      db.yeuCauLichSuTrangThais.push({
        id: nextId(db.yeuCauLichSuTrangThais, 'id'),
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: yc.id,
        tuTrangThai: oldStatus,
        denTrangThai: 3,
        nguoiThucHienId: req.currentUserId,
        vaiTroThucHien: 'TROLY',
        lyDo: ghiChu || `Đề xuất lịch ${formatTimeShort(batDau)}-${formatTimeShort(ketThuc)} ngày ${formatDateVi(batDau)}`,
        ghiChu,
        createdAt: nowIso
      });

      emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được đề xuất đổi lịch`, yc.nguoiTaoId);
      emitThongBaoLichTrinh({
        chiNhanhId: yc.chiNhanhId,
        nguoiNhanId: yc.nguoiTaoId,
        tieuDe: 'Trợ lý đề xuất khung giờ trình',
        noiDung: `Trợ lý đề xuất giờ ${formatTimeShort(batDau)} - ${formatTimeShort(ketThuc)} ngày ${formatDateVi(batDau)} cho yêu cầu "${yc.tieuDe}".`,
        loaiSuKien: 'DE_XUAT_DOI_LICH',
        yeuCauId: yc.id,
        routeUrl: `/nhan-vien/detail-request/${yc.id}`
      });

      return res.json({ message: 'Đã gửi đề xuất khung giờ cho nhân viên xác nhận.' });
    }

    // Direct scheduling (TrangThai = 5) — OVERLAPPING IS EXPLICITLY ALLOWED
    const overlaps = db.lichTrinhs.filter(
      (lt) =>
        lt.lanhDaoId === ctx.lanhDao.id &&
        !lt.isDeleted &&
        lt.isActived &&
        lt.trangThai === 1 &&
        lt.yeuCauId !== yc.id &&
        new Date(lt.batDau) < new Date(ketThuc) &&
        new Date(lt.ketThuc) > new Date(batDau)
    );
    const coXepChong = overlaps.length > 0;

    let lich = db.lichTrinhs
      .filter((lt) => lt.yeuCauId === yc.id && !lt.isDeleted && lt.trangThai !== 3)
      .sort((a, b) => b.id - a.id)[0];

    if (!lich) {
      lich = {
        id: nextId(db.lichTrinhs, 'id'),
        chiNhanhId: yc.chiNhanhId,
        yeuCauId: yc.id,
        lanhDaoId: ctx.lanhDao.id,
        batDau,
        ketThuc,
        diaDiem,
        trangThai: 1,
        thuTuTrongNgay: null,
        nguoiChotId: req.currentUserId,
        ngayChot: nowIso,
        daGhiDeXungDot: coXepChong,
        lyDoGhiDe: coXepChong ? (ghiChu || 'Xếp chồng linh hoạt trong khung giờ') : null,
        ghiChuLanhDao: null,
        isActived: true,
        isDeleted: false
      };
      db.lichTrinhs.push(lich);
      db.lichTrinhLichSus.push({
        id: nextId(db.lichTrinhLichSus, 'id'),
        chiNhanhId: yc.chiNhanhId,
        lichTrinhId: lich.id,
        yeuCauId: yc.id,
        lanhDaoId: ctx.lanhDao.id,
        hanhDong: coXepChong ? 7 : 1,
        batDauCu: null,
        ketThucCu: null,
        batDauMoi: batDau,
        ketThucMoi: ketThuc,
        lyDo: ghiChu || 'Trợ lý chốt lịch trình',
        nguoiThucHienId: req.currentUserId,
        createdAt: nowIso
      });
    } else {
      const oldStart = lich.batDau;
      const oldEnd = lich.ketThuc;
      lich.batDau = batDau;
      lich.ketThuc = ketThuc;
      lich.diaDiem = diaDiem;
      lich.trangThai = 1;
      lich.nguoiChotId = req.currentUserId;
      lich.ngayChot = nowIso;
      lich.daGhiDeXungDot = coXepChong;
      lich.lyDoGhiDe = coXepChong ? (ghiChu || 'Xếp chồng linh hoạt trong khung giờ') : null;

      db.lichTrinhLichSus.push({
        id: nextId(db.lichTrinhLichSus, 'id'),
        chiNhanhId: yc.chiNhanhId,
        lichTrinhId: lich.id,
        yeuCauId: yc.id,
        lanhDaoId: ctx.lanhDao.id,
        hanhDong: 2,
        batDauCu: oldStart,
        ketThucCu: oldEnd,
        batDauMoi: batDau,
        ketThucMoi: ketThuc,
        lyDo: ghiChu || 'Trợ lý điều chỉnh giờ trình',
        nguoiThucHienId: req.currentUserId,
        createdAt: nowIso
      });
    }

    yc.trangThai = 5;
    yc.updatedAt = nowIso;
    yc.updatedBy = req.currentUserId;

    db.yeuCauLichSuTrangThais.push({
      id: nextId(db.yeuCauLichSuTrangThais, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: yc.id,
      tuTrangThai: oldStatus,
      denTrangThai: 5,
      nguoiThucHienId: req.currentUserId,
      vaiTroThucHien: 'TROLY',
      lyDo: `Đã xếp lịch ${formatTimeShort(batDau)} - ${formatTimeShort(ketThuc)} ngày ${formatDateVi(batDau)}`,
      ghiChu,
      createdAt: nowIso
    });

    const creator = db.users.find((u) => u.userId === yc.nguoiTaoId);
    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được duyệt lịch`, yc.nguoiTaoId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: yc.nguoiTaoId,
      tieuDe: 'Yêu cầu đã được xếp lịch trình',
      noiDung: `Yêu cầu "${yc.tieuDe}" được xếp lịch lúc ${formatTimeShort(batDau)} - ${formatTimeShort(ketThuc)} ngày ${formatDateVi(batDau)}.`,
      loaiSuKien: 'DA_DUYET',
      yeuCauId: yc.id,
      lichTrinhId: lich.id,
      routeUrl: `/nhan-vien/detail-request/${yc.id}`
    });

    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được xếp lịch`, ctx.lanhDao.userId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: ctx.lanhDao.userId,
      tieuDe: 'Lịch trình mới trong ngày',
      noiDung: `${creator?.tenNguoiDung ?? 'Nhân viên'} trình "${yc.tieuDe}" (${yc.thoiLuongPhut} phút) lúc ${formatTimeShort(batDau)} - ${formatTimeShort(ketThuc)} ngày ${formatDateVi(batDau)}.`,
      loaiSuKien: 'LICH_MOI',
      yeuCauId: yc.id,
      lichTrinhId: lich.id,
      routeUrl: '/lanh-dao'
    });

    res.json({
      message: coXepChong ? 'Đã xếp lịch (xếp chồng khung giờ).' : 'Đã xếp lịch thành công.',
      lichTrinhId: lich.id,
      coXepChong
    });
  });

  app.post('/api/TroLy/YeuCauBoSung/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const id = Number(req.params.id);
    const yc = db.yeuCaus.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    const noiDung = String(req.body?.noiDung || '').trim();
    if (!noiDung) return res.status(400).json({ message: 'Vui lòng nhập nội dung cần bổ sung.' });

    const nowIso = new Date().toISOString();
    const oldStatus = yc.trangThai;
    yc.troLyXuLyId = req.currentUserId;
    yc.trangThai = 4;
    yc.updatedAt = nowIso;
    yc.updatedBy = req.currentUserId;

    db.yeuCauBinhLuans.push({
      id: nextId(db.yeuCauBinhLuans, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: yc.id,
      userId: req.currentUserId,
      noiDung,
      chiNoiBo: false,
      isActived: true,
      isDeleted: false,
      createdAt: nowIso
    });

    db.yeuCauLichSuTrangThais.push({
      id: nextId(db.yeuCauLichSuTrangThais, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: yc.id,
      tuTrangThai: oldStatus,
      denTrangThai: 4,
      nguoiThucHienId: req.currentUserId,
      vaiTroThucHien: 'TROLY',
      lyDo: noiDung,
      ghiChu: null,
      createdAt: nowIso
    });

    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được yêu cầu bổ sung`, yc.nguoiTaoId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: yc.nguoiTaoId,
      tieuDe: 'Cần bổ sung thông tin',
      noiDung: `Trợ lý yêu cầu bổ sung thông tin cho "${yc.tieuDe}": ${noiDung}`,
      loaiSuKien: 'CAN_BO_SUNG',
      yeuCauId: yc.id,
      routeUrl: `/nhan-vien/detail-request/${yc.id}`
    });

    res.json({ message: 'Đã gửi yêu cầu bổ sung cho nhân viên.' });
  });

  app.post('/api/TroLy/TuChoi/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const id = Number(req.params.id);
    const yc = db.yeuCaus.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    const lyDo = String(req.body?.lyDo || '').trim();
    if (!lyDo) return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối.' });

    const nowIso = new Date().toISOString();
    const oldStatus = yc.trangThai;
    yc.troLyXuLyId = req.currentUserId;
    yc.trangThai = 8;
    yc.lyDoTuChoiHuy = lyDo;
    yc.ngayHoanTat = nowIso;
    yc.updatedAt = nowIso;
    yc.updatedBy = req.currentUserId;

    for (const lt of db.lichTrinhs) {
      if (lt.yeuCauId === yc.id && !lt.isDeleted && [1, 4].includes(lt.trangThai)) {
        lt.trangThai = 3;
      }
    }

    db.yeuCauLichSuTrangThais.push({
      id: nextId(db.yeuCauLichSuTrangThais, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: yc.id,
      tuTrangThai: oldStatus,
      denTrangThai: 8,
      nguoiThucHienId: req.currentUserId,
      vaiTroThucHien: 'TROLY',
      lyDo,
      ghiChu: null,
      createdAt: nowIso
    });

    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa bị từ chối`, yc.nguoiTaoId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: yc.nguoiTaoId,
      tieuDe: 'Yêu cầu đã bị từ chối',
      noiDung: `Yêu cầu "${yc.tieuDe}" đã bị từ chối. Lý do: ${lyDo}`,
      loaiSuKien: 'TU_CHOI',
      yeuCauId: yc.id,
      routeUrl: `/nhan-vien/detail-request/${yc.id}`
    });

    res.json({ message: 'Đã từ chối yêu cầu.' });
  });

  app.post('/api/TroLy/CapNhatTrangThaiLich/:lichTrinhId', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const lichTrinhId = Number(req.params.lichTrinhId);
    const lt = db.lichTrinhs.find((x) => x.id === lichTrinhId && x.lanhDaoId === ctx.lanhDao.id && !x.isDeleted);
    if (!lt) return res.status(400).json({ message: 'Không tìm thấy lịch trình.' });
    const yc = db.yeuCaus.find((x) => x.id === lt.yeuCauId);
    if (!yc) return res.status(400).json({ message: 'Không tìm thấy yêu cầu.' });

    const trangThaiMoi = Number(req.body?.trangThaiYeuCau);
    const lyDo = req.body?.lyDo ?? null;
    const nowIso = new Date().toISOString();
    const oldStatus = yc.trangThai;

    yc.trangThai = trangThaiMoi;
    if ([6, 7, 11].includes(trangThaiMoi)) yc.ngayHoanTat = nowIso;
    if (trangThaiMoi === 6 || trangThaiMoi === 7) lt.trangThai = 2;
    else if (trangThaiMoi === 10) lt.trangThai = 4;
    else if (trangThaiMoi === 11) lt.trangThai = 5;

    const statusTextMap = {
      6: 'đánh dấu đã trình',
      7: 'hoàn thành',
      10: 'tạm hoãn',
      11: 'đánh dấu vắng'
    };

    db.yeuCauLichSuTrangThais.push({
      id: nextId(db.yeuCauLichSuTrangThais, 'id'),
      chiNhanhId: yc.chiNhanhId,
      yeuCauId: yc.id,
      tuTrangThai: oldStatus,
      denTrangThai: trangThaiMoi,
      nguoiThucHienId: req.currentUserId,
      vaiTroThucHien: 'TROLY',
      lyDo: lyDo || `Trợ lý ${statusTextMap[trangThaiMoi] || 'cập nhật trạng thái'}`,
      ghiChu: null,
      createdAt: nowIso
    });

    emitThongBao(yc.chiNhanhId, req.currentUserId, `Yêu cầu ${yc.maYeuCau} vừa được ${statusTextMap[trangThaiMoi] || 'cập nhật'}`, yc.nguoiTaoId);
    emitThongBaoLichTrinh({
      chiNhanhId: yc.chiNhanhId,
      nguoiNhanId: yc.nguoiTaoId,
      tieuDe: 'Cập nhật trạng thái buổi trình',
      noiDung: `Yêu cầu "${yc.tieuDe}" vừa được ${statusTextMap[trangThaiMoi] || 'cập nhật'}${lyDo ? `: ${lyDo}` : '.'}`,
      loaiSuKien: 'CAP_NHAT_LICH',
      yeuCauId: yc.id,
      lichTrinhId: lt.id,
      routeUrl: `/nhan-vien/detail-request/${yc.id}`
    });

    res.json({ message: 'Đã cập nhật trạng thái lịch trình.' });
  });

  app.put('/api/TroLy/CapNhatCauHinhLanhDao', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });

    const ch = getOrCreateCauHinh(ctx.lanhDao.id, ctx.lanhDao.chiNhanhId);
    const body = req.body || {};
    if (body.gioBatDau) ch.gioBatDau = body.gioBatDau.length === 5 ? `${body.gioBatDau}:00` : body.gioBatDau;
    if (body.gioKetThuc) ch.gioKetThuc = body.gioKetThuc.length === 5 ? `${body.gioKetThuc}:00` : body.gioKetThuc;
    if (body.nghiTruaTu !== undefined) ch.nghiTruaTu = body.nghiTruaTu ? (body.nghiTruaTu.length === 5 ? `${body.nghiTruaTu}:00` : body.nghiTruaTu) : null;
    if (body.nghiTruaDen !== undefined) ch.nghiTruaDen = body.nghiTruaDen ? (body.nghiTruaDen.length === 5 ? `${body.nghiTruaDen}:00` : body.nghiTruaDen) : null;
    if (body.thoiGianDemPhut !== undefined) ch.thoiGianDemPhut = Number(body.thoiGianDemPhut);
    if (body.gioiHanPhutMoiNgay !== undefined) ch.gioiHanPhutMoiNgay = Number(body.gioiHanPhutMoiNgay);
    if (body.soNgayLamViecMask !== undefined) ch.soNgayLamViecMask = Number(body.soNgayLamViecMask);
    if (body.choNhanVienXemLichTrongBan !== undefined) ch.choNhanVienXemLichTrongBan = Boolean(body.choNhanVienXemLichTrongBan);

    res.json(ch);
  });

  app.post('/api/TroLy/TaoSuKienLanhDao', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const body = req.body || {};
    if (!body.tieuDe || !body.batDau || !body.ketThuc) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tiêu đề và thời gian sự kiện.' });
    }
    const item = {
      id: nextId(db.suKienLanhDaos, 'id'),
      chiNhanhId: ctx.lanhDao.chiNhanhId,
      lanhDaoId: ctx.lanhDao.id,
      loai: Number(body.loai ?? 1),
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
    res.json(item);
  });

  app.delete('/api/TroLy/XoaSuKienLanhDao/:id', requireAuth, (req, res) => {
    const ctx = getLanhDaoOfTroLy(req.currentUserId);
    if (!ctx) return res.status(403).json({ message: 'Không có quyền trợ lý.' });
    const id = Number(req.params.id);
    const sk = db.suKienLanhDaos.find((x) => x.id === id && x.lanhDaoId === ctx.lanhDao.id);
    if (sk) sk.isDeleted = true;
    res.json(true);
  });
}
