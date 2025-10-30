// routes/account.route.js - MERGED
import { Router } from "express";
import bcrypt from "bcrypt";
import db from "../utils/db.js";
import { requireGuest, requireAuth } from "../middlewares/auth.js";
import otpService from "../utils/otp.service.js";
import emailService from "../utils/email.service.js";
import enrollmentModel from "../models/enrollment.model.js";

const router = Router();

// ========== REGISTER with OTP ==========
router.get("/register", requireGuest, (req, res) => {
  res.render("vwAccount/register");
});

router.post("/register", requireGuest, async (req, res) => {
  const { full_name, email, password, confirm_password } = req.body;

  if (!full_name || !email || !password) {
    return res.render("vwAccount/register", {
      error: "Please fill all required fields.",
    });
  }
  if (password !== confirm_password) {
    return res.render("vwAccount/register", {
      error: "Password confirmation does not match.",
    });
  }
  if (password.length < 6) {
    return res.render("vwAccount/register", {
      error: "Password must have at least 6 characters.",
    });
  }

  const existed = await db("users").where({ email }).first();
  if (existed) {
    return res.render("vwAccount/register", {
      error: "Email is already in use.",
    });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    req.session.tempUser = { full_name, email, password_hash };

    const otpCode = await otpService.create(email, "register");
    await emailService.sendOTP(email, otpCode, "register");

    return res.redirect(
      `/account/verify-otp?email=${encodeURIComponent(email)}`
    );
  } catch (error) {
    console.error("Register error:", error);
    return res.render("vwAccount/register", {
      error: "An error occurred. Please try again.",
    });
  }
});

router.get("/verify-otp", requireGuest, (req, res) => {
  const email = req.query.email;
  if (!email || !req.session.tempUser || req.session.tempUser.email !== email) {
    return res.redirect("/account/register");
  }
  res.render("vwAccount/verify-otp", { email });
});

router.post("/verify-otp", requireGuest, async (req, res) => {
  const { email, otp_code } = req.body;
  if (!email || !otp_code || !req.session.tempUser) {
    return res.redirect("/account/register");
  }

  try {
    const isValid = await otpService.verify(email, otp_code, "register");
    if (!isValid) {
      return res.render("vwAccount/verify-otp", {
        email,
        error: "OTP is invalid or expired.",
      });
    }

    const { full_name, password_hash } = req.session.tempUser;
    await db("users").insert({
      full_name,
      email,
      password_hash,
      role: "student",
      created_at: new Date(),
    });

    await emailService.sendWelcome(email, full_name);
    delete req.session.tempUser;

    req.session.registerSuccess = true;
    return res.redirect("/account/login?success=1");
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.render("vwAccount/verify-otp", {
      email,
      error: "An error occurred. Please try again.",
    });
  }
});

