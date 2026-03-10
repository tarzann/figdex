import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method === 'GET') {
      // Get all enabled packages (public endpoint)
      // Admin can see all packages by adding ?all=true
      const showAll = req.query.all === 'true';
      
      let query = supabase
        .from('credits_packages')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('price_usd', { ascending: true });

      if (!showAll) {
        query = query.eq('enabled', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching credit packages:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch credit packages'
        });
      }

      return res.status(200).json({
        success: true,
        packages: data || []
      });

    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      // Admin-only operations
      // Check authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'API key required'
        });
      }

      const apiKey = authHeader.replace('Bearer ', '');
      
      // Verify user is admin
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, is_admin')
        .eq('api_key', apiKey)
        .single();

      if (userError || !user || !user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      if (req.method === 'POST') {
        // Create new package
        const { name, credits, price_usd, stripe_price_id, description, featured, popular, enabled, sort_order } = req.body;

        if (!name || !credits || price_usd === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: name, credits, price_usd'
          });
        }

        const { data, error } = await supabase
          .from('credits_packages')
          .insert({
            name,
            credits,
            price_usd,
            stripe_price_id: stripe_price_id || null,
            description: description || null,
            featured: featured || false,
            popular: popular || false,
            enabled: enabled !== undefined ? enabled : true,
            sort_order: sort_order || 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating credit package:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to create credit package'
          });
        }

        return res.status(200).json({
          success: true,
          package: data
        });

      } else if (req.method === 'PUT') {
        // Update package
        const { id, name, credits, price_usd, stripe_price_id, description, featured, popular, enabled, sort_order } = req.body;

        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Package ID is required'
          });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (credits !== undefined) updateData.credits = credits;
        if (price_usd !== undefined) updateData.price_usd = price_usd;
        if (stripe_price_id !== undefined) updateData.stripe_price_id = stripe_price_id;
        if (description !== undefined) updateData.description = description;
        if (featured !== undefined) updateData.featured = featured;
        if (popular !== undefined) updateData.popular = popular;
        if (enabled !== undefined) updateData.enabled = enabled;
        if (sort_order !== undefined) updateData.sort_order = sort_order;

        const { data, error } = await supabase
          .from('credits_packages')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating credit package:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to update credit package'
          });
        }

        return res.status(200).json({
          success: true,
          package: data
        });

      } else if (req.method === 'DELETE') {
        // Delete package
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Package ID is required'
          });
        }

        const { error } = await supabase
          .from('credits_packages')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting credit package:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete credit package'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Package deleted successfully'
        });
      }

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error: any) {
    console.error('Credit packages API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

