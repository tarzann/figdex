import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data: testQuery, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Supabase connection error:', testError);
      console.error('Full error object:', JSON.stringify(testError, null, 2));
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection failed',
        details: testError.message || testError.toString(),
        code: testError.code,
        fullError: testError
      });
    }

    console.log('Supabase connection successful');

    // Test table structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    const { data: indexFiles, error: indexFilesError } = await supabase
      .from('index_files')
      .select('*')
      .limit(5);

    return res.status(200).json({
      success: true,
      connection: 'OK',
      tables: {
        users: {
          error: usersError?.message || null,
          count: users?.length || 0,
          sample: users?.[0] || null
        },
        index_files: {
          error: indexFilesError?.message || null,
          count: indexFiles?.length || 0,
          sample: indexFiles?.[0] || null
        }
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
