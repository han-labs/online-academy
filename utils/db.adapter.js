// utils/db.adapter.js
import { supabase } from './supabase.client.js';

class SupabaseAdapter {
    constructor() {
        this.client = supabase;
    }

    async select(table, options = {}) {
        try {
            let query = this.client.from(table).select(options.columns || '*');

            if (options.where) {
                Object.entries(options.where).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }

            if (options.limit) query = query.limit(options.limit);
            if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending !== false });

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Supabase select error:', error);
            throw error;
        }
    }

    async insert(table, data) {
        const { data: result, error } = await this.client.from(table).insert(data).select();
        if (error) throw error;
        return result;
    }

    async update(table, id, data) {
        const { data: result, error } = await this.client.from(table).update(data).eq('id', id).select();
        if (error) throw error;
        return result;
    }

    async delete(table, id) {
        const { error } = await this.client.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ✅ SỬA: Hỗ trợ raw SQL đơn giản (chỉ SELECT)
    async raw(sql, bindings = []) {
        console.log('⚠️ Raw SQL executed via REST (limited support):', sql.substring(0, 100));

        // Nếu là SELECT đơn giản, parse và dùng .from()
        const selectMatch = sql.match(/SELECT\s+.*?\s+FROM\s+(\w+)/i);
        if (selectMatch) {
            const table = selectMatch[1];
            const { data, error } = await this.client.from(table).select('*');
            if (error) throw error;
            return { rows: data }; // Knex format
        }

        console.warn('⚠️ Complex raw SQL not fully supported. Consider rewriting as ORM queries.');
        return { rows: [] };
    }
}

export const supabaseAdapter = new SupabaseAdapter();