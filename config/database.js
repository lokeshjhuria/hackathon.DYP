const { createClient } = require('@supabase/supabase-js');

const connectDB = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection
    const { data, error } = await supabase.from('test_connection').select('id').limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      process.exit(1);
    }
    
    console.log('Supabase Connected:', supabaseUrl);
    return supabase;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
