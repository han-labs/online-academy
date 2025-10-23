export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/account/login");
  }
  next();
}

export function requireGuest(req, res, next) {

    if (req.session.user) {
        // Nếu là giảng viên → dashboard giảng viên
        if (req.session.user.role === 'instructor') {
            return res.redirect('/teacher/dashboard');
        }
        // Nếu là học viên → home page bình thường
        return res.redirect('/');
    }
    next();
}

export function checkAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/account/login");
  }
  if (req.session.user.role === "admin") {
    return next();
  }
  return res.status(403).render("vwAccount/403", {
    error: "You do not have permission to access this page.",
  });
}

export function requireInstructor(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/account/login'); // nếu chưa login thì chuyển tới login
    }
    if (req.session.user.role !== 'instructor') {
        return res.status(403).render('vwAccount/403', {
            error: 'Bạn không có quyền truy cập trang này.'
        });
    }
    next();
}
