// utils/db.adapter.js
import { supabase } from './supabase.client.js';

/**
 * Adapter để convert Knex queries sang Supabase REST API
 */
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

    async raw(sql) {
        console.warn('⚠️ Raw SQL not supported with Supabase REST API');
        throw new Error('Raw SQL queries are not supported with Supabase REST API');
    }
}

export const supabaseAdapter = new SupabaseAdapter();