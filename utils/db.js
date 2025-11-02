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
// utils/db.js
// utils/db.js
import knex from 'knex';

const isProduction = !!(process.env.NODE_ENV === 'production' || process.env.RENDER);

console.log('🌍 Environment:', isProduction ? 'Production' : 'Local');
console.log('🔍 DB Config:', {
    host: process.env.DB_HOST ? 'SET' : 'NOT SET',
    port: process.env.DB_PORT || 'default',
    user: process.env.DB_USER ? 'SET' : 'NOT SET',
    database: process.env.DB_NAME || 'default',
});

// KHÔNG DÙNG DATABASE_URL - Dùng config object trực tiếp
const connection = {
    host: process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543'),
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
        max: isProduction ? 2 : 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 30000,
    },
});

// Test connection
db.raw('SELECT 1')
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => console.error('❌ Database connection failed:', err.message));

export default db;