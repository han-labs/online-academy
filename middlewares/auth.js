// middlewares/auth.js
export function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/account/login');
  next();
}

export function requireGuest(req, res, next) {
  // Các trang guest-only (login/register). Nếu đã đăng nhập thì về trang chủ (hoặc tuỳ bạn đổi).
  if (req.session.user) {
    return res.redirect('/');
  }
  next();
}

export function checkAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('vwAccount/404');
  }
  next();
}

export function requireStudent(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'student') {
    return res.status(403).render('vwAccount/404');
  }
  next();
}

export function requireInstructor(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'instructor') {
    return res.status(403).render('vwAccount/404');
  }
  next();
}

// Chặn admin truy cập các route học viên/giảng viên
export function blockAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') {
    return res.status(403).render('vwAccount/404');
  }
  next();
}




// export function requireAuth(req, res, next) {
//   if (!req.session.user) {
//     return res.redirect('/account/login');
//   }
//   next();
// }

// export function requireGuest(req, res, next) {
//   if (req.session.user) {
//     return res.redirect('/');
//   }
//   next();
// }

// export function checkAdmin(req, res, next) {
//   if (!req.session.user) {
//     return res.redirect('/account/login');
//   }
//   if (req.session.user.permission === 1) {
//     return next();
//   }
//   return res.status(403).render('vwAccount/403', {
//     error: 'You do not have permission to access this page.'
//   });
// }

// // Middleware mới: chỉ cho phép user role = instructor truy cập
// export function requireInstructor(req, res, next) {
//   if (!req.session.user) {
//     return res.redirect("/account/login");
//   }
//   if (req.session.user.role === "instructor") {
//     return next();
//   }
//   return res.status(403).render("vwAccount/403", {
//     error: "Bạn không có quyền truy cập trang này.",
//   });
// }

// // Chặn admin truy cập các route học viên/giảng viên
// export function blockAdmin(req, res, next) {
//   if (req.session.user?.role === 'admin') {
//     return res.status(403).render('vwAccount/404');
//   }
//   next();
// }
