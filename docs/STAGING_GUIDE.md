# 🚀 Staging Deployment & Friend Testing Guide

This guide will help you deploy MemeMe to staging and invite friends for user testing.

## 📋 **Pre-Deployment Checklist**

### **Environment Setup**
- [ ] Create staging Firebase project
- [ ] Set up staging Stripe account (test mode)
- [ ] Configure staging environment variables
- [ ] Set up staging domain/subdomain
- [ ] Configure staging database
- [ ] Test all API integrations

### **Code Preparation**
- [ ] All features implemented and tested locally
- [ ] E2E tests passing
- [ ] Mobile optimizations complete
- [ ] Dark mode working
- [ ] Multi-language support functional
- [ ] Spam protection active

---

## 🌍 **Vercel Staging Deployment**

### **Step 1: Environment Variables**

Create `.env.staging` with staging-specific values:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://mememe-staging.vercel.app
NODE_ENV=production

# Firebase Staging Project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mememe-staging
NEXT_PUBLIC_FIREBASE_API_KEY=your-staging-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mememe-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mememe-staging.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-staging-app-id

# Firebase Admin (Staging)
FIREBASE_PROJECT_ID=mememe-staging
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@mememe-staging.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://mememe-staging-default-rtdb.firebaseio.com

# Stripe Test Keys
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Token Pricing (Test Products)
STRIPE_5_TOKENS_PRICE_ID=price_test_5_tokens
STRIPE_15_TOKENS_PRICE_ID=price_test_15_tokens
STRIPE_50_TOKENS_PRICE_ID=price_test_50_tokens

# AI Services
GOOGLE_GEMINI_API_KEY=your-gemini-key
IMGFLIP_USERNAME=your-imgflip-username
IMGFLIP_PASSWORD=your-imgflip-password

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@yourdomain.com
SMTP_PASSWORD=your-app-password
CONTACT_EMAIL=staging-contact@yourdomain.com

# Security
CRON_SECRET=staging-cron-secret-key
ADMIN_SECRET=staging-admin-secret-key

# Analytics (Optional)
POSTHOG_KEY=phc_staging_key
SENTRY_DSN=https://...@sentry.io/staging
```

### **Step 2: Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to staging
vercel --prod --env .env.staging

# Set custom domain (optional)
vercel domains add mememe-staging.yourdomain.com
vercel alias https://mememe-xyz.vercel.app mememe-staging.yourdomain.com
```

### **Step 3: Configure Environment Variables in Vercel**

```bash
# Add environment variables via CLI
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add FIREBASE_PRIVATE_KEY
vercel env add STRIPE_SECRET_KEY
# ... add all variables
```

Or use the Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all staging environment variables
3. Set Environment to "Production"

---

## 🧪 **Friend Testing Setup**

### **Test User Accounts**

Create test accounts for your friends:

```typescript
// Test account structure
const testUsers = [
  {
    email: 'friend1@test.com',
    password: 'FriendTest123!',
    initialTokens: 5,
    role: 'early_tester'
  },
  {
    email: 'friend2@test.com', 
    password: 'FriendTest123!',
    initialTokens: 10,
    role: 'power_user'
  }
];
```

### **Testing Scenarios**

Create a comprehensive test plan for friends:

#### **Scenario 1: New User Journey**
1. **Sign up** with email
2. **Generate first meme** (topic: "Monday motivation")
3. **Add to favorites** 
4. **Share on social media**
5. **View gallery**
6. **Try different languages** (Spanish, French)

#### **Scenario 2: Token System**
1. **Use all tokens** generating memes
2. **Attempt to generate** with 0 tokens
3. **Purchase token package** (use test card: 4242424242424242)
4. **Generate more memes** after purchase
5. **Check billing history**

#### **Scenario 3: Mobile Experience**
1. **Test on mobile device** (iOS/Android)
2. **Use pull-to-refresh** in gallery
3. **Test touch interactions**
4. **Try dark/light mode toggle**
5. **Test responsive design** across different screen sizes

#### **Scenario 4: Feature Discovery**
1. **Try different themes** (dark/light)
2. **Test multiple languages** for captions
3. **Use social sharing** buttons
4. **Contact form submission**
5. **Error handling** (intentional bugs)

---

## 📧 **Friend Invitation System**

### **Invitation Email Template**

```html
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
        <p style="font-size: 18px; color: #374151; margin-bottom: 15px;">Hi {{friend_name}}!</p>
        
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
            <a href="{{staging_url}}" 
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
        
        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 6px;">
            <p style="color: #374151; margin: 0; font-weight: bold;">Test Account (if needed):</p>
            <p style="color: #6B7280; margin: 5px 0;">Email: {{test_email}}</p>
            <p style="color: #6B7280; margin: 5px 0;">Password: {{test_password}}</p>
        </div>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 14px;">
            Questions? Just reply to this email!<br>
            Thanks for helping make MemeMe awesome! 🙏
        </p>
    </div>
</body>
</html>
```

### **Invitation Script**

