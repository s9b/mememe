# 🚀 MemeMe Production Deployment Guide

This guide will walk you through deploying MemeMe to production step by step.

## 📋 **Step 1: Set Up Firebase Project**

### **1.1 Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name it `mememe-prod` (or your preferred name)
4. Enable Google Analytics (optional)
5. Wait for project creation

### **1.2 Configure Authentication**
1. In Firebase Console, go to **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable **Email/Password**
4. Enable **Google** sign-in:
   - Click Google → Enable
   - Add your Gmail as authorized domain
   - Copy the Web client ID (you'll need this)

### **1.3 Set Up Firestore Database**
1. Go to **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select a location close to your users (us-central1 is good)
4. Wait for database creation

### **1.4 Configure Firestore Security Rules**
1. In Firestore, go to **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own memes
    match /memes/{memeId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Users can read/write their own favorites
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Admin can read feedback (optional - for your team)
    match /feedback/{feedbackId} {
      allow read: if request.auth != null;
      allow create: if true; // Anyone can submit feedback
    }
  }
}
```

### **1.5 Get Firebase Configuration**
1. Go to **Project settings** (gear icon)
2. Scroll to **Your apps** → **Web app**
3. If no web app, click **Add app** → **Web** → name it "MemeMe"
4. Copy the config object - you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com", 
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### **1.6 Generate Service Account Key**
1. Go to **Project settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (keep it secure!)
4. You'll need the `private_key`, `client_email`, and `project_id` from this file

---

## 💳 **Step 2: Set Up Stripe**

### **2.1 Create Stripe Account**
1. Go to [Stripe.com](https://stripe.com) → **Start now**
2. Create account with your business details
3. Complete account verification (may take time)

### **2.2 Switch to Live Mode** (Important!)
1. In Stripe Dashboard, toggle from "Test data" to "Live data" (top left)
2. All products and API keys should be created in **Live mode** for production

### **2.3 Create Token Products**
1. Go to **Products** → **Add product**

Create these 3 products:

**Product 1: Starter Pack**
- Name: "5 Tokens - Starter Pack"
- Price: $1.99 USD
- Type: One-time
- Copy the **Price ID** (starts with `price_`)

**Product 2: Popular Pack**  
- Name: "15 Tokens - Popular Pack"
- Price: $4.99 USD
- Type: One-time
- Copy the **Price ID**

**Product 3: Pro Pack**
- Name: "50 Tokens - Pro Pack"  
- Price: $14.99 USD
- Type: One-time
- Copy the **Price ID**

### **2.4 Get API Keys**
1. Go to **Developers** → **API keys**
2. Copy **Publishable key** (starts with `pk_live_`)
3. Click "Reveal" on **Secret key** (starts with `sk_live_`)
4. **IMPORTANT:** These are LIVE keys - keep them secure!

### **2.5 Set Up Webhook**
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Events to send:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

---

## 📁 **Step 3: Push Code to GitHub**

Let's commit all your changes and push to GitHub:

```bash
# Add all files
git add .

# Commit changes
git commit -m "Complete MemeMe app with authentication, payments, and testing"

# Push to main branch
git push origin main
```

---

## ⚡ **Step 4: Deploy to Vercel**

### **4.1 Connect to Vercel**
1. Go to [Vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **New Project**
3. Import your MemeMe repository
4. Leave build settings as default (Next.js detected automatically)
5. Click **Deploy** (will fail - that's expected, we need env vars)

### **4.2 Configure Environment Variables**
1. In Vercel Dashboard → Your project → **Settings** → **Environment Variables**

Add these variables (with your actual values):

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NODE_ENV=production

# Firebase Configuration (from Step 1.5)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin (from Step 1.6 - Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-PRIVATE-KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@your-project.iam.gserviceaccount.com

# Stripe Configuration (from Step 2.4 & 2.5)
STRIPE_PUBLIC_KEY=pk_live_your_publishable_key
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Token Products (from Step 2.3)
STRIPE_5_TOKENS_PRICE_ID=price_your_5_token_price_id
STRIPE_15_TOKENS_PRICE_ID=price_your_15_token_price_id
STRIPE_50_TOKENS_PRICE_ID=price_your_50_token_price_id

# AI Services (you should already have these)
GOOGLE_GEMINI_API_KEY=your-existing-gemini-key
IMGFLIP_USERNAME=your-existing-imgflip-username
IMGFLIP_PASSWORD=your-existing-imgflip-password

# Email Configuration (optional for contact form)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-specific-password
CONTACT_EMAIL=your-email@gmail.com
```

### **4.3 Redeploy**
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete
4. Your app should now be live! 🎉

---

## 🧪 **Step 5: Test Everything**

Visit your live app and test:

1. **✅ Sign up** with email/password
2. **✅ Sign in** with Google
3. **✅ Generate a meme** (uses 1 token)
4. **✅ Add to favorites**
5. **✅ Buy more tokens** (use a real card or Stripe test card: 4242424242424242)
6. **✅ Generate more memes**
7. **✅ Check gallery**
8. **✅ Test mobile responsiveness**

---

## 🚨 **Important Security Notes**

1. **Never commit credentials** to GitHub
2. **Use different API keys** for staging vs production
3. **Monitor your usage** (Gemini API, Stripe, Firebase)
4. **Set up billing alerts** in each service
5. **Keep your webhook secret secure**

---

## 🎉 **You're Live!**

Congratulations! Your MemeMe app is now live and ready for users. 

Share your link and watch the viral memes begin! 🎨✨