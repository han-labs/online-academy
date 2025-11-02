// utils/db.js
import knex from 'knex';


const DB_CONFIG = {
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.hcfyjxhpsvqtdgwounbo',
    password: 'Abc@123*#**',
    database: 'postgres',
};

const db = knex({
    client: 'pg',
    connection: {
        ...DB_CONFIG,
        ssl: { rejectUnauthorized: false },
    },
    pool: {
        min: 0,
        max: 4,
        acquireTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        propagateCreateError: false,
    },
});



export default db;
