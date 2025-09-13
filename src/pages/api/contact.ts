import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { db } from '../../lib/firebase-admin';
import { rateLimitMiddleware } from '../../lib/rateLimit';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

interface ErrorResponse {
  error: string;
}

interface SpamCheckResult {
  isSpam: boolean;
  reasons: string[];
  score: number;
}

/**
 * Detect spam in contact form submissions
 */
function detectSpam(name: string, email: string, message: string): SpamCheckResult {
  const reasons: string[] = [];
  let spamScore = 0;

  // Common spam patterns
  const spamPatterns = [
    /viagra|cialis|pharmacy|casino|poker|loan|credit|debt/i,
    /\b(seo|backlink|link.?building|website.?traffic)\b/i,
    /\b(buy.?now|click.?here|limited.?time|act.?now)\b/i,
    /\$\d+|\d+\$|\d+.*(?:dollar|euro|pound)/i,
    /(urgent|important|congratulation|winner)/i
  ];

  // Check message content for spam patterns
  spamPatterns.forEach((pattern, index) => {
    if (pattern.test(message)) {
      reasons.push(`spam-pattern-${index}`);
      spamScore += 20;
    }
  });

  // Check for excessive links
  const linkCount = (message.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) {
    reasons.push('excessive-links');
    spamScore += linkCount * 10;
  }

  // Check for suspicious email domains
  const suspiciousDomains = [
    'tempmail.org', '10minutemail.com', 'guerrillamail.com', 
    'mailinator.com', 'throwaway.email'
  ];
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (emailDomain && suspiciousDomains.includes(emailDomain)) {
    reasons.push('suspicious-email-domain');
    spamScore += 30;
  }

  // Check for excessive capitalization
  const capsRatio = message.replace(/[^A-Z]/g, '').length / message.length;
  if (capsRatio > 0.5) {
    reasons.push('excessive-caps');
    spamScore += 15;
  }

  // Check for repeated characters
  if (/([a-zA-Z])\1{4,}/.test(message)) {
    reasons.push('repeated-characters');
    spamScore += 10;
  }

  // Check for very short or repetitive names
  if (name.length < 2 || /^(.)\1+$/.test(name)) {
    reasons.push('suspicious-name');
    spamScore += 15;
  }

  // Check message/name ratio (spam often has very long messages with short names)
  if (message.length > 500 && name.length < 5) {
    reasons.push('suspicious-length-ratio');
    spamScore += 10;
  }

  // Check for common bot indicators
  const botIndicators = /\b(bot|crawler|spider|scraper)\b/i;
  if (botIndicators.test(name) || botIndicators.test(message)) {
    reasons.push('bot-indicators');
    spamScore += 25;
  }

  return {
    isSpam: spamScore >= 30, // Threshold for spam detection
    reasons,
    score: spamScore
  };
}

