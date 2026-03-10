import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '../../../lib/admin-middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Ensure admin access
  const userIsAdmin = await verifyAdmin(req);
  if (!userIsAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    if (req.method === 'GET') {
      // Get all add-ons (with optional user filter)
      const { userId } = req.query;

      let query = supabaseAdmin
        .from('user_addons')
        .select('*, users!inner(email, full_name)')
        .order('created_at', { ascending: false });

      if (userId && typeof userId === 'string') {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching add-ons:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, addons: data || [] });
    }

    if (req.method === 'POST') {
      // Admin: Create add-on for user (bypass payment)
      const { userId, addon_type, addon_value, price_usd, start_date, end_date } = req.body;

      if (!userId || !addon_type || !addon_value || price_usd === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId, addon_type, addon_value, and price_usd are required' 
        });
      }

      if (!['files', 'frames', 'rate_limit'].includes(addon_type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'addon_type must be one of: files, frames, rate_limit' 
        });
      }

      const { data, error } = await supabaseAdmin
        .from('user_addons')
        .insert({
          user_id: userId,
          addon_type,
          addon_value,
          price_usd,
          status: 'active', // Admin can activate directly
          start_date: start_date || new Date().toISOString().split('T')[0],
          end_date: end_date || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating add-on:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(201).json({ success: true, addon: data });
    }

    if (req.method === 'PUT') {
      // Admin: Update add-on
      const { id, status, end_date } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Add-on ID is required' });
      }

      const updateData: any = {};
      if (status !== undefined) {
        updateData.status = status;
      }
      if (end_date !== undefined) {
        updateData.end_date = end_date;
      }

      const { data, error } = await supabaseAdmin
        .from('user_addons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating add-on:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, addon: data });
    }

    if (req.method === 'DELETE') {
      // Admin: Delete add-on
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Add-on ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('user_addons')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting add-on:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Admin Add-ons API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

