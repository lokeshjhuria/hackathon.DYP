const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions for database operations
class SupabaseHelper {
  // User operations
  static async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getUserById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Analysis operations
  static async createAnalysis(analysisData) {
    const { data, error } = await supabase
      .from('analyses')
      .insert([analysisData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getAnalysisById(analysisId) {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateAnalysis(analysisId, updates) {
    const { data, error } = await supabase
      .from('analyses')
      .update(updates)
      .eq('id', analysisId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getUserAnalyses(userId) {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Generic query operations
  static async query(table, options = {}) {
    let query = supabase.from(table);
    
    if (options.select) query = query.select(options.select);
    if (options.filter) query = query.eq(options.filter.column, options.filter.value);
    if (options.orderBy) query = query.order(options.orderBy.column, options.orderBy.ascending);
    if (options.limit) query = query.limit(options.limit);
    if (options.single) query = query.single();
    
    const { data, error } = await query;
    
    if (error) throw error;
    return options.single ? data : data || [];
  }

  // Test connection
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('test_connection')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Supabase test connection failed:', error);
      return false;
    }
  }
}

module.exports = SupabaseHelper;
