// utils/email.service.js - GỬI EMAIL THẬT
import nodemailer from 'nodemailer';

// ⚠️ QUAN TRỌNG: Thay email và password của bạn vào đây
const SMTP_CONFIG = {
    service: 'gmail',
    auth: {
        user: 'giahanthcstmt@gmail.com',
        pass: 'jqwegjdsksjiaeaa'
    }
};

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport(SMTP_CONFIG);
        console.log('✉️  Email service initialized (Gmail SMTP)');
    }

    /**
     * Send OTP email
     * @param {string} email - Recipient email
     * @param {string} code - 6-digit OTP code
     * @param {string} type - 'register' | 'reset_password'
     */
    async sendOTP(email, code, type = 'register') {
        const subject = type === 'register' ? 'Xác thực đăng ký - Online Academy' : 'Đặt lại mật khẩu - Online Academy';
        const html = this._buildOTPTemplate(code, type);

        try {
            const info = await this.transporter.sendMail({
                from: `"Online Academy" <${SMTP_CONFIG.auth.user}>`,
                to: email,
                subject: subject,
                html: html
            });

            console.log(`✅ OTP email sent to ${email} (MessageID: ${info.messageId})`);
            return true;
        } catch (error) {
            console.error('❌ Email send error:', error.message);

            // Backup: In ra console để không block flow
            console.log('\n=================================');
            console.log('📧 BACKUP - OTP CODE');
            console.log('=================================');
            console.log(`Email: ${email}`);
            console.log(`OTP: ${code}`);
            console.log('=================================\n');

            return true; // Vẫn return true để không dừng flow đăng ký
        }
    }

    /**
     * Send welcome email after successful registration
     */
    async sendWelcome(email, fullName) {
        try {
            await this.transporter.sendMail({
                from: `"Online Academy" <${SMTP_CONFIG.auth.user}>`,
                to: email,
                subject: 'Chào mừng đến với Online Academy! 🎉',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #5624d0; margin: 0;">🎓 Online Academy</h1>
                        </div>
                        
                        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <h2 style="color: #1c1d1f;">Chào mừng ${fullName}! 👋</h2>
                            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                                Cảm ơn bạn đã đăng ký tài khoản tại <strong>Online Academy</strong>.
                            </p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                                Bắt đầu khám phá hàng nghìn khóa học chất lượng và nâng cao kỹ năng của bạn ngay hôm nay!
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:3000" 
                                   style="display: inline-block; padding: 14px 32px; background: #5624d0; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                    Khám phá khóa học
                                </a>
                            </div>
                            
                            <p style="color: #999; font-size: 14px; margin-top: 30px;">
                                Chúc bạn học tập hiệu quả!<br>
                                Đội ngũ Online Academy
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                            <p>&copy; 2024 Online Academy. All rights reserved.</p>
                        </div>
                    </div>
                `
            });

            console.log(`✅ Welcome email sent to ${email}`);
            return true;
        } catch (error) {
            console.error('❌ Welcome email error:', error.message);
            return true; // Không block flow
        }
    }

    /**
     * Send password reset success notification
     */
    async sendPasswordResetSuccess(email) {
        try {
            await this.transporter.sendMail({
                from: `"Online Academy" <${SMTP_CONFIG.auth.user}>`,
                to: email,
                subject: 'Mật khẩu đã được thay đổi - Online Academy',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #5624d0; margin: 0;">🎓 Online Academy</h1>
                        </div>
                        
                        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <h2 style="color: #1c1d1f;">Mật khẩu đã được cập nhật ✅</h2>
                            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                                Mật khẩu tài khoản của bạn đã được thay đổi thành công.
                            </p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                                Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.
                            </p>
                            
                            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #856404;">
                                    ⚠️ Nếu không phải bạn, hãy đổi mật khẩu ngay!
                                </p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                            <p>&copy; 2024 Online Academy. All rights reserved.</p>
                        </div>
                    </div>
                `
            });

            console.log(`✅ Password reset confirmation sent to ${email}`);
            return true;
        } catch (error) {
            console.error('❌ Password reset email error:', error.message);
            return true;
        }
    }

    /**
     * Build OTP email template
     * @private
     */
    _buildOTPTemplate(code, type) {
        const title = type === 'register' ? 'Xác thực đăng ký' : 'Đặt lại mật khẩu';
        const message = type === 'register'
            ? 'Sử dụng mã OTP sau để hoàn tất đăng ký tài khoản:'
            : 'Sử dụng mã OTP sau để đặt lại mật khẩu tài khoản:';

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #5624d0; margin: 0;">🎓 Online Academy</h1>
                </div>
                
                <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <h2 style="color: #1c1d1f; margin-top: 0; font-size: 24px;">${title}</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        ${message}
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px;">
                        <div style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                            ${code}
                        </div>
                    </div>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            <strong>⏰ Mã này sẽ hết hạn sau 10 phút.</strong>
                        </p>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.5;">
                        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này. 
                        Không ai có thể truy cập tài khoản của bạn nếu không có mã OTP này.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                    <p style="margin: 5px 0;">
                        Email này được gửi tự động, vui lòng không reply.
                    </p>
                    <p style="margin: 5px 0;">
                        &copy; 2024 Online Academy. All rights reserved.
                    </p>
                </div>
            </div>
        `;
    }
}

export default new EmailService();