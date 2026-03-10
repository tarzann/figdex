import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Index ID is required'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get single index with user info
        const { data: index, error: indexError } = await supabase
          .from('index_files')
          .select('*, users(id, email, full_name)')
          .eq('id', parseInt(id))
          .single();

        if (indexError) {
          return res.status(404).json({
            success: false,
            error: 'Index not found',
            details: indexError.message
          });
        }

        return res.status(200).json({
          success: true,
          index: index
        });

      case 'DELETE':
        // Delete single index
        const { error: deleteError } = await supabase
          .from('index_files')
          .delete()
          .eq('id', parseInt(id));

        if (deleteError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to delete index',
            details: deleteError.message
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Index deleted successfully'
        });

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          allowedMethods: ['GET', 'DELETE']
        });
    }
  } catch (error) {
    console.error('Index API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default handler;