/**
 * API route for handling contact form submissions
 * POST /api/contact
 * Body: { name: string, email: string, message: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactResponse | ErrorResponse>
) {
  const transaction = startTransaction('contact-form', 'http.server');
  
  addBreadcrumb({
    message: 'Contact form submission started',
    category: 'api',
    level: 'info',
    data: {
      method: req.method,
      userAgent: req.headers['user-agent']
    }
  });

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Apply rate limiting (more restrictive for contact forms to prevent spam)
    const rateLimitPassed = await rateLimitMiddleware(req, res);
    if (!rateLimitPassed) {
      trackEvent('contact_rate_limit_exceeded', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      });
      return;
    }

    const { name, email, message } = req.body as ContactRequest;

    // Set request context
    setExtra('contact_name', name?.substring(0, 20) || 'unknown');
    setExtra('contact_email', email?.substring(0, 30) || 'unknown');
    setExtra('message_length', message?.length || 0);

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required and must be at least 2 characters' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message is required and must be at least 10 characters' });
    }

    // Enhanced spam protection checks
    const spamCheck = detectSpam(name, email, message);
    if (spamCheck.isSpam) {
      addBreadcrumb({
        message: 'Spam detected in contact form',
        category: 'spam',
        level: 'warning',
        data: {
          reasons: spamCheck.reasons,
          email: email.substring(0, 20)
        }
      });
      
      trackEvent('contact_spam_detected', {
        reasons: spamCheck.reasons,
        spamScore: spamCheck.score
      });
      
      return res.status(400).json({ 
        error: 'Your message appears to be spam. Please ensure your message is genuine and try again.' 
      });
    }

    // Sanitize input
    const sanitizedName = name.trim().substring(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().substring(0, 100);
    const sanitizedMessage = message.trim().substring(0, 2000);

    addBreadcrumb({
      message: 'Contact form validation passed',
      category: 'validation',
      level: 'info',
      data: {
        nameLength: sanitizedName.length,
        messageLength: sanitizedMessage.length
      }
    });

    // Create Firestore document
    const contactData = {
      name: sanitizedName,
      email: sanitizedEmail,
      message: sanitizedMessage,
      timestamp: new Date(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      status: 'unread'
    };

    let firestoreDocId: string | null = null;
    try {
      const docRef = await db.collection('contacts').add(contactData);
      firestoreDocId = docRef.id;
      
      addBreadcrumb({
        message: 'Contact message saved to Firestore',
        category: 'database',
        level: 'info',
        data: { documentId: firestoreDocId }
      });
    } catch (error) {
      console.error('Error saving contact message to Firestore:', error);
      captureException(error as Error, {
        operation: 'firestore-contact-save',
        contactEmail: sanitizedEmail.substring(0, 20)
      });
      // Continue with email sending even if Firestore fails
    }

    // Send email notification
    let emailSent = false;
    let emailError: string | null = null;

    try {
      // Create Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Email content
      const mailOptions = {
        from: `"MemeMe Contact" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
        replyTo: sanitizedEmail,
        subject: `New Contact Form Message from ${sanitizedName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #8B5CF6; margin-bottom: 20px;">New Contact Form Submission</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p><strong>Name:</strong> ${sanitizedName}</p>
              <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              ${firestoreDocId ? `<p><strong>Document ID:</strong> ${firestoreDocId}</p>` : ''}
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; margin-bottom: 10px;">Message:</h3>
              <div style="background: white; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap;">${sanitizedMessage}</div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; color: #6b7280; font-size: 14px;">
              <p>This message was sent via the MemeMe contact form.</p>
              <p>Reply directly to this email to respond to ${sanitizedName}.</p>
            </div>
          </div>
        `,
        text: `
New Contact Form Submission

Name: ${sanitizedName}
Email: ${sanitizedEmail}
Date: ${new Date().toLocaleString()}
${firestoreDocId ? `Document ID: ${firestoreDocId}` : ''}

Message:
${sanitizedMessage}

---
This message was sent via the MemeMe contact form.
Reply to ${sanitizedEmail} to respond directly.
        `,
      };

      // Send email
      const emailResult = await transporter.sendMail(mailOptions);
      emailSent = true;

      addBreadcrumb({
        message: 'Contact email sent successfully',
        category: 'email',
        level: 'info',
        data: { 
          messageId: emailResult.messageId,
          recipient: process.env.CONTACT_EMAIL || process.env.SMTP_USER
        }
      });

    } catch (error) {
      console.error('Error sending contact email:', error);
      emailError = (error as Error).message;
      
      captureException(error as Error, {
        operation: 'contact-email-send',
        contactEmail: sanitizedEmail.substring(0, 20),
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com'
      });
    }

    // Track the contact form submission
    trackEvent('contact_form_submitted', {
      emailSent,
      firestoreStored: !!firestoreDocId,
      nameLength: sanitizedName.length,
      messageLength: sanitizedMessage.length,
      hasError: !emailSent || !firestoreDocId
    });

    addBreadcrumb({
      message: 'Contact form processing completed',
      category: 'success',
      level: 'info',
      data: {
        emailSent,
        firestoreStored: !!firestoreDocId,
        messageId: firestoreDocId
      }
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    // Return success even if email fails, but Firestore succeeded
    // The important thing is that we captured the message
    if (firestoreDocId || emailSent) {
      return res.status(200).json({ 
        success: true, 
        message: 'Message received successfully! We\'ll get back to you soon.',
        messageId: firestoreDocId || undefined
      });
    } else {
      // Both failed
      return res.status(500).json({ 
        error: 'Unable to process your message at this time. Please try again later or contact us directly.' 
      });
    }

  } catch (error) {
    console.error('Error in contact API:', error);
    
    captureException(error as Error, {
      operation: 'contact-form-handler',
      request_body: req.body,
      user_agent: req.headers['user-agent']
    });

    trackEvent('contact_form_error', {
      error_type: 'unhandled_exception',
      error_message: (error as Error).message
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.setStatus === 'function') {
      transaction.setStatus('internal_error');
    }
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
}