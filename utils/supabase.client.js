// utils/supabase.client.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hcfyjxhpsvqtdgwounbo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
    console.error('❌ SUPABASE_ANON_KEY is missing!');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    db: { schema: 'public' },
});

console.log('✅ Supabase REST client initialized');