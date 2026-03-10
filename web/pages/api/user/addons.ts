import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromApiKey } from '../../../lib/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const userId = await getUserIdFromApiKey(req);

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Get user's active add-ons
      const today = new Date().toISOString().split('T')[0];
      
      const { data: addons, error } = await supabaseAdmin
        .from('user_addons')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user add-ons:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, addons: addons || [] });
    }

    if (req.method === 'POST') {
      // Purchase/add new add-on (for now, just create pending - payment integration later)
      const { addon_type, addon_value, price_usd } = req.body;

      if (!addon_type || !addon_value || price_usd === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'addon_type, addon_value, and price_usd are required' 
        });
      }

      if (!['files', 'frames', 'rate_limit'].includes(addon_type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'addon_type must be one of: files, frames, rate_limit' 
        });
      }

      if (addon_value <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'addon_value must be positive' 
        });
      }

      // For now, create as 'pending' - will be activated after payment
      // TODO: Integrate with Stripe for payment processing
      const { data, error } = await supabaseAdmin
        .from('user_addons')
        .insert({
          user_id: userId,
          addon_type,
          addon_value,
          price_usd,
          status: 'pending', // Will be 'active' after payment confirmation
          start_date: new Date().toISOString().split('T')[0],
          // end_date: null means recurring monthly
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating add-on:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      // TODO: Create Stripe subscription here
      // For now, just return the pending add-on
      return res.status(201).json({ 
        success: true, 
        addon: data,
        message: 'Add-on created. Payment integration coming soon.' 
      });
    }

    if (req.method === 'DELETE') {
      // Cancel add-on (set status to 'cancelled')
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Add-on ID is required' });
      }

      // Verify ownership
      const { data: existing } = await supabaseAdmin
        .from('user_addons')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Add-on not found' });
      }

      // Cancel the add-on
      const { data, error } = await supabaseAdmin
        .from('user_addons')
        .update({ 
          status: 'cancelled',
          end_date: new Date().toISOString().split('T')[0] // End today
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling add-on:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      // TODO: Cancel Stripe subscription here

      return res.status(200).json({ success: true, addon: data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Add-ons API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

