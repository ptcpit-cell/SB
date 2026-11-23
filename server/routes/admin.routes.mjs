// Admin Dashboard, Leader-Assistant Assignment (1-1), Catalog (LoaiYeuCau, MucUuTien), and Excel Report APIs

const STATUS_NAMES = {
  0: 'Bản nháp',
  1: 'Chờ xử lý',
  2: 'Đang xem xét',
  3: 'Đề xuất đổi lịch',
  4: 'Cần bổ sung',
  5: 'Đã duyệt lịch',
  6: 'Đã trình',
  7: 'Hoàn thành',
  8: 'Từ chối',
  9: 'Đã hủy',
  10: 'Hoãn',
  11: 'Vắng'
};

const URGENCY_NAMES = {
  1: 'Thường',
  2: 'Gấp',
  3: 'Rất gấp'
};

export function registerAdminRoutes(app, deps) {
  const { db, requireAuth, nextId, getYmd, enrichUser } = deps;

  // =========================================================================
  // 1. Admin Dashboard overview
  // =========================================================================
  app.get('/api/Admin/GetDashboard', requireAuth, (req, res) => {
    const activeRequests = db.yeuCaus.filter((yc) => !yc.isDeleted && yc.isActived);
    const activeLeaders = db.lanhDaos.filter((ld) => !ld.isDeleted && ld.isActived);
    const activeSchedules = db.lichTrinhs.filter((lt) => !lt.isDeleted && lt.isActived && lt.trangThai !== 3);
    const todayYmd = getYmd(new Date().toISOString());

    const statusCountsMap = new Map();
    for (const yc of activeRequests) {
      statusCountsMap.set(yc.trangThai, (statusCountsMap.get(yc.trangThai) || 0) + 1);
    }
    const theoTrangThai = Object.entries(STATUS_NAMES).map(([k, label]) => ({
      trangThai: Number(k),
      tenTrangThai: label,
      soLuong: statusCountsMap.get(Number(k)) || 0
    }));

    const theoChiNhanh = db.chiNhanhs
      .filter((cn) => cn.isActived)
      .map((cn) => {
        const list = activeRequests.filter((yc) => yc.chiNhanhId === cn.chiNhanhId);
        return {
          chiNhanhId: cn.chiNhanhId,
          maChiNhanh: cn.maChiNhanh,
          tenChiNhanh: cn.tenChiNhanh,
          tongYeuCau: list.length,
          dangXuLy: list.filter((x) => [1, 2, 3, 4, 5, 10].includes(x.trangThai)).length,
          hoanThanh: list.filter((x) => x.trangThai === 6 || x.trangThai === 7).length,
          tuChoiHuy: list.filter((x) => x.trangThai === 8 || x.trangThai === 9 || x.trangThai === 11).length
        };
      })
      .filter((x) => x.tongYeuCau > 0 || x.chiNhanhId === 1);

    const lichHomNay = activeSchedules
      .filter((lt) => getYmd(lt.batDau) === todayYmd)
      .map((lt) => {
        const yc = db.yeuCaus.find((x) => x.id === lt.yeuCauId);
        const ld = db.lanhDaos.find((x) => x.id === lt.lanhDaoId);
        const ldUser = ld ? db.users.find((u) => u.userId === ld.userId) : null;
        const nvUser = yc ? db.users.find((u) => u.userId === yc.nguoiTaoId) : null;
        return {
          lichTrinhId: lt.id,
          yeuCauId: lt.yeuCauId,
          maYeuCau: yc?.maYeuCau ?? '',
          tieuDe: yc?.tieuDe ?? '',
          tenLanhDao: ldUser?.tenNguoiDung ?? '',
          tenNguoiTrinh: nvUser?.tenNguoiDung ?? '',
          batDau: lt.batDau,
          ketThuc: lt.ketThuc,
          trangThaiLich: lt.trangThai
        };
      })
      .sort((a, b) => new Date(a.batDau) - new Date(b.batDau));

    res.json({
      tongQuan: {
        tongYeuCau: activeRequests.length,
        choXuLy: activeRequests.filter((x) => [1, 2, 3, 4].includes(x.trangThai)).length,
        daDuyetLich: activeRequests.filter((x) => x.trangThai === 5).length,
        daHoanThanh: activeRequests.filter((x) => x.trangThai === 6 || x.trangThai === 7).length,
        tuChoiHuy: activeRequests.filter((x) => [8, 9, 11].includes(x.trangThai)).length,
        tongLanhDao: activeLeaders.length,
        buoiTrinhHomNay: lichHomNay.length,
        tongNguoiDung: db.users.filter((u) => !u.isDeleted && u.isActived).length
      },
      theoTrangThai,
      theoChiNhanh,
      lichHomNay
    });
  });

  // =========================================================================
  // 2. Leader & Single-Assistant Assignment (1 Leader = 1 Unique Assistant)
  // =========================================================================
  app.get('/api/Admin/GetLanhDaos', requireAuth, (req, res) => {
    const items = db.lanhDaos
      .filter((ld) => !ld.isDeleted)
      .map((ld) => {
        const u = db.users.find((x) => x.userId === ld.userId);
        const enriched = u ? enrichUser(u) : null;
        const cn = db.chiNhanhs.find((c) => c.chiNhanhId === ld.chiNhanhId);
        const mapping = db.troLys.find(
          (m) => m.lanhDaoId === ld.id && !m.isDeleted && m.isActived
        );
        const troLyUser = mapping ? db.users.find((x) => x.userId === mapping.userId) : null;
        return {
          id: ld.id,
          chiNhanhId: ld.chiNhanhId,
          tenChiNhanh: cn?.tenChiNhanh ?? '',
          userId: ld.userId,
          hoTen: enriched?.tenNguoiDung ?? '',
          userName: u?.userName ?? '',
          tenChucVu: enriched?.tenChucVu ?? '',
          tenPhongBan: enriched?.tenPhongBan ?? '',
          capDo: ld.capDo,
          thuTuHienThi: ld.thuTuHienThi,
          isActived: ld.isActived,
          troLyUserId: mapping?.userId ?? null,
          tenTroLy: troLyUser?.tenNguoiDung ?? '',
          userNameTroLy: troLyUser?.userName ?? ''
        };
      })
      .sort((a, b) => a.capDo - b.capDo || a.thuTuHienThi - b.thuTuHienThi);

    const users = db.users
      .filter((u) => !u.isDeleted && u.isActived)
      .map((u) => {
        const e = enrichUser(u);
        const roleNames = db.userRoles
          .filter((ur) => ur.userId === u.userId)
          .map((ur) => db.roles.find((r) => r.roleId === ur.roleId)?.tenRole || '')
          .filter(Boolean);
        return {
          userId: u.userId,
          userName: u.userName,
          tenNguoiDung: u.tenNguoiDung,
          chiNhanhId: u.chiNhanhId,
          tenChiNhanh: e.tenChiNhanh,
          tenChucVu: e.tenChucVu,
          tenPhongBan: e.tenPhongBan,
          roleNames
        };
      });

    res.json({ lanhDaos: items, users });
  });

  app.post('/api/Admin/SaveLanhDao', requireAuth, (req, res) => {
    const body = req.body || {};
    const id = Number(body.id || 0);
    const userId = Number(body.userId || 0);
    const chiNhanhId = Number(body.chiNhanhId || req.currentChiNhanhId || 1);
    const capDo = Number(body.capDo || 2);
    const thuTuHienThi = Number(body.thuTuHienThi || 1);
    const isActived = body.isActived !== undefined ? Boolean(body.isActived) : true;
    const troLyUserId = body.troLyUserId ? Number(body.troLyUserId) : null;

    if (!userId) {
      return res.status(400).json({ message: 'Vui lòng chọn tài khoản Lãnh đạo.' });
    }
    if (troLyUserId && troLyUserId === userId) {
      return res.status(400).json({ message: 'Lãnh đạo không thể tự làm trợ lý của chính mình.' });
    }

    // Check duplicate leader user
    const dupLeader = db.lanhDaos.find(
      (ld) => !ld.isDeleted && ld.userId === userId && ld.id !== id
    );
    if (dupLeader) {
      return res.status(400).json({ message: 'Tài khoản này đã được cấu hình trong danh sách Lãnh đạo.' });
    }

    // Enforce 1 assistant per leader strictly (prevent same assistant assigned to multiple leaders)
    if (troLyUserId) {
      const otherMapping = db.troLys.find(
        (m) => !m.isDeleted && m.isActived && m.userId === troLyUserId && m.lanhDaoId !== id
      );
      if (otherMapping) {
        const otherLd = db.lanhDaos.find((x) => x.id === otherMapping.lanhDaoId);
        const otherLdUser = otherLd ? db.users.find((u) => u.userId === otherLd.userId) : null;
        return res.status(400).json({
          message: `Trợ lý này đang phụ trách lãnh đạo "${otherLdUser?.tenNguoiDung || '#' + otherMapping.lanhDaoId}". Vui lòng chọn trợ lý khác hoặc gỡ phân công cũ trước.`
        });
      }
    }

    let leader;
    if (id > 0) {
      leader = db.lanhDaos.find((ld) => ld.id === id && !ld.isDeleted);
      if (!leader) return res.status(404).json({ message: 'Không tìm thấy hồ sơ lãnh đạo.' });
      leader.userId = userId;
      leader.chiNhanhId = chiNhanhId;
      leader.capDo = capDo;
      leader.thuTuHienThi = thuTuHienThi;
      leader.isActived = isActived;
    } else {
      leader = {
        id: nextId(db.lanhDaos, 'id'),
        chiNhanhId,
        userId,
        capDo,
        thuTuHienThi,
        phongLamViec: null,
        isActived,
        isDeleted: false
      };
      db.lanhDaos.push(leader);
    }

    // Sync single assistant mapping (deactivate old, set exactly 1 active if provided)
    for (const m of db.troLys) {
      if (m.lanhDaoId === leader.id && !m.isDeleted) {
        m.isActived = false;
        m.isDeleted = true;
      }
    }
    if (troLyUserId) {
      db.troLys.push({
        id: nextId(db.troLys, 'id'),
        chiNhanhId,
        lanhDaoId: leader.id,
        userId: troLyUserId,
        isTroLyChinh: true,
        choPhepGhiDeXungDot: true,
        isActived: true,
        isDeleted: false
      });
    }

    res.json({ message: id > 0 ? 'Đã cập nhật hồ sơ lãnh đạo.' : 'Đã thêm lãnh đạo mới.', id: leader.id });
  });

  app.delete('/api/Admin/DeleteLanhDao/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const leader = db.lanhDaos.find((ld) => ld.id === id && !ld.isDeleted);
    if (!leader) return res.status(404).json({ message: 'Không tìm thấy lãnh đạo.' });
    leader.isDeleted = true;
    leader.isActived = false;
    for (const m of db.troLys) {
      if (m.lanhDaoId === id) {
        m.isDeleted = true;
        m.isActived = false;
      }
    }
    res.json({ message: 'Đã xóa hồ sơ lãnh đạo.' });
  });

  // =========================================================================
  // 3. Catalog: LoaiYeuCau & MucUuTien
  // =========================================================================
  app.get('/api/Admin/GetLoaiYeuCaus', requireAuth, (req, res) => {
    const rows = db.loaiYeuCaus
      .filter((x) => !x.isDeleted)
      .sort((a, b) => a.id - b.id);
    res.json(rows);
  });

  app.post('/api/Admin/SaveLoaiYeuCau', requireAuth, (req, res) => {
    const body = req.body || {};
    const id = Number(body.id || 0);
    const maLoai = String(body.maLoai || '').trim().toUpperCase();
    const tenLoai = String(body.tenLoai || '').trim();
    const thoiLuongMacDinhPhut = Math.max(5, Math.min(240, Number(body.thoiLuongMacDinhPhut || 30)));
    const isActived = body.isActived !== undefined ? Boolean(body.isActived) : true;

    if (!maLoai || !tenLoai) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mã loại và tên loại yêu cầu.' });
    }
    const dup = db.loaiYeuCaus.find(
      (x) => !x.isDeleted && x.maLoai.toUpperCase() === maLoai && x.id !== id
    );
    if (dup) {
      return res.status(400).json({ message: `Mã loại "${maLoai}" đã tồn tại.` });
    }

    if (id > 0) {
      const item = db.loaiYeuCaus.find((x) => x.id === id && !x.isDeleted);
      if (!item) return res.status(404).json({ message: 'Không tìm thấy loại yêu cầu.' });
      item.maLoai = maLoai;
      item.tenLoai = tenLoai;
      item.thoiLuongMacDinhPhut = thoiLuongMacDinhPhut;
      item.isActived = isActived;
      return res.json({ message: 'Đã cập nhật loại yêu cầu.', data: item });
    }

    const created = {
      id: nextId(db.loaiYeuCaus, 'id'),
      chiNhanhId: Number(body.chiNhanhId || req.currentChiNhanhId || 1),
      maLoai,
      tenLoai,
      thoiLuongMacDinhPhut,
      isActived,
      isDeleted: false
    };
    db.loaiYeuCaus.push(created);
    return res.json({ message: 'Đã thêm loại yêu cầu mới.', data: created });
  });

  app.delete('/api/Admin/DeleteLoaiYeuCau/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const item = db.loaiYeuCaus.find((x) => x.id === id && !x.isDeleted);
    if (!item) return res.status(404).json({ message: 'Không tìm thấy loại yêu cầu.' });
    item.isDeleted = true;
    item.isActived = false;
    res.json({ message: 'Đã xóa loại yêu cầu.' });
  });

  app.get('/api/Admin/GetMucUuTiens', requireAuth, (req, res) => {
    const rows = db.mucUuTiens
      .filter((x) => !x.isDeleted)
      .sort((a, b) => b.trongSo - a.trongSo);
    res.json(rows);
  });

  app.post('/api/Admin/SaveMucUuTien', requireAuth, (req, res) => {
    const body = req.body || {};
    const id = Number(body.id || 0);
    const code = String(body.code || '').trim().toUpperCase();
    const ten = String(body.ten || '').trim();
    const trongSo = Number(body.trongSo || 50);
    const mauHienThi = String(body.mauHienThi || '#0d6efd').trim();
    const isActived = body.isActived !== undefined ? Boolean(body.isActived) : true;

    if (!code || !ten) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mã và tên mức ưu tiên.' });
    }
    const dup = db.mucUuTiens.find(
      (x) => !x.isDeleted && x.code.toUpperCase() === code && x.id !== id
    );
    if (dup) {
      return res.status(400).json({ message: `Mã mức ưu tiên "${code}" đã tồn tại.` });
    }

    if (id > 0) {
      const item = db.mucUuTiens.find((x) => x.id === id && !x.isDeleted);
      if (!item) return res.status(404).json({ message: 'Không tìm thấy mức ưu tiên.' });
      item.code = code;
      item.ten = ten;
      item.trongSo = trongSo;
      item.mauHienThi = mauHienThi;
      item.isActived = isActived;
      return res.json({ message: 'Đã cập nhật mức ưu tiên.', data: item });
    }

    const created = {
      id: nextId(db.mucUuTiens, 'id'),
      chiNhanhId: Number(body.chiNhanhId || req.currentChiNhanhId || 1),
      code,
      ten,
      trongSo,
      mauHienThi,
      isActived,
      isDeleted: false
    };
    db.mucUuTiens.push(created);
    return res.json({ message: 'Đã thêm mức ưu tiên mới.', data: created });
  });

  app.delete('/api/Admin/DeleteMucUuTien/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const item = db.mucUuTiens.find((x) => x.id === id && !x.isDeleted);
    if (!item) return res.status(404).json({ message: 'Không tìm thấy mức ưu tiên.' });
    item.isDeleted = true;
    item.isActived = false;
    res.json({ message: 'Đã xóa mức ưu tiên.' });
  });

  // =========================================================================
  // 4. Report data endpoint for Excel Export
  // =========================================================================
  app.get('/api/Report/GetBaoCaoYeuCau', requireAuth, (req, res) => {
    const tuNgay = String(req.query.tuNgay || '').slice(0, 10);
    const denNgay = String(req.query.denNgay || '').slice(0, 10);
    const chiNhanhId = req.query.chiNhanhId !== undefined && req.query.chiNhanhId !== ''
      ? Number(req.query.chiNhanhId)
      : req.currentChiNhanhId;
    const nhomTrangThai = Number(req.query.nhomTrangThai || 0); // 0 all, 1 active, 2 completed

    let list = db.yeuCaus.filter((yc) => !yc.isDeleted && yc.isActived);

    if (chiNhanhId && chiNhanhId > 0) {
      list = list.filter((yc) => yc.chiNhanhId === chiNhanhId);
    }

    if (nhomTrangThai === 1) {
      list = list.filter((yc) => [0, 1, 2, 3, 4, 5, 10].includes(yc.trangThai));
    } else if (nhomTrangThai === 2) {
      list = list.filter((yc) => [6, 7].includes(yc.trangThai));
    }

    const rows = list
      .map((yc) => {
        const lich = db.lichTrinhs
          .filter((lt) => lt.yeuCauId === yc.id && !lt.isDeleted && lt.isActived && lt.trangThai !== 3)
          .sort((a, b) => new Date(b.batDau) - new Date(a.batDau))[0];
        const kq = db.ketQuaTrinhs
          .filter((k) => k.yeuCauId === yc.id && !k.isDeleted)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        // Determine effective date for range filtering (prefer scheduled date, else sent date, else created date)
        const refDate = getYmd(lich?.batDau || yc.ngayGui || yc.createdAt);
        const cn = db.chiNhanhs.find((c) => c.chiNhanhId === yc.chiNhanhId);
        const creator = db.users.find((u) => u.userId === yc.nguoiTaoId);
        const creatorEnriched = creator ? enrichUser(creator) : null;
        const ld = db.lanhDaos.find((x) => x.id === yc.lanhDaoId);
        const ldUser = ld ? db.users.find((u) => u.userId === ld.userId) : null;
        const loai = db.loaiYeuCaus.find((x) => x.id === yc.loaiYeuCauId);
        const uuTien = yc.mucUuTienId ? db.mucUuTiens.find((m) => m.id === yc.mucUuTienId) : null;

        return {
          refDate,
          yeuCauId: yc.id,
          maYeuCau: yc.maYeuCau,
          tieuDe: yc.tieuDe,
          tomTat: yc.tomTat || '',
          chiNhanhId: yc.chiNhanhId,
          tenChiNhanh: cn?.tenChiNhanh || '',
          tenNguoiTrinh: creatorEnriched?.tenNguoiDung || '',
          tenPhongBan: creatorEnriched?.tenPhongBan || '',
          tenChucVu: creatorEnriched?.tenChucVu || '',
          tenLanhDao: ldUser?.tenNguoiDung || '',
          tenLoai: loai?.tenLoai || '',
          mucKhan: URGENCY_NAMES[yc.mucKhan] || 'Thường',
          mucUuTien: uuTien ? `${uuTien.code} - ${uuTien.ten}` : '',
          thoiLuongPhut: yc.thoiLuongPhut,
          hanChot: yc.hanChot || null,
          ngayGui: yc.ngayGui || null,
          createdAt: yc.createdAt,
          lichBatDau: lich?.batDau || null,
          lichKetThuc: lich?.ketThuc || null,
          trangThai: yc.trangThai,
          tenTrangThai: STATUS_NAMES[yc.trangThai] || '—',
          phanHoiLanhDao: kq?.chiDaoCuaLanhDao || '',
          lyDoTuChoiHuy: yc.lyDoTuChoiHuy || ''
        };
      })
      .filter((r) => {
        if (tuNgay && r.refDate < tuNgay) return false;
        if (denNgay && r.refDate > denNgay) return false;
        return true;
      })
      .sort((a, b) => new Date(b.lichBatDau || b.ngayGui || b.createdAt) - new Date(a.lichBatDau || a.ngayGui || a.createdAt));

    const branchInfo = chiNhanhId > 0
      ? db.chiNhanhs.find((c) => c.chiNhanhId === chiNhanhId)
      : null;

    res.json({
      tuNgay,
      denNgay,
      chiNhanhId,
      tenChiNhanh: branchInfo ? branchInfo.tenChiNhanh : 'Tất cả chi nhánh',
      tongSo: rows.length,
      rows
    });
  });
}
