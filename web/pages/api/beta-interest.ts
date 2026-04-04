import type { NextApiRequest, NextApiResponse } from 'next';
import { sendBetaInterestEmail } from '../../lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST'],
    });
  }

  try {
    const {
      name,
      email,
      role,
      company,
      figmaFileCount,
      teamSize,
      primaryUseCase,
      biggestPainPoint,
      notes,
    } = req.body || {};

    if (!name || !email || !role || !figmaFileCount || !primaryUseCase || !biggestPainPoint) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields',
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    if (String(biggestPainPoint).length > 3000 || String(notes || '').length > 3000) {
      return res.status(400).json({
        success: false,
        error: 'Please keep responses under 3000 characters',
      });
    }

    const emailResult = await sendBetaInterestEmail({
      name: String(name).trim(),
      email: String(email).trim(),
      role: String(role).trim(),
      company: String(company || '').trim(),
      figmaFileCount: String(figmaFileCount).trim(),
      teamSize: String(teamSize || '').trim(),
      primaryUseCase: String(primaryUseCase).trim(),
      biggestPainPoint: String(biggestPainPoint).trim(),
      notes: String(notes || '').trim(),
    });

    if (!emailResult.success) {
      console.error('Beta interest email failed:', emailResult.error);
    }

    return res.status(200).json({
      success: true,
      message: 'Thanks. We received your beta request and will be in touch soon.',
    });
  } catch (error) {
    console.error('Beta interest form error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process your request. Please try again later.',
    });
  }
}