```typescript
// scripts/send-invites.ts
import nodemailer from 'nodemailer';

interface Friend {
  name: string;
  email: string;
  testEmail?: string;
  testPassword?: string;
}

const friends: Friend[] = [
  { name: 'Alex', email: 'alex@example.com', testEmail: 'alex-test@mememe.app', testPassword: 'TestAlex123!' },
  { name: 'Sarah', email: 'sarah@example.com', testEmail: 'sarah-test@mememe.app', testPassword: 'TestSarah123!' },
  // Add more friends...
];

async function sendInvitations() {
  const transporter = nodemailer.createTransporter({
    // Your email configuration
  });

  for (const friend of friends) {
    const emailContent = generateInviteEmail(friend);
    
    await transporter.sendMail({
      from: 'you@yourdomain.com',
      to: friend.email,
      subject: '🎨 You\'re invited to test MemeMe - AI Meme Generator!',
      html: emailContent
    });
    
    console.log(`Invitation sent to ${friend.name} (${friend.email})`);
  }
}
```

---

## 📊 **Feedback Collection System**

### **Feedback Modal Component**

```typescript
// src/components/FeedbackModal.tsx
import React, { useState } from 'react';

export const FeedbackModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState({
    rating: 5,
    features: [] as string[],
    improvements: '',
    bugs: '',
    overall: ''
  });

  const submitFeedback = async () => {
    // Send to your feedback collection endpoint
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...feedback,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <h3 className="text-xl font-bold mb-4">🤔 Quick Feedback</h3>
        
        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Overall Experience:</label>
          <div className="flex space-x-1">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onClick={() => setFeedback({...feedback, rating: star})}
                className={`text-2xl ${star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        {/* What worked well */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">What worked well? (check all):</label>
          <div className="space-y-2">
            {[
              'Meme generation quality',
              'Mobile experience', 
              'User interface',
              'Loading speed',
              'Dark/light theme',
              'Multi-language captions',
              'Social sharing',
              'Gallery feature'
            ].map(feature => (
              <label key={feature} className="flex items-center">
                <input
                  type="checkbox"
                  checked={feedback.features.includes(feature)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFeedback({...feedback, features: [...feedback.features, feature]});
                    } else {
                      setFeedback({...feedback, features: feedback.features.filter(f => f !== feature)});
                    }
                  }}
                  className="mr-2"
                />
                {feature}
              </label>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">What could be improved?</label>
          <textarea
            value={feedback.improvements}
            onChange={(e) => setFeedback({...feedback, improvements: e.target.value})}
            className="w-full p-2 border rounded-lg"
            rows={3}
            placeholder="Any suggestions for improvements..."
          />
        </div>

        {/* Bugs */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Any bugs or issues?</label>
          <textarea
            value={feedback.bugs}
            onChange={(e) => setFeedback({...feedback, bugs: e.target.value})}
            className="w-full p-2 border rounded-lg"
            rows={2}
            placeholder="Describe any problems you encountered..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={submitFeedback}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
          >
            Send Feedback
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📈 **Success Metrics**

Track these key metrics during friend testing:

### **Technical Metrics**
- [ ] Page load time < 3 seconds
- [ ] Meme generation time < 10 seconds
- [ ] Mobile responsiveness score > 95%
- [ ] Zero critical bugs reported
- [ ] 95%+ uptime during testing period

### **User Experience Metrics**
- [ ] User completion rate > 80%
- [ ] Average session duration > 5 minutes
- [ ] Memes generated per session > 3
- [ ] Social sharing rate > 15%
- [ ] Return user rate > 40%

### **Feature Adoption**
- [ ] Dark mode usage > 30%
- [ ] Multi-language usage > 20%
- [ ] Gallery feature usage > 60%
- [ ] Token purchase completion > 70%
- [ ] Contact form submissions < 5% (low = good UX)

---

## 🐛 **Issue Tracking**

### **Bug Report Template**

```markdown
## 🐛 Bug Report

**Environment:** Staging (https://mememe-staging.vercel.app)
**Reporter:** [Friend Name]
**Device:** [iOS/Android/Desktop]
**Browser:** [Chrome/Safari/Firefox]

### Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

### Expected Behavior
What should have happened?

### Actual Behavior
What actually happened?

### Screenshots
[Attach screenshots if applicable]

### Additional Context
Any other context about the problem?

### Severity
- [ ] Critical (app unusable)
- [ ] High (major feature broken)
- [ ] Medium (minor feature issue)
- [ ] Low (cosmetic issue)
```

---

## 🎯 **Testing Timeline**

### **Week 1: Setup & Initial Deploy**
- [ ] Deploy to staging
- [ ] Configure all services
- [ ] Run smoke tests
- [ ] Send initial invites (2-3 close friends)

### **Week 2: Core Feature Testing**
- [ ] Meme generation testing
- [ ] User authentication flows
- [ ] Token system testing
- [ ] Mobile experience validation

### **Week 3: Polish & Refinement**
- [ ] Fix reported bugs
- [ ] Improve based on feedback
- [ ] Performance optimizations
- [ ] UI/UX refinements

### **Week 4: Final Validation**
- [ ] Stress testing
- [ ] Final feedback collection
- [ ] Production readiness review
- [ ] Go-live decision

---

## 📋 **Post-Testing Checklist**

### **Before Production Deploy**
- [ ] All critical bugs fixed
- [ ] Performance meets targets
- [ ] Security review completed
- [ ] SEO optimization done
- [ ] Analytics configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Domain and SSL configured

### **Launch Preparation**
- [ ] Production environment variables
- [ ] Payment processing tested
- [ ] Email delivery verified
- [ ] CDN and caching configured
- [ ] Error tracking active
- [ ] Customer support ready

---

**🎉 Ready to launch your viral meme generator!**

With comprehensive testing from friends and these systems in place, your MemeMe app will be ready to delight users and generate viral content at scale.