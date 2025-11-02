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
import knex from 'knex';

const isProduction = !!(process.env.NODE_ENV === 'production' || process.env.RENDER);

const connection = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.hcfyjxhpsvqtdgwounbo',
        password: 'Abc@123*#**',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
    };

const db = knex({
    client: 'pg',
    connection,
    pool: {
        min: 0,
        max: isProduction ? 2 : 10, // QUAN TRỌNG: Max 2 cho Render
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 30000,
    },
});

db.raw('SELECT 1')
    .then(() => console.log('✅ Database connected'))
    .catch(err => console.error('❌ DB error:', err.message));

export default db;