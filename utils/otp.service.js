// utils/otp.service.js
import db from './db.js';

class OTPService {
    /**
     * Generate 6-digit OTP code
     */
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Store OTP in database
     * @param {string} email - User email
     * @param {string} type - 'register' | 'reset_password'
     * @returns {Promise<string>} OTP code
     */
    async create(email, type = 'register') {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete old OTPs for this email
        await db('otps').where({ email, type }).del();

        // Insert new OTP
        await db('otps').insert({
            email,
            code,
            type,
            expires_at: expiresAt,
            created_at: new Date()
        });

        return code;
    }

    /**
     * Verify OTP code
     * @param {string} email
     * @param {string} code
     * @param {string} type
     * @returns {Promise<boolean>}
     */
    async verify(email, code, type = 'register') {
        const otp = await db('otps')
            .where({ email, code, type, is_used: false })
            .andWhere('expires_at', '>', new Date())
            .first();

        if (!otp) return false;

        // Mark as used
        await db('otps').where({ id: otp.id }).update({ is_used: true });

        return true;
    }

    /**
     * Check if OTP exists and not expired
     */
    async exists(email, type = 'register') {
        const otp = await db('otps')
            .where({ email, type, is_used: false })
            .andWhere('expires_at', '>', new Date())
            .first();

        return !!otp;
    }

    /**
     * Delete expired OTPs (cleanup job)
     */
    async cleanup() {
        await db('otps').where('expires_at', '<', new Date()).del();
    }
}

export default new OTPService();