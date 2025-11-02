// import knex from 'knex';

// const db = knex({
//     client: 'pg',
//     connection: {
//         host: 'aws-1-ap-southeast-1.pooler.supabase.com', //thay
//         port: 5432,
//         user: 'postgres.hcfyjxhpsvqtdgwounbo',
//         password: 'Abc@123*#**',
//         database: 'postgres',
//         ssl: { rejectUnauthorized: false }
//     },
//     pool: { min: 0, max: 15 }
// });

// // Test connection (comment out sau khi test)
// db.raw('SELECT 1')
//     .then(() => console.log('DB connected successfully'))
//     .catch(err => console.error('DB connection error:', err));

// //export ra để mà dùng
// export default db;

// utils/db.js
import knex from 'knex';

const isRender = !!(process.env.RENDER_SERVICE_NAME || process.env.RENDER);

const connection = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: parseInt(process.env.DB_PORT) || 6543,
        user: process.env.DB_USER || 'postgres.hcfyjxhpsvqtdgwounbo',
        password: process.env.DB_PASSWORD || 'Abc@123*#**',
        database: process.env.DB_NAME || 'postgres',
        ssl: { rejectUnauthorized: false },
    };

const db = knex({
    client: 'pg',
    connection,
    pool: {
        min: 0,
        max: isRender ? 5 : 10, // tăng lên 5 cho Render
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        // Quan trọng: propagate timeout để tránh hang
        propagateCreateError: false,
    },
    // Transaction mode không support prepared statements
    ...(process.env.DATABASE_URL?.includes('pgbouncer=true') && {
        pool: {
            ...db?.pool,
            afterCreate: (conn, done) => {
                conn.query('SET statement_timeout = 30000', (err) => done(err, conn));
            }
        }
    })
});

// Test connection với retry
const testConnection = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            await db.raw('SELECT 1');
            console.log('✅ Database connected successfully');
            return;
        } catch (err) {
            console.error(`❌ Database connection attempt ${i + 1} failed:`, err.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s
            }
        }
    }
};

testConnection();

export default db;