#!/usr/bin/env ts-node

import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Friend {
  name: string;
  email: string;
  testEmail?: string;
  testPassword?: string;
}

// Configuration
const STAGING_URL = process.env.STAGING_URL || 'https://mememe-staging.vercel.app';
const FROM_EMAIL = process.env.FROM_EMAIL || 'you@yourdomain.com';

// Your friends list - Update this with real emails
const friends: Friend[] = [
  { 
    name: 'Alex', 
    email: 'alex@example.com', 
    testEmail: 'alex-test@mememe.app', 
    testPassword: 'TestAlex123!' 
  },
  { 
    name: 'Sarah', 
    email: 'sarah@example.com', 
    testEmail: 'sarah-test@mememe.app', 
    testPassword: 'TestSarah123!' 
  },
  { 
    name: 'Mike', 
    email: 'mike@example.com', 
    testEmail: 'mike-test@mememe.app', 
    testPassword: 'TestMike123!' 
  },
  { 
    name: 'Emma', 
    email: 'emma@example.com', 
    testEmail: 'emma-test@mememe.app', 
    testPassword: 'TestEmma123!' 
  },
  { 
    name: 'David', 
    email: 'david@example.com', 
    testEmail: 'david-test@mememe.app', 
    testPassword: 'TestDavid123!' 
  }
];

// Email transporter configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

function generateInviteEmail(friend: Friend): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>You're Invited to Test MemeMe! 🎨</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #8B5CF6; font-size: 2.5em; margin-bottom: 10px;">🎨 MemeMe</h1>
        <h2 style="color: #374151; font-weight: normal;">You're Invited to Beta Test!</h2>
    </div>

    <div style="background: #F9FAFB; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
        <p style="font-size: 18px; color: #374151; margin-bottom: 15px;">Hi ${friend.name}!</p>
        
        <p style="color: #6B7280; line-height: 1.6; margin-bottom: 15px;">
            I've been working on <strong>MemeMe</strong> - an AI-powered meme generator that creates 
            hilarious captions in multiple languages! I'd love your feedback on the beta version.
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin-top: 0;">✨ What's Special:</h3>
            <ul style="color: #6B7280; line-height: 1.8;">
                <li>🤖 AI-generated captions in 12 languages</li>
                <li>❤️ Save your favorite memes</li>
                <li>📱 Mobile-optimized with dark mode</li>
                <li>🔥 Trending template discovery</li>
                <li>📤 One-click social sharing</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${STAGING_URL}" 
               style="display: inline-block; background: #8B5CF6; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                🚀 Test MemeMe Now
            </a>
        </div>

        <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400E; margin: 0; font-size: 14px;">
                🎁 <strong>Beta Tester Perks:</strong> You get <strong>10 free tokens</strong> 
                to try all features! (Usually 3 for new users)
            </p>
        </div>
    </div>

    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px;">
        <h3 style="color: #374151; margin-top: 0;">🧪 What I Need From You:</h3>
        <ol style="color: #6B7280; line-height: 1.6;">
            <li>Test the meme generation (try topics like "Monday vibes", "Coffee addiction")</li>
            <li>Try different languages (Spanish, French, etc.)</li>
            <li>Test on your phone - check mobile experience</li>
            <li>Create an account and try the token system</li>
            <li>Share feedback on what works/doesn't work</li>
        </ol>
        
        ${friend.testEmail ? `
        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 6px;">
            <p style="color: #374151; margin: 0; font-weight: bold;">Test Account (if needed):</p>
            <p style="color: #6B7280; margin: 5px 0;">Email: ${friend.testEmail}</p>
            <p style="color: #6B7280; margin: 5px 0;">Password: ${friend.testPassword}</p>
        </div>
        ` : ''}
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 14px;">
            Questions? Just reply to this email!<br>
            Thanks for helping make MemeMe awesome! 🙏
        </p>
    </div>
</body>
</html>
  `;
}

async function sendInvitations() {
  console.log('🚀 Starting friend invitation process...\n');
  
  // Verify transporter connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const friend of friends) {
    try {
      const emailContent = generateInviteEmail(friend);
      
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: friend.email,
        subject: '🎨 You\'re invited to test MemeMe - AI Meme Generator!',
        html: emailContent
      });
      
      console.log(`✅ Invitation sent to ${friend.name} (${friend.email})`);
      successCount++;
      
      // Add delay between emails to avoid spam filters
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to send to ${friend.name} (${friend.email}):`, error);
      failCount++;
    }
  }

  console.log('\n📊 Invitation Summary:');
  console.log(`✅ Successfully sent: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📧 Total friends invited: ${friends.length}`);

  // Close transporter
  transporter.close();
}

// Execute if run directly
if (require.main === module) {
  sendInvitations().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { sendInvitations, friends };