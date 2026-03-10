import type { NextApiRequest, NextApiResponse } from 'next';
import { sendContactEmail } from '../../lib/email';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate message length
    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long (max 5000 characters)'
      });
    }

    // Send email
    const emailResult = await sendContactEmail({
      name,
      email,
      subject,
      message
    });

    if (!emailResult.success) {
      // Log error but still return success to user
      // (we don't want to expose internal errors)
      console.error('Email sending failed:', emailResult.error);
    }

    // TODO: Optionally store in database for tracking
    // const { createClient } = await import('@supabase/supabase-js');
    // const supabase = createClient(...);
    // await supabase.from('contact_submissions').insert({...});

    return res.status(200).json({
      success: true,
      message: 'Your message has been received. We will get back to you soon.'
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process your message. Please try again later.'
    });
  }
}

