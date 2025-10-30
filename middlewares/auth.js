// middlewares/auth.js
export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/account/login");
  }
  // Kiểm tra trạng thái tài khoản
  if (
    req.session.user.is_active === false ||
    req.session.user.is_active === 0
  ) {
    req.session.destroy(() => {
      return res.render("vwAccount/login", {
        error: "Your account has been locked. Please contact administrator.",
      });
    });
    return;
  }

  next();
}

export function requireGuest(req, res, next) {
  if (req.session.user) {
    return res.redirect("/");
  }
  next();
}

export function checkAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/account/login");
  }

  // Kiểm tra trạng thái tài khoản admin
  if (req.session.user.is_active === false) {
    req.session.destroy(() => {
      return res.render("vwAccount/login", {
        error: "Your account has been locked. Please contact administrator.",
      });
    });
    return;
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
    return res.redirect("/account/login");
  }

  // Kiểm tra trạng thái tài khoản
  if (req.session.user.is_active === false) {
    req.session.destroy(() => {
      return res.render("vwAccount/login", {
        error: "Your account has been locked. Please contact administrator.",
      });
    });
    return;
  }

  if (
    req.session.user.role === "instructor" ||
    req.session.user.role === "admin"
  ) {
    return next();
  }

  return res.status(403).render("vwAccount/403", {
    error: "You need instructor role to access this page.",
  });
}

export function requireStudent(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/account/login");
  }

  // Kiểm tra trạng thái tài khoản
  if (req.session.user.is_active === false) {
    req.session.destroy(() => {
      return res.render("vwAccount/login", {
        error: "Your account has been locked. Please contact administrator.",
      });
    });
    return;
  }

  if (
    req.session.user.role === "student" ||
    req.session.user.role === "admin"
  ) {
    return next();
  }

  return res.status(403).render("vwAccount/403", {
    error: "You need student role to access this page.",
  });
}

// THÊM HÀM NÀY - QUAN TRỌNG
export function checkAccountStatus(req, res, next) {
  if (req.session.user && req.session.user.is_active === false) {
    req.session.destroy(() => {
      return res.redirect("/account/login?error=Account locked");
    });
    return;
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

// Chặn admin truy cập các route học viên/giảng viên
// export function blockAdmin(req, res, next) {
//   if (req.session.user?.role === "admin") {
//     return res.status(403).render("vwAccount/404");
//   }
//   next();
// }
