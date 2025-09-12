# 🔥 Firebase Setup Guide for MemeMe

## B2: Create Firebase Project & Enable Authentication

Follow these steps to set up Firebase authentication for your MemeMe app:

### 1. **Create Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name: `mememe-generator`
4. Enable/disable Google Analytics (optional)
5. Click "Create project"

### 2. **Enable Authentication Methods**

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Google**:
   - Click on Google provider
   - Toggle "Enable"
   - Add your email as authorized domain
   - Save
3. Enable **Email/Password**:
   - Click on Email/Password provider
   - Toggle "Enable"
   - Save

### 3. **Create Web App**

1. In Firebase Console, click the **Web icon** (`</>`)
2. Register app name: `mememe-web`
3. **Copy the Firebase config object**
4. Click "Continue to console"

### 4. **Add Firebase Config to Your App**

Replace the placeholder values in `.env.local`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA...your_actual_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mememe-generator.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mememe-generator
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mememe-generator.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEFGHIJ
```

### 5. **Set up Firestore Database**

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select location closest to your users
5. Click "Done"

### 6. **Configure Authorized Domains**

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - `your-vercel-domain.vercel.app` (for production)

## 🎯 **What's Implemented:**

### ✅ **Authentication Features:**
- **Google Sign-In** with popup
- **Email/Password** sign-in and sign-up
- **User persistence** across page reloads
- **Protected meme generation** - requires login
- **User profile** with avatar and dropdown
- **Firestore user documents** with metadata

### ✅ **UI Components:**
- **Navbar** with auth buttons and user menu
- **Auth Modal** with login/signup tabs
- **Protected MemeGenerator** with login prompts
- **Beautiful auth UI** with Google branding

### ✅ **Security:**
- **Client-side auth state management**
- **Automatic user document creation**
- **Error handling** for all auth operations
- **User-friendly error messages**

## 🚀 **Testing Authentication:**

1. **Start your app**: `npm run dev`
2. **Visit**: `http://localhost:3001`
3. **Click "Get Started"** or "Sign In"
4. **Test Google Sign-In** (requires Firebase config)
5. **Test Email Sign-Up** (create new account)
6. **Test protected features** (meme generation)
7. **Test logout** from user menu

## 🔧 **Troubleshooting:**

### **"Firebase config not found"**
- Make sure all `NEXT_PUBLIC_FIREBASE_*` variables are set in `.env.local`
- Restart your dev server after adding environment variables

### **"Popup blocked" error**
- Enable popups in your browser
- Or use redirect method instead of popup

### **"Domain not authorized"**
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### **Firestore permission errors**
- Make sure Firestore is set to "test mode"
- For production, you'll need proper security rules

## 📚 **Next Steps:**

After Firebase is set up, you can:
- Deploy to Vercel with Firebase config as environment variables
- Add user profile pages
- Store user's generated memes
- Add premium features with Stripe
- Implement user dashboards

## 🎉 **You're All Set!**

Your MemeMe app now has full authentication with Firebase! Users can sign in with Google or email, and meme generation is protected behind authentication.