router.post("/resend-otp", requireGuest, async (req, res) => {
  const { email } = req.body;
  if (!email || !req.session.tempUser) return res.redirect("/account/register");

  try {
    const otpCode = await otpService.create(email, "register");
    await emailService.sendOTP(email, otpCode, "register");
    return res.redirect(
      `/account/verify-otp?email=${encodeURIComponent(email)}&resent=1`
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.redirect(
      `/account/verify-otp?email=${encodeURIComponent(email)}&error=1`
    );
  }
});

// ========== LOGIN ==========
router.get("/login", requireGuest, (req, res) => {
  const success =
    req.query.success === "1"
      ? "Registration successful! Please log in."
      : null;
  res.render("vwAccount/login", { success });
});

// redirect theo role (giữ logic merge + thêm teacher/admin)
router.post("/login", requireGuest, async (req, res) => {
  const { email, password, remember } = req.body;
  if (!email || !password) {
    return res.render("vwAccount/login", {
      error: "Please enter email and password.",
    });
  }

  try {
    const user = await db("users").where({ email }).first();
    if (!user) {
      return res.render("vwAccount/login", {
        error: "Email or password is incorrect.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash || ""
    );
    if (!isPasswordValid) {
      return res.render("vwAccount/login", {
        error: "Email or password is incorrect.",
      });
    }

    // Kiểm tra trạng thái tài khoản
    // 🔥 KIỂM TRA TÀI KHOẢN BỊ KHÓA
    if (user.is_active === false) {
      return res.render("vwAccount/login", {
        error: "Your account has been locked. Please contact administrator.",
        form: req.body,
      });
    }

    req.session.user = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      auth_provider: user.auth_provider || "local",
      permission: user.role === "admin" ? 1 : 0,
    };

    if (remember) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;

    if (user.role === "admin") return res.redirect("/admin/dashboard");
    if (user.role === "instructor") return res.redirect("/teacher/dashboard");
    return res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    return res.render("vwAccount/login", {
      error: "An error occurred. Please try again.",
    });
  }
});

// ========== FORGOT PASSWORD (request OTP) ==========
router.get("/forgot-password", requireGuest, (req, res) => {
  res.render("vwAccount/forgot-password");
});

router.post("/forgot-password", requireGuest, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.render("vwAccount/forgot-password", {
        error: "Please enter your email.",
      });

    const user = await db("users").where({ email }).first();
    if (!user) {
      // Để tránh lộ thông tin, vẫn trả về "đã gửi"
      return res.render("vwAccount/forgot-password", {
        success:
          "If this email exists, we’ve sent a 6-digit OTP to reset your password.",
      });
    }

    // Tài khoản Google -> gợi ý đăng nhập Google (không reset bằng email & mật khẩu)
    if ((user.auth_provider || "local") === "google") {
      return res.render("vwAccount/forgot-password", {
        error:
          "This account is linked with Google. Please sign in with Google instead.",
      });
    }

    const code = await otpService.create(email, "reset_password");
    await emailService.sendOTP(email, code, "reset_password");

    // Ghi lại email đang reset để kiểm tra bước sau
    req.session.resetEmail = email;
    return res.redirect(
      `/account/reset-password?email=${encodeURIComponent(email)}`
    );
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.render("vwAccount/forgot-password", {
      error: "Something went wrong. Please try again.",
    });
  }
});

// ========== RESET PASSWORD (verify OTP + set new password) ==========
router.get("/reset-password", requireGuest, (req, res) => {
  const email = req.query.email;
  if (!email || req.session.resetEmail !== email) {
    return res.redirect("/account/forgot-password");
  }
  res.render("vwAccount/reset-password", { email });
});

