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
      // Get all pricing entries
      // Public can see enabled pricing, admin can see all with ?all=true
      const showAll = req.query.all === 'true';
      
      let query = supabase
        .from('credit_pricing')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('action_name', { ascending: true });

      if (!showAll) {
        query = query.eq('enabled', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching credit pricing:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch credit pricing'
        });
      }

      // Convert to object format for easier access
      const pricingMap: Record<string, number> = {};
      const pricingList = data || [];
      
      for (const item of pricingList) {
        pricingMap[item.action_key] = item.credits;
      }

      return res.status(200).json({
        success: true,
        pricing: pricingMap, // Object for easy lookup
        pricingList: pricingList, // Array for admin UI
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
        // Fallback: check admin emails
        const adminEmails = ['ranmor01@gmail.com'];
        if (!user || !adminEmails.includes(user.email)) {
          return res.status(403).json({
            success: false,
            error: 'Admin access required'
          });
        }
      }

      if (req.method === 'POST') {
        // Create new pricing entry
        const { action_key, action_name, credits, description, enabled, sort_order } = req.body;

        if (!action_key || !action_name || credits === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: action_key, action_name, credits'
          });
        }

        if (credits <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Credits must be a positive number'
          });
        }

        const { data, error } = await supabase
          .from('credit_pricing')
          .insert({
            action_key,
            action_name,
            credits,
            description: description || null,
            enabled: enabled !== undefined ? enabled : true,
            sort_order: sort_order || 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating credit pricing:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to create credit pricing'
          });
        }

        return res.status(200).json({
          success: true,
          pricing: data
        });

      } else if (req.method === 'PUT') {
        // Update pricing entry
        const { id, action_key, action_name, credits, description, enabled, sort_order } = req.body;

        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Pricing ID is required'
          });
        }

        const updateData: any = {};
        if (action_key !== undefined) updateData.action_key = action_key;
        if (action_name !== undefined) updateData.action_name = action_name;
        if (credits !== undefined) {
          if (credits <= 0) {
            return res.status(400).json({
              success: false,
              error: 'Credits must be a positive number'
            });
          }
          updateData.credits = credits;
        }
        if (description !== undefined) updateData.description = description;
        if (enabled !== undefined) updateData.enabled = enabled;
        if (sort_order !== undefined) updateData.sort_order = sort_order;

        const { data, error } = await supabase
          .from('credit_pricing')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating credit pricing:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to update credit pricing'
          });
        }

        return res.status(200).json({
          success: true,
          pricing: data
        });

      } else if (req.method === 'DELETE') {
        // Delete pricing entry
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Pricing ID is required'
          });
        }

        const { error } = await supabase
          .from('credit_pricing')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting credit pricing:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete credit pricing'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Pricing entry deleted successfully'
        });
      }

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error: any) {
    console.error('Credit pricing API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

