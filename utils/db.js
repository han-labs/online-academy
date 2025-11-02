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

const connection = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: 5432, // local vẫn chạy 5432 của bạn
        user: 'postgres.hcfyjxhpsvqtdgwounbo',
        password: 'Abc@123*#**',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
    };

const isRender = !!process.env.PORT;

const db = knex({
    client: 'pg',
    connection,
    pool: { min: 0, max: isRender ? 2 : 10, acquireTimeoutMillis: 15000, idleTimeoutMillis: 5000 },
});

export default db;
