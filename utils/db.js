// utils/db.js
import knex from 'knex';

const isRender = !!process.env.RENDER || process.env.PORT; // Render đặt PORT sẵn
const isProd = isRender || process.env.NODE_ENV === 'production';

// ƯU TIÊN DATABASE_URL nếu có (Render: bạn set giá trị DSN pooling)
let connection;
if (process.env.DATABASE_URL) {
    connection = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
} else if (isProd) {
    // Fallback cho Render nếu bạn CHƯA set DATABASE_URL
    // DÙNG POOLER 6543 của Supabase
    connection = {
        host: 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: 6543, // <<< QUAN TRỌNG: PGBOUNCER
        user: 'postgres.hcfyjxhpsvqtdgwounbo',
        password: 'Abc@123*#**',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    };
} else {
    // Local: 5432 (session mode) – cái bạn vẫn đang chạy OK
    connection = {
        host: 'aws-1-ap-southeast-1.pooler.supabase.com', // hoặc host session của bạn
        port: 5432,
        user: 'postgres.hcfyjxhpsvqtdgwounbo',
        password: 'Abc@123*#**',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    };
}

const db = knex({
    client: 'pg',
    connection,
    pool: {
        min: 0,
        max: isProd ? 2 : 5,               // Render: nhỏ lại để không hết slot
        idleTimeoutMillis: 5000,
        acquireTimeoutMillis: 10000,
        propagateCreateError: false
    }
});

// Log ngắn để xác nhận đúng cổng
const port =
    typeof connection === 'object' && connection.port
        ? connection.port
        : (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).port : 'n/a');
console.log(`🔌 DB init – using port ${port} (${isProd ? 'prod' : 'dev'})`);

export default db;
