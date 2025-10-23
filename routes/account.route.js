// routes/account.route.js - UPDATED WITH ROLE REDIRECT
import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../utils/db.js';
import { requireGuest, requireAuth } from '../middlewares/auth.js';
import otpService from '../utils/otp.service.js';
import emailService from '../utils/email.service.js';

const router = Router();

// ============================================
// ĐĂNG KÝ VỚI OTP VERIFICATION
// ============================================

// GET /account/register
router.get('/register', requireGuest, (req, res) => {
    res.render('vwAccount/register');
});

// POST /account/register - Step 1: Tạo tài khoản tạm + gửi OTP
router.post('/register', requireGuest, async (req, res) => {
    const { full_name, email, password, confirm_password } = req.body;

    // Validation
    if (!full_name || !email || !password) {
        return res.render('vwAccount/register', {
            error: 'Vui lòng điền đầy đủ thông tin'
        });
    }

    if (password !== confirm_password) {
        return res.render('vwAccount/register', {
            error: 'Mật khẩu xác nhận không khớp'
        });
    }

    if (password.length < 6) {
        return res.render('vwAccount/register', {
            error: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
    }

    // Check email exists
    const existed = await db('users').where({ email }).first();
    if (existed) {
        return res.render('vwAccount/register', {
            error: 'Email đã được sử dụng'
        });
    }

    try {
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Store temporary user data in session
        req.session.tempUser = {
            full_name,
            email,
            password_hash
        };

        // Generate and send OTP
        const otpCode = await otpService.create(email, 'register');
        await emailService.sendOTP(email, otpCode, 'register');

        // Redirect to OTP verification
        return res.redirect(`/account/verify-otp?email=${encodeURIComponent(email)}`);

    } catch (error) {
        console.error('Register error:', error);
        return res.render('vwAccount/register', {
            error: 'Có lỗi xảy ra. Vui lòng thử lại.'
        });
    }
});

// GET /account/verify-otp
router.get('/verify-otp', requireGuest, (req, res) => {
    const email = req.query.email;

    if (!email || !req.session.tempUser || req.session.tempUser.email !== email) {
        return res.redirect('/account/register');
    }

    res.render('vwAccount/verify-otp', { email });
});

// POST /account/verify-otp - Step 2: Verify OTP và hoàn tất đăng ký
router.post('/verify-otp', requireGuest, async (req, res) => {
    const { email, otp_code } = req.body;

    if (!email || !otp_code || !req.session.tempUser) {
        return res.redirect('/account/register');
    }

    try {
        // Verify OTP
        const isValid = await otpService.verify(email, otp_code, 'register');

        if (!isValid) {
            return res.render('vwAccount/verify-otp', {
                email,
                error: 'Mã OTP không đúng hoặc đã hết hạn'
            });
        }

        // Create user account
        const { full_name, password_hash } = req.session.tempUser;

        await db('users').insert({
            full_name,
            email,
            password_hash,
            role: 'student', // default role là student
            created_at: new Date()
        });

        // Send welcome email
        await emailService.sendWelcome(email, full_name);

        // Clear temp data
        delete req.session.tempUser;

        // Redirect to login with success message
        req.session.registerSuccess = true;
        return res.redirect('/account/login?success=1');

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.render('vwAccount/verify-otp', {
            email,
            error: 'Có lỗi xảy ra. Vui lòng thử lại.'
        });
    }
});

// POST /account/resend-otp
router.post('/resend-otp', requireGuest, async (req, res) => {
    const { email } = req.body;

    if (!email || !req.session.tempUser) {
        return res.redirect('/account/register');
    }

    try {
        const otpCode = await otpService.create(email, 'register');
        await emailService.sendOTP(email, otpCode, 'register');

        return res.redirect(`/account/verify-otp?email=${encodeURIComponent(email)}&resent=1`);
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.redirect(`/account/verify-otp?email=${encodeURIComponent(email)}&error=1`);
    }
});

// ============================================
// ĐĂNG NHẬP
// ============================================

// GET /account/login
router.get('/login', requireGuest, (req, res) => {
    const success = req.query.success === '1' ? 'Đăng ký thành công! Vui lòng đăng nhập.' : null;
    res.render('vwAccount/login', { success });
});

// POST /account/login
router.post('/login', requireGuest, async (req, res) => {
    const { email, password, remember } = req.body;

    if (!email || !password) {
        return res.render('vwAccount/login', {
            error: 'Vui lòng nhập email và mật khẩu'
        });
    }

    try {
        const user = await db('users').where({ email }).first();

        if (!user) {
            return res.render('vwAccount/login', {
                error: 'Email hoặc mật khẩu không đúng'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash || '');

        if (!isPasswordValid) {
            return res.render('vwAccount/login', {
                error: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Set session
        req.session.user = {
            id: user.id,
            name: user.full_name,
            email: user.email,
            role: user.role,
            permission: user.role === 'admin' ? 1 : 0
        };

        // Remember me
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        // ==== CHỖ SỬA ====
        // Redirect theo role
        if (user.role === 'instructor') {
            return res.redirect('/teacher/dashboard'); // dashboard giảng viên
        } else if (user.role === 'student') {
            return res.redirect('/'); // home page cho học sinh
        } else if (user.role === 'admin') {
            return res.redirect('/admin'); // admin panel (nếu có)
        } else {
            return res.redirect('/'); // default
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.render('vwAccount/login', {
            error: 'Có lỗi xảy ra. Vui lòng thử lại.'
        });
    }
});

// ============================================
// ĐĂNG XUẤT
// ============================================

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// ============================================
// PROFILE
// ============================================

// GET /account/profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const me = await db('users').where({ id: req.session.user.id }).first();

        if (!me) {
            return res.redirect('/account/login');
        }

        // Get stats
        const [{ enr }] = await db('enrollments').where({ user_id: me.id }).count({ enr: '*' });
        const [{ wl }] = await db('watchlists').where({ user_id: me.id }).count({ wl: '*' }).catch(() => [{ wl: 0 }]);

        res.render('vwAccount/profile', {
            me,
            stats: {
                enrollments: Number(enr || 0),
                watchlists: Number(wl || 0)
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.redirect('/');
    }
});

// POST /account/profile - Update profile
router.post('/profile', requireAuth, async (req, res) => {
    const { full_name, email } = req.body;
    const myId = req.session.user.id;

    if (!full_name || !email) {
        return res.redirect('/account/profile?error=2'); // Missing fields
    }

    try {
        // Check email unique (except current user)
        const existed = await db('users')
            .where({ email })
            .andWhereNot({ id: myId })
            .first();

        if (existed) {
            return res.redirect('/account/profile?error=1'); // Email exists
        }

        // Update user
        await db('users').where({ id: myId }).update({
            full_name,
            email,
            updated_at: new Date()
        });

        // Update session
        req.session.user.name = full_name;
        req.session.user.email = email;

        return res.redirect('/account/profile?success=1');

    } catch (error) {
        console.error('Update profile error:', error);
        return res.redirect('/account/profile?error=3'); // Server error
    }
});

// ============================================
// ĐỔI MẬT KHẨU
// ============================================

// GET /account/change-password
router.get('/change-password', requireAuth, (req, res) => {
    res.render('vwAccount/change-password');
});

// POST /account/change-password
router.post('/change-password', requireAuth, async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.session.user.id;

    // Validation
    if (!current_password || !new_password || !confirm_password) {
        return res.render('vwAccount/change-password', {
            error: 'Vui lòng điền đầy đủ thông tin'
        });
    }

    if (new_password !== confirm_password) {
        return res.render('vwAccount/change-password', {
            error: 'Mật khẩu mới không khớp'
        });
    }

    if (new_password.length < 6) {
        return res.render('vwAccount/change-password', {
            error: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
    }

    try {
        // Get current user
        const user = await db('users').where({ id: userId }).first();

        if (!user) {
            return res.redirect('/account/login');
        }

        // Verify current password
        const isValid = await bcrypt.compare(current_password, user.password_hash || '');

        if (!isValid) {
            return res.render('vwAccount/change-password', {
                error: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(new_password, 10);

        // Update password
        await db('users').where({ id: userId }).update({
            password_hash: newPasswordHash,
            updated_at: new Date()
        });

        // Send notification email
        await emailService.sendPasswordResetSuccess(user.email);

        return res.render('vwAccount/change-password', {
            success: 'Đổi mật khẩu thành công!'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return res.render('vwAccount/change-password', {
            error: 'Có lỗi xảy ra. Vui lòng thử lại.'
        });
    }
});

export default router;
