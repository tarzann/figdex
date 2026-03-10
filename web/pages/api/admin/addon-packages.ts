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
      const { addon_type } = req.query;

      let query = supabaseAdmin
        .from('addon_packages')
        .select('*')
        .order('sort_order', { ascending: true });

      if (addon_type && typeof addon_type === 'string') {
        query = query.eq('addon_type', addon_type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching addon packages:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, packages: data || [] });
    }

    if (req.method === 'POST') {
      const { addon_type, addon_value, price_usd, display_name, description, enabled, sort_order } = req.body;

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

      const { data, error } = await supabaseAdmin
        .from('addon_packages')
        .insert({
          addon_type,
          addon_value,
          price_usd,
          display_name: display_name || null,
          description: description || null,
          enabled: enabled !== undefined ? enabled : true,
          sort_order: sort_order || 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating addon package:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(201).json({ success: true, package: data });
    }

    if (req.method === 'PUT') {
      const { id, addon_type, addon_value, price_usd, display_name, description, enabled, sort_order } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Package ID is required' });
      }

      const updateData: any = {};
      if (addon_type !== undefined) updateData.addon_type = addon_type;
      if (addon_value !== undefined) updateData.addon_value = addon_value;
      if (price_usd !== undefined) updateData.price_usd = price_usd;
      if (display_name !== undefined) updateData.display_name = display_name;
      if (description !== undefined) updateData.description = description;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (sort_order !== undefined) updateData.sort_order = sort_order;

      const { data, error } = await supabaseAdmin
        .from('addon_packages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating addon package:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, package: data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Package ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('addon_packages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting addon package:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Addon Packages API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

