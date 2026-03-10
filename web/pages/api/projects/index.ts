import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    try {
      // Get user by API key (using admin client to bypass RLS)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('api_key', apiKey)
        .single();

      if (userError || !userData) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
      }

      // Get projects for user (using admin client to bypass RLS)
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('user_id', userData.id)
        .order('serial_number', { ascending: true });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return res.status(500).json({ success: false, error: 'Failed to fetch projects' });
      }

      return res.status(200).json({ success: true, data: projects || [] });
    } catch (error: any) {
      console.error('Error in projects API:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    // Create new project
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const { figma_link, jira_link, description, date, people, status } = req.body;

    try {
      // Get user by API key (using admin client to bypass RLS)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('api_key', apiKey)
        .single();

      if (userError || !userData) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
      }

      // Validate that description is provided
      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, error: 'Description is required' });
      }

      // Insert new project (serial_number will be auto-generated)
      const { data: project, error: insertError } = await supabaseAdmin
        .from('projects')
        .insert({
          user_id: userData.id,
          figma_link: figma_link && figma_link.trim() ? figma_link.trim() : null,
          jira_link: jira_link && jira_link.trim() ? jira_link.trim() : null,
          description: description.trim(),
          date: date || new Date().toISOString().split('T')[0],
          people: people || [],
          status: status || 'To Do'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating project:', insertError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create project',
          details: insertError.message || JSON.stringify(insertError)
        });
      }

      return res.status(201).json({ success: true, data: project });
    } catch (error: any) {
      console.error('Error in projects API:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    // Update project
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const { id, figma_link, jira_link, description, date, people, status } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }

    try {
      // Get user by API key (using admin client to bypass RLS)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('api_key', apiKey)
        .single();

      if (userError || !userData) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
      }

      // Validate that description is provided if it's being updated
      if (description !== undefined && (!description || !description.trim())) {
        return res.status(400).json({ success: false, error: 'Description cannot be empty' });
      }

      // Update project
      const updateData: any = {};
      if (figma_link !== undefined) updateData.figma_link = figma_link && figma_link.trim() ? figma_link.trim() : null;
      if (jira_link !== undefined) updateData.jira_link = jira_link && jira_link.trim() ? jira_link.trim() : null;
      if (description !== undefined) updateData.description = description.trim();
      if (date !== undefined) updateData.date = date;
      if (people !== undefined) updateData.people = people;
      if (status !== undefined) updateData.status = status;

      const { data: project, error: updateError } = await supabaseAdmin
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userData.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating project:', updateError);
        return res.status(500).json({ success: false, error: 'Failed to update project' });
      }

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      return res.status(200).json({ success: true, data: project });
    } catch (error: any) {
      console.error('Error in projects API:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete project
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }

    try {
      // Get user by API key (using admin client to bypass RLS)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('api_key', apiKey)
        .single();

      if (userError || !userData) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
      }

      // Delete project (using admin client to bypass RLS)
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userData.id);

      if (deleteError) {
        console.error('Error deleting project:', deleteError);
        return res.status(500).json({ success: false, error: 'Failed to delete project' });
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error in projects API:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

