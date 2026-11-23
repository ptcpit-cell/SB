// User self-service profile endpoints (/api/Account/Profile)

export function registerProfileRoutes(app, deps) {
  const { db, requireAuth, enrichUser, getUserPermissions } = deps;

  app.get('/api/Account/Profile', requireAuth, (req, res) => {
    const user = db.users.find((u) => u.userId === req.currentUserId && !u.isDeleted);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản người dùng.' });

    const enriched = enrichUser(user);
    const roles = db.userRoles
      .filter((ur) => ur.userId === user.userId)
      .map((ur) => {
        const r = db.roles.find((role) => role.roleId === ur.roleId && !role.isDeleted);
        return r ? { roleId: r.roleId, tenRole: r.tenRole } : null;
      })
      .filter(Boolean);

    res.json({
      userId: user.userId,
      userName: user.userName,
      tenNguoiDung: user.tenNguoiDung || '',
      email: user.email || '',
      phone: user.phone || '',
      zaloId: user.zaloId || '',
      chiNhanhId: user.chiNhanhId,
      tenChiNhanh: enriched.tenChiNhanh,
      phongBanId: user.phongBanId ?? null,
      tenPhongBan: enriched.tenPhongBan,
      chucVuId: user.chucVuId ?? null,
      tenChucVu: enriched.tenChucVu,
      roles,
      permissions: getUserPermissions(user.userId)
    });
  });

  app.put('/api/Account/Profile', requireAuth, (req, res) => {
    const user = db.users.find((u) => u.userId === req.currentUserId && !u.isDeleted);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản người dùng.' });

    const body = req.body || {};
    const tenNguoiDung = String(body.tenNguoiDung ?? user.tenNguoiDung ?? '').trim();
    if (!tenNguoiDung) {
      return res.status(400).json({ message: 'Họ và tên không được để trống.' });
    }

    const email = String(body.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Địa chỉ email không đúng định dạng.' });
    }

    const phone = String(body.phone ?? '').trim();
    const zaloId = String(body.zaloId ?? '').trim();

    user.tenNguoiDung = tenNguoiDung;
    user.email = email;
    user.phone = phone;
    user.zaloId = zaloId || null;

    if (body.phongBanId !== undefined) {
      user.phongBanId = body.phongBanId ? Number(body.phongBanId) : null;
    }
    if (body.chucVuId !== undefined) {
      user.chucVuId = body.chucVuId ? Number(body.chucVuId) : null;
    }

    const enriched = enrichUser(user);
    const roles = db.userRoles
      .filter((ur) => ur.userId === user.userId)
      .map((ur) => {
        const r = db.roles.find((role) => role.roleId === ur.roleId && !role.isDeleted);
        return r ? { roleId: r.roleId, tenRole: r.tenRole } : null;
      })
      .filter(Boolean);

    res.json({
      message: 'Cập nhật hồ sơ cá nhân thành công.',
      profile: {
        userId: user.userId,
        userName: user.userName,
        tenNguoiDung: user.tenNguoiDung,
        email: user.email || '',
        phone: user.phone || '',
        zaloId: user.zaloId || '',
        chiNhanhId: user.chiNhanhId,
        tenChiNhanh: enriched.tenChiNhanh,
        phongBanId: user.phongBanId ?? null,
        tenPhongBan: enriched.tenPhongBan,
        chucVuId: user.chucVuId ?? null,
        tenChucVu: enriched.tenChucVu,
        roles,
        permissions: getUserPermissions(user.userId)
      }
    });
  });
}
