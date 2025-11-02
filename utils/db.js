// utils/db.js
import knex from 'knex';


const db = knex({
    client: 'pg',
    connection: {
        host: 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.hcfyjxhpsvqtdgwounbo',
        password: 'Abc@123*#**',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        keepAlive: true
    },
    pool: {
        min: 0,
        max: 6,
        acquireTimeoutMillis: 15000,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 15000,
        reapIntervalMillis: 2000,
        propagateCreateError: false,
        // Thiết lập timeouts trong 1 connection ngay khi tạo
        afterCreate: (conn, done) => {
            conn.query("SET statement_timeout = '15s'; SET idle_in_transaction_session_timeout = '5s';", (err) => {
                done(err, conn);
            });
        },
    },
    debug: false,
});



export default db;
