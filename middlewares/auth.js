export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/account/login");
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
  if (req.session.user.role === "admin") {
    return next();
  }
  return res.status(403).render("vwAccount/403", {
    error: "You do not have permission to access this page.",
  });
}
