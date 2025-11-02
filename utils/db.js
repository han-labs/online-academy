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

const isRender = !!process.env.RENDER || !!process.env.PORT;

const connection = process.env.DATABASE_URL
    ? process.env.DATABASE_URL // DSN Session pooler từ Supabase (có sslmode=require)
    : {
        host: 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: 5432,
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
        max: isRender ? 3 : 10,
        idleTimeoutMillis: 5000,
        acquireTimeoutMillis: 20000,
        propagateCreateError: false,
    },
});

export default db;
