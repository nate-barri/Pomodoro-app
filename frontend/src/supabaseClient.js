import { createClient } from '@supabase/supabase-js';

// I extracted this URL from your API Key
const supabaseUrl = 'https://vliuxxhileooqebxejmq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsaXV4eGhpbGVvb3FlYnhlam1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDQ2NTEsImV4cCI6MjA4MjMyMDY1MX0.agCstK3OMvAHGvAJaW-I6WJEym7rFqc1HKTzOm_NkCM';

export const supabase = createClient(supabaseUrl, supabaseKey);