router.post("/reset-password", requireGuest, async (req, res) => {
  const { email, otp_code, new_password, confirm_password } = req.body;

  if (!email || req.session.resetEmail !== email) {
    return res.redirect("/account/forgot-password");
  }
  if (!otp_code || otp_code.length !== 6) {
    return res.render("vwAccount/reset-password", {
      email,
      error: "Please enter the 6-digit code.",
    });
  }
  if (!new_password || !confirm_password) {
    return res.render("vwAccount/reset-password", {
      email,
      error: "Please enter your new password.",
    });
  }
  if (new_password !== confirm_password) {
    return res.render("vwAccount/reset-password", {
      email,
      error: "Password confirmation does not match.",
    });
  }
  if (new_password.length < 6) {
    return res.render("vwAccount/reset-password", {
      email,
      error: "New password must have at least 6 characters.",
    });
  }

  try {
    const isValid = await otpService.verify(email, otp_code, "reset_password");
    if (!isValid) {
      return res.render("vwAccount/reset-password", {
        email,
        error: "OTP is invalid or expired.",
      });
    }

    const user = await db("users").where({ email }).first();
    if (!user) {
      // Không để lộ thông tin — quay về forgot
      delete req.session.resetEmail;
      return res.redirect("/account/forgot-password");
    }
    if ((user.auth_provider || "local") === "google") {
      return res.render("vwAccount/reset-password", {
        email,
        error:
          "This account is linked with Google. Please sign in with Google instead.",
      });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db("users").where({ email }).update({
      password_hash: hash,
    });

    delete req.session.resetEmail;

    await emailService.sendPasswordResetSuccess(email);
    return res.redirect("/account/login?success=1");
  } catch (err) {
    console.error("Reset password error:", err);
    return res.render("vwAccount/reset-password", {
      email,
      error: "Something went wrong. Please try again.",
    });
  }
});

// ========== RESEND RESET OTP ==========
router.post("/resend-reset-otp", requireGuest, async (req, res) => {
  const { email } = req.body;
  if (!email || req.session.resetEmail !== email)
    return res.redirect("/account/forgot-password");

  try {
    const code = await otpService.create(email, "reset_password");
    await emailService.sendOTP(email, code, "reset_password");
    return res.redirect(
      `/account/reset-password?email=${encodeURIComponent(email)}&resent=1`
    );
  } catch (err) {
    console.error("Resend reset OTP error:", err);
    return res.redirect(
      `/account/reset-password?email=${encodeURIComponent(email)}&error=1`
    );
  }
});

// ========== LOGOUT ==========
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ========== PROFILE ==========
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const me = await db("users").where({ id: req.session.user.id }).first();
    if (!me) return res.redirect("/account/login");

    const [{ enr }] = await db("enrollments")
      .where({ user_id: me.id })
      .count({ enr: "*" });
    const [{ wl }] = await db("watchlists")
      .where({ user_id: me.id })
      .count({ wl: "*" })
      .catch(() => [{ wl: 0 }]);

    res.render("vwAccount/profile", {
      me,
      stats: {
        enrollments: Number(enr || 0),
        watchlists: Number(wl || 0),
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.redirect("/");
  }
});

// cho phép tài khoản Google chỉ đổi name
router.post("/profile", requireAuth, async (req, res) => {
  const { full_name, email } = req.body;
  const myId = req.session.user.id;
  const isGoogle = (req.session.user.auth_provider || "local") === "google";

  if (!full_name || (!isGoogle && !email)) {
    return res.redirect("/account/profile?error=2");
  }

  try {
    if (isGoogle) {
      await db("users").where({ id: myId }).update({ full_name });
      req.session.user.name = full_name;
      return res.redirect("/account/profile?success=1");
    }

    const existed = await db("users")
      .where({ email })
      .andWhereNot({ id: myId })
      .first();
    if (existed) return res.redirect("/account/profile?error=1");

    const updated = await db("users")
      .where({ id: myId })
      .update({ full_name, email });
    if (updated === 0) return res.redirect("/account/profile?error=3");

    req.session.user.name = full_name;
    req.session.user.email = email;

    return res.redirect("/account/profile?success=1");
  } catch (error) {
    console.error("Update profile error:", error);
    return res.redirect("/account/profile?error=3");
  }
});

// ========== CHANGE PASSWORD ==========
router.get("/change-password", requireAuth, (req, res) => {
  res.render("vwAccount/change-password");
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.session.user.id;

  if (!current_password || !new_password || !confirm_password) {
    return res.render("vwAccount/change-password", {
      error: "Please fill all required fields.",
    });
  }
  if (new_password !== confirm_password) {
    return res.render("vwAccount/change-password", {
      error: "New password confirmation does not match.",
    });
  }
  if (new_password.length < 6) {
    return res.render("vwAccount/change-password", {
      error: "New password must have at least 6 characters.",
    });
  }

  try {
    const user = await db("users").where({ id: userId }).first();
    if (!user) return res.redirect("/account/login");

    const isValid = await bcrypt.compare(
      current_password,
      user.password_hash || ""
    );
    if (!isValid) {
      return res.render("vwAccount/change-password", {
        error: "Current password is incorrect.",
      });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await db("users").where({ id: userId }).update({
      password_hash: newPasswordHash,
    });

    await emailService.sendPasswordResetSuccess(user.email);
    return res.render("vwAccount/change-password", {
      success: "Password changed successfully!",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.render("vwAccount/change-password", {
      error: "An error occurred. Please try again.",
    });
  }
});

// ========== MY COURSES ==========
router.get("/my-courses", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const enrolledCourses = await enrollmentModel.getEnrolledCourses(userId);
    res.render("vwAccount/my-courses", {
      courses: enrolledCourses,
      hasCourses: enrolledCourses.length > 0,
      user: req.session.user,
    });
  } catch (error) {
    console.error("My courses error:", error);
    res.render("vwAccount/my-courses", {
      courses: [],
      hasCourses: false,
      user: req.session.user,
    });
  }
});

export default router;
