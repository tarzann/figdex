// Email service utility
// Supports Resend (recommended) or can be extended to support SendGrid, Mailgun, etc.

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactEmail(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@figdex.com';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@figdex.com';

  // If Resend is not configured, fall back to logging
  if (!resendApiKey) {
    console.log('📧 Contact form submission (email not configured):', {
      to: supportEmail,
      from: data.email,
      subject: data.subject,
      name: data.name,
      message: data.message.substring(0, 200) + '...',
      timestamp: new Date().toISOString()
    });
    return { success: true };
  }

  try {
    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    // Send email to support team
    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: supportEmail,
      replyTo: data.email,
      subject: `[Contact Form] ${data.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Submitted at: ${new Date().toISOString()}</small></p>
      `,
      text: `
New Contact Form Submission

Name: ${data.name}
Email: ${data.email}
Subject: ${data.subject}

Message:
${data.message}

Submitted at: ${new Date().toISOString()}
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: 'Failed to send email' };
    }

    // Optionally send confirmation email to user
    if (process.env.SEND_CONFIRMATION_EMAIL === 'true') {
      await resendClient.emails.send({
        from: fromEmail,
        to: data.email,
        subject: `Re: ${data.subject}`,
        html: `
          <p>Hi ${data.name},</p>
          <p>Thank you for contacting FigDex. We've received your message and will get back to you within 24-48 hours.</p>
          <p>Your message:</p>
          <blockquote>${data.message.replace(/\n/g, '<br>')}</blockquote>
          <p>Best regards,<br>The FigDex Team</p>
        `,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

interface JobNotificationData {
  jobId: string;
  fileName: string;
  fileKey: string;
  status: 'completed' | 'failed';
  totalFrames?: number;
  error?: string;
  indexId?: string;
  userEmail: string;
  userName?: string;
}

/**
 * Send email notification to user when job completes or fails
 */
export async function sendJobNotificationEmail(data: JobNotificationData): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@figdex.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';

  console.log(`📧 [EMAIL] sendJobNotificationEmail called for job ${data.jobId}, status: ${data.status}, to: ${data.userEmail}`);

  // If Resend is not configured, fall back to logging
  if (!resendApiKey) {
    console.log('📧 Job notification email (RESEND_API_KEY not configured):', {
      to: data.userEmail,
      jobId: data.jobId,
      fileName: data.fileName,
      status: data.status,
      timestamp: new Date().toISOString()
    });
    return { success: true, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    const isCompleted = data.status === 'completed';
    const subject = isCompleted 
      ? `✅ Index completed: ${data.fileName}`
      : `❌ Index failed: ${data.fileName}`;

    const userName = data.userName || 'there';

    const htmlContent = isCompleted
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Your index is ready!</h2>
          <p>Hi ${userName},</p>
          <p>Your index "<strong>${data.fileName}</strong>" has been completed successfully.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>File:</strong> ${data.fileName}</p>
            <p style="margin: 5px 0;"><strong>Total Frames:</strong> ${data.totalFrames || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Job ID:</strong> ${data.jobId}</p>
          </div>
          <p>
            <a href="${siteUrl}/gallery" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">
              View in Gallery
            </a>
          </p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Best regards,<br>
            The FigDex Team
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">❌ Index creation failed</h2>
          <p>Hi ${userName},</p>
          <p>Unfortunately, your index "<strong>${data.fileName}</strong>" has failed to complete.</p>
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p style="margin: 5px 0;"><strong>File:</strong> ${data.fileName}</p>
            <p style="margin: 5px 0;"><strong>Job ID:</strong> ${data.jobId}</p>
            ${data.error ? `<p style="margin: 5px 0;"><strong>Error:</strong> ${data.error}</p>` : ''}
          </div>
          <p>Please try creating the index again. If the problem persists, please contact our support team.</p>
          <p>
            <a href="${siteUrl}/api-index" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">
              Try Again
            </a>
            <a href="${siteUrl}/contact" style="background-color: #666; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; margin-left: 10px;">
              Contact Support
            </a>
          </p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Best regards,<br>
            The FigDex Team
          </p>
        </div>
      `;

    const textContent = isCompleted
      ? `
Your index is ready!

Hi ${userName},

Your index "${data.fileName}" has been completed successfully.

File: ${data.fileName}
Total Frames: ${data.totalFrames || 'N/A'}
Job ID: ${data.jobId}

View in Gallery: ${siteUrl}/gallery

Best regards,
The FigDex Team
      `
      : `
Index creation failed

Hi ${userName},

Unfortunately, your index "${data.fileName}" has failed to complete.

File: ${data.fileName}
Job ID: ${data.jobId}
${data.error ? `Error: ${data.error}` : ''}

Please try creating the index again. If the problem persists, please contact our support team.

Try Again: ${siteUrl}/api-index
Contact Support: ${siteUrl}/contact

Best regards,
The FigDex Team
      `;

    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: data.userEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error(`📧 [EMAIL] ❌ Resend error sending job notification to ${data.userEmail} for job ${data.jobId}:`, error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`📧 [EMAIL] ✅ Job notification email sent successfully to ${data.userEmail} for job ${data.jobId} (${data.status})`);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send email notification to admin when job completes or fails
 * Now checks notification preferences before sending
 */
export async function sendJobNotificationToAdmin(data: JobNotificationData): Promise<{ success: boolean; error?: string }> {
  const { getAdminsToNotify } = await import('./admin-notifications');
  const notificationType = data.status === 'completed' ? 'index_completed' : 'index_failed';
  
  // Get admins who should receive this notification
  const adminsToNotify = await getAdminsToNotify(notificationType, 'email');

  if (adminsToNotify.length === 0) {
    console.log(`📧 Admin notification skipped for ${notificationType} - no admins have this notification enabled`);
    return { success: true };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@figdex.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';

  // If Resend is not configured, fall back to logging
  if (!resendApiKey) {
    console.log('📧 Admin job notification email (email not configured):', {
      to: adminsToNotify.map(a => a.email),
      jobId: data.jobId,
      fileName: data.fileName,
      userEmail: data.userEmail,
      status: data.status,
      timestamp: new Date().toISOString()
    });
    return { success: true };
  }

  try {
    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    const isCompleted = data.status === 'completed';
    const subject = `[Admin] Index ${data.status}: ${data.fileName} (${data.userEmail})`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isCompleted ? '#4CAF50' : '#f44336'};">
          ${isCompleted ? '✅' : '❌'} Index ${data.status.toUpperCase()}
        </h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>User:</strong> ${data.userName || 'N/A'} (${data.userEmail})</p>
          <p style="margin: 5px 0;"><strong>File Name:</strong> ${data.fileName}</p>
          <p style="margin: 5px 0;"><strong>File Key:</strong> ${data.fileKey}</p>
          <p style="margin: 5px 0;"><strong>Job ID:</strong> ${data.jobId}</p>
          ${data.indexId ? `<p style="margin: 5px 0;"><strong>Index ID:</strong> ${data.indexId}</p>` : ''}
          ${data.totalFrames ? `<p style="margin: 5px 0;"><strong>Total Frames:</strong> ${data.totalFrames}</p>` : ''}
          ${data.error ? `<p style="margin: 5px 0;"><strong>Error:</strong> <span style="color: #f44336;">${data.error}</span></p>` : ''}
          <p style="margin: 5px 0;"><strong>Status:</strong> ${data.status}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
        <p>
          <a href="${siteUrl}/admin/jobs" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View in Admin Panel
          </a>
        </p>
      </div>
    `;

    const textContent = `
Index ${data.status.toUpperCase()}

User: ${data.userName || 'N/A'} (${data.userEmail})
File Name: ${data.fileName}
File Key: ${data.fileKey}
Job ID: ${data.jobId}
${data.indexId ? `Index ID: ${data.indexId}\n` : ''}
${data.totalFrames ? `Total Frames: ${data.totalFrames}\n` : ''}
${data.error ? `Error: ${data.error}\n` : ''}
Status: ${data.status}
Time: ${new Date().toISOString()}

View in Admin Panel: ${siteUrl}/admin/jobs
    `;

    // Send email to all admins who have this notification enabled
    const adminEmails = adminsToNotify.map(admin => admin.email);
    
    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend error sending admin notification:', error);
      return { success: false, error: 'Failed to send email' };
    }

    console.log(`📧 Admin notification email sent to ${adminEmails.join(', ')} for job ${data.jobId} (${data.status})`);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

interface CreditsGrantNotificationData {
  userEmail: string;
  userName?: string;
  amount: number; // Can be positive (grant) or negative (deduct)
  reason: string;
  newBalance: number;
  grantedBy: string; // Admin email
}

/**
 * Send email notification to user when credits are granted or deducted
 */
export async function sendCreditsGrantNotificationToUser(data: CreditsGrantNotificationData): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@figdex.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';

  const isGrant = data.amount > 0;
  const userName = data.userName || 'User';
  const absoluteAmount = Math.abs(data.amount);

  console.log(`📧 [EMAIL] sendCreditsGrantNotificationToUser called: ${isGrant ? 'Grant' : 'Deduct'} ${absoluteAmount} credits to ${data.userEmail}`);

  // If Resend is not configured, fall back to logging
  if (!resendApiKey) {
    console.log('📧 Credits grant notification email (RESEND_API_KEY not configured):', {
      to: data.userEmail,
      amount: data.amount,
      newBalance: data.newBalance,
      reason: data.reason,
      timestamp: new Date().toISOString()
    });
    return { success: true, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    const subject = isGrant
      ? `Credits Added to Your FigDex Account - ${absoluteAmount.toLocaleString()} Credits`
      : `Credits Deducted from Your FigDex Account - ${absoluteAmount.toLocaleString()} Credits`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">
          ${isGrant ? '✅ Credits Added' : '📉 Credits Deducted'}
        </h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${userName},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          ${isGrant 
            ? `We've added <strong>${absoluteAmount.toLocaleString()} credits</strong> to your FigDex account.`
            : `<strong>${absoluteAmount.toLocaleString()} credits</strong> have been deducted from your FigDex account.`
          }
        </p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: ${isGrant ? '#2e7d32' : '#d32f2f'}; font-weight: 600;">
                ${isGrant ? '+' : '-'}${absoluteAmount.toLocaleString()} credits
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>New Balance:</strong></td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a1a;">
                ${data.newBalance.toLocaleString()} credits
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Reason:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #333;">
                ${data.reason}
              </td>
            </tr>
          </table>
        </div>

        <p style="margin-top: 30px;">
          <a href="${siteUrl}/account" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Account
          </a>
        </p>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Best regards,<br>
          The FigDex Team
        </p>
      </div>
    `;

    const textContent = `
${isGrant ? 'Credits Added' : 'Credits Deducted'}

Hi ${userName},

${isGrant 
  ? `We've added ${absoluteAmount.toLocaleString()} credits to your FigDex account.`
  : `${absoluteAmount.toLocaleString()} credits have been deducted from your FigDex account.`
}

Amount: ${isGrant ? '+' : '-'}${absoluteAmount.toLocaleString()} credits
New Balance: ${data.newBalance.toLocaleString()} credits
Reason: ${data.reason}

View Account: ${siteUrl}/account

Best regards,
The FigDex Team
    `;

    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: data.userEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error(`📧 [EMAIL] ❌ Resend error sending credits notification to ${data.userEmail}:`, error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`📧 [EMAIL] ✅ Credits grant notification email sent successfully to ${data.userEmail} (${isGrant ? 'grant' : 'deduct'} ${absoluteAmount})`);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send email notification to admin when credits are granted or deducted
 */
export async function sendCreditsGrantNotificationToAdmin(data: CreditsGrantNotificationData): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@figdex.com';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@figdex.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';

  const isGrant = data.amount > 0;
  const absoluteAmount = Math.abs(data.amount);

  console.log(`📧 [EMAIL] sendCreditsGrantNotificationToAdmin called: ${isGrant ? 'Grant' : 'Deduct'} ${absoluteAmount} credits to ${data.userEmail}`);

  // If Resend is not configured, fall back to logging
  if (!resendApiKey) {
    console.log('📧 Admin credits grant notification email (RESEND_API_KEY not configured):', {
      to: supportEmail,
      userEmail: data.userEmail,
      amount: data.amount,
      newBalance: data.newBalance,
      reason: data.reason,
      grantedBy: data.grantedBy,
      timestamp: new Date().toISOString()
    });
    return { success: true, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    const subject = `[Admin] Credits ${isGrant ? 'Granted' : 'Deducted'} - ${absoluteAmount.toLocaleString()} credits ${isGrant ? 'to' : 'from'} ${data.userEmail}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">
          Credits ${isGrant ? 'Granted' : 'Deducted'}
        </h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          An admin action has been performed on user credits.
        </p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>User:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #333;">
                ${data.userName || 'N/A'} (${data.userEmail})
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: ${isGrant ? '#2e7d32' : '#d32f2f'}; font-weight: 600;">
                ${isGrant ? '+' : '-'}${absoluteAmount.toLocaleString()} credits
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>New Balance:</strong></td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a1a;">
                ${data.newBalance.toLocaleString()} credits
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Reason:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #333;">
                ${data.reason}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Granted By:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #333;">
                ${data.grantedBy}
              </td>
            </tr>
          </table>
        </div>

        <p style="margin-top: 30px;">
          <a href="${siteUrl}/admin/users" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View in Admin Panel
          </a>
        </p>
      </div>
    `;

    const textContent = `
Credits ${isGrant ? 'Granted' : 'Deducted'}

User: ${data.userName || 'N/A'} (${data.userEmail})
Amount: ${isGrant ? '+' : '-'}${absoluteAmount.toLocaleString()} credits
New Balance: ${data.newBalance.toLocaleString()} credits
Reason: ${data.reason}
Granted By: ${data.grantedBy}
Time: ${new Date().toISOString()}

View in Admin Panel: ${siteUrl}/admin/users
    `;

    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: supportEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error(`📧 [EMAIL] ❌ Resend error sending admin credits notification:`, error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`📧 [EMAIL] ✅ Admin credits grant notification email sent successfully to ${supportEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send email notification to admin when a new user registers
 */
export async function sendUserRegistrationNotificationToAdmin(data: {
  userEmail: string;
  userName?: string;
  userId: string;
  registrationDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const { getAdminsToNotify } = await import('./admin-notifications');
  
  // Get admins who should receive this notification
  const adminsToNotify = await getAdminsToNotify('user_registered', 'email');

  if (adminsToNotify.length === 0) {
    console.log('📧 Admin notification skipped for user_registered - no admins have this notification enabled');
    return { success: true };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@figdex.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';

  // If Resend is not configured, fall back to logging
  if (!resendApiKey) {
    console.log('📧 Admin user registration notification email (email not configured):', {
      to: adminsToNotify.map(a => a.email),
      userEmail: data.userEmail,
      userName: data.userName,
      userId: data.userId,
      timestamp: data.registrationDate
    });
    return { success: true };
  }

  try {
    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    const subject = `[Admin] New User Registered: ${data.userEmail}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">
          👤 New User Registered
        </h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${data.userName || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.userEmail}</p>
          <p style="margin: 5px 0;"><strong>User ID:</strong> ${data.userId}</p>
          <p style="margin: 5px 0;"><strong>Registration Date:</strong> ${new Date(data.registrationDate).toLocaleString()}</p>
        </div>
        <p>
          <a href="${siteUrl}/admin/users" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View in Admin Panel
          </a>
        </p>
      </div>
    `;

    const textContent = `
New User Registered

Name: ${data.userName || 'N/A'}
Email: ${data.userEmail}
User ID: ${data.userId}
Registration Date: ${new Date(data.registrationDate).toLocaleString()}

View in Admin Panel: ${siteUrl}/admin/users
    `;

    const adminEmails = adminsToNotify.map(admin => admin.email);

    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend error sending admin user registration notification:', error);
      return { success: false, error: 'Failed to send email' };
    }

    console.log(`📧 Admin notification email sent to ${adminEmails.join(', ')} for new user registration: ${data.userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}


