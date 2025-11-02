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

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
const useSupabaseRest = isProduction && process.env.SUPABASE_ANON_KEY;

console.log('🌍 Environment:', isProduction ? 'Production' : 'Local');
console.log('🔌 Connection type:', useSupabaseRest ? 'Supabase REST API' : 'Direct PostgreSQL');

let db;

if (useSupabaseRest) {
    // Production: Dùng Supabase REST API
    console.log('🔄 Using Supabase REST API (bypass connection pooler)');

    const { supabase } = await import('./supabase.client.js');
    const { supabaseAdapter } = await import('./db.adapter.js');

    // Tạo Knex-compatible object
    db = {
        select: (...args) => {
            const table = typeof args[0] === 'string' ? args[0] : null;
            return {
                from: (t) => db.from(t || table),
                where: (cond) => supabaseAdapter.select(table, { where: cond }),
            };
        },
        from: (table) => ({
            select: (cols = '*') => supabaseAdapter.select(table, { columns: cols }),
            where: (cond) => supabaseAdapter.select(table, { where: cond }),
            insert: (data) => supabaseAdapter.insert(table, data),
            update: (data) => ({
                where: (cond) => {
                    const id = cond.id || Object.values(cond)[0];
                    return supabaseAdapter.update(table, id, data);
                },
            }),
            del: () => ({
                where: (cond) => {
                    const id = cond.id || Object.values(cond)[0];
                    return supabaseAdapter.delete(table, id);
                },
            }),
        }),
        table: (name) => db.from(name),
        raw: (sql) => supabaseAdapter.raw(sql),
        transaction: async (callback) => {
            console.warn('⚠️ Transactions not supported with Supabase REST');
            return callback(db);
        },
    };

} else {
    // Local: Dùng Knex với PostgreSQL trực tiếp
    console.log('🔌 Using direct PostgreSQL connection (Knex)');

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

    db = knex({
        client: 'pg',
        connection,
        pool: {
            min: 0,
            max: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
        },
    });

    // Test connection
    db.raw('SELECT 1')
        .then(() => console.log('✅ Database connected successfully (Knex)'))
        .catch(err => console.error('❌ Database connection failed:', err.message));
}

export default db;