import { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '../../lib/firebaseAdmin';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore/lite';
import nodemailer from 'nodemailer';

interface FeedbackData {
  rating: number;
  features: string[];
  improvements: string;
  bugs: string;
  overall: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

// Email transporter for sending feedback notifications
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const feedbackData: FeedbackData = req.body;
    
    // Basic validation
    if (!feedbackData.rating || feedbackData.rating < 1 || feedbackData.rating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    // Get user info if authenticated
    let userId = null;
    let userEmail = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        userEmail = decodedToken.email;
      } catch (error) {
        // Continue without user info if token verification fails
        console.log('Token verification failed for feedback submission');
      }
    }

    // Store feedback in Firestore
    const feedbackDoc = {
      ...feedbackData,
      userId,
      userEmail,
      serverTimestamp: serverTimestamp(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      processed: false
    };

    const docRef = await adminDb.collection('feedback').add(feedbackDoc);
    console.log('Feedback stored with ID:', docRef.id);

    // Send email notification to team
    if (process.env.SMTP_USER && process.env.CONTACT_EMAIL) {
      try {
        const emailContent = generateFeedbackNotificationEmail(feedbackData, userId, userEmail);
        
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.CONTACT_EMAIL,
          subject: `🎯 New MemeMe Feedback - Rating: ${feedbackData.rating}/5`,
          html: emailContent
        });
        
        console.log('Feedback notification email sent');
      } catch (error) {
        console.error('Failed to send feedback notification email:', error);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Feedback received successfully',
      feedbackId: docRef.id 
    });

  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateFeedbackNotificationEmail(
  feedback: FeedbackData, 
  userId?: string | null, 
  userEmail?: string | null
): string {
  const stars = '⭐'.repeat(feedback.rating);
  const grayStars = '⭐'.repeat(5 - feedback.rating);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New MemeMe Feedback</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #8B5CF6; font-size: 2em; margin-bottom: 10px;">🎯 New Feedback</h1>
        <h2 style="color: #374151; font-weight: normal;">MemeMe User Feedback</h2>
    </div>

    <div style="background: #F9FAFB; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
        <!-- Rating -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin-top: 0;">Overall Rating</h3>
            <div style="font-size: 24px;">
                <span style="color: #FCD34D;">${stars}</span><span style="color: #D1D5DB;">${grayStars}</span>
                <span style="color: #6B7280; font-size: 16px; margin-left: 10px;">${feedback.rating}/5</span>
            </div>
        </div>

        <!-- User Info -->
        ${userId || userEmail ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin-top: 0;">👤 User Information</h3>
            ${userEmail ? `<p><strong>Email:</strong> ${userEmail}</p>` : ''}
            ${userId ? `<p><strong>User ID:</strong> <code>${userId}</code></p>` : ''}
        </div>
        ` : ''}

        <!-- Features that worked well -->
        ${feedback.features.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #10B981; margin-top: 0;">✅ What Worked Well</h3>
            <ul style="color: #6B7280; line-height: 1.6;">
                ${feedback.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <!-- Improvements -->
        ${feedback.improvements ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #F59E0B; margin-top: 0;">💡 Suggested Improvements</h3>
            <p style="color: #6B7280; line-height: 1.6; white-space: pre-wrap;">${feedback.improvements}</p>
        </div>
        ` : ''}

        <!-- Bugs -->
        ${feedback.bugs ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #EF4444; margin-top: 0;">🐛 Bugs & Issues</h3>
            <p style="color: #6B7280; line-height: 1.6; white-space: pre-wrap;">${feedback.bugs}</p>
        </div>
        ` : ''}

        <!-- Overall feedback -->
        ${feedback.overall ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #8B5CF6; margin-top: 0;">💬 Additional Comments</h3>
            <p style="color: #6B7280; line-height: 1.6; white-space: pre-wrap;">${feedback.overall}</p>
        </div>
        ` : ''}

        <!-- Technical Info -->
        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 12px;">
            <h4 style="color: #6B7280; margin-top: 0;">🔧 Technical Details</h4>
            <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${feedback.timestamp}</p>
            <p style="margin: 5px 0;"><strong>URL:</strong> ${feedback.url}</p>
            <p style="margin: 5px 0;"><strong>User Agent:</strong> ${feedback.userAgent}</p>
        </div>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 14px;">
            Review this feedback and take action to improve MemeMe! 🚀
        </p>
    </div>
</body>
</html>
  `;
}