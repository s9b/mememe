# Deployment Setup Guide

This guide will help you set up CI/CD with GitHub Actions and automatic deployment to Vercel.

## 🚀 Vercel Deployment Setup

### Prerequisites
- A Vercel account ([sign up here](https://vercel.com/signup))
- A GitHub repository with your code
- Vercel CLI installed globally: `npm i -g vercel`

### Step 1: Connect Your Project to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```
   - Choose your Vercel account/team
   - Link to existing project or create new one
   - Accept the default settings

### Step 2: Get Your Vercel Credentials

1. **Get your Vercel Token**:
   - Go to [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Name it "GitHub Actions"
   - Copy the token (you'll need this for `VERCEL_TOKEN`)

2. **Get your Organization ID**:
   ```bash
   vercel teams ls
   ```
   Copy your team/org ID (you'll need this for `VERCEL_ORG_ID`)

3. **Get your Project ID**:
   ```bash
   vercel projects ls
   ```
   Copy your project ID (you'll need this for `VERCEL_PROJECT_ID`)

### Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, then add these secrets:

#### Required Secrets:
```
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_vercel_org_id_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

#### Environment Variables (for production build):
```
# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# API Keys (these should be added in Vercel dashboard)
OPENAI_API_KEY=your_openai_api_key
IMGFLIP_USER=your_imgflip_username
IMGFLIP_PASS=your_imgflip_password
```

#### Optional Secrets (for enhanced features):
```
CODECOV_TOKEN=your_codecov_token_here
SNYK_TOKEN=your_snyk_token_here
```

### Step 4: Configure Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:

```
OPENAI_API_KEY=your_openai_api_key
IMGFLIP_USER=your_imgflip_username
IMGFLIP_PASS=your_imgflip_password
SENTRY_DSN=your_sentry_dsn
REDIS_URL=your_redis_url (optional)
STRIPE_SECRET=your_stripe_secret (optional)
```

### Step 5: Test the Deployment

1. **Push to any branch** to trigger linting and testing
2. **Push to main branch** to trigger full build and deployment
3. Check the Actions tab in your GitHub repository to monitor progress
4. Your app will be automatically deployed to Vercel on successful builds

## 🔧 CI/CD Pipeline Overview

### On Push to Any Branch:
- ✅ Install dependencies (`npm ci`)
- ✅ Run linter (`npm run lint`)
- ✅ Run tests (`npm run test`)
- ✅ Type checking (`npx tsc --noEmit`)
- ✅ Security audit (`npm audit`)

### On Push to Main Branch (additionally):
- 🏗️ Build application (`npm run build`)
- 🧪 Run production tests
- 🚀 Deploy to Vercel
- 📊 Performance testing with Lighthouse
- 💬 Post deployment status comment on PR

## 🛠️ Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd mememe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and configuration

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Run tests**:
   ```bash
   npm run test
   ```

6. **Run linter**:
   ```bash
   npm run lint
   ```

## 📊 Monitoring and Analytics

### Sentry Setup
1. Create account at [sentry.io](https://sentry.io)
2. Create a new project for Next.js
3. Copy your DSN and add it to environment variables

### PostHog Setup
1. Create account at [posthog.com](https://posthog.com)
2. Get your project API key
3. Add it to environment variables

### Performance Monitoring
- Lighthouse CI runs automatically on main branch pushes
- Performance reports are uploaded and accessible via GitHub Actions

## 🔒 Security Features

- **Dependency Auditing**: Automatic security vulnerability scanning
- **Snyk Integration**: Advanced security monitoring (optional)
- **Environment Variable Security**: Sensitive data stored in GitHub Secrets
- **Branch Protection**: Main branch requires passing checks

## 🚨 Troubleshooting

### Common Issues:

1. **Build fails on missing environment variables**:
   - Check that all required environment variables are set in both GitHub Secrets and Vercel Dashboard

2. **Vercel deployment fails**:
   - Verify your `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are correct
   - Make sure the Vercel token has the correct permissions

3. **Tests fail in CI but pass locally**:
   - Check that test environment variables are properly set
   - Verify Node.js versions match between local and CI (currently using Node 18)

4. **Lighthouse performance tests fail**:
   - Check that your app starts correctly with `npm run start`
   - Performance thresholds can be adjusted in `.lighthouserc.js`

### Getting Help:
- Check GitHub Actions logs for detailed error messages
- Review Vercel deployment logs in the Vercel dashboard
- Ensure all secrets are correctly configured in GitHub repository settings

## 🎉 You're All Set!

Your meme generation API now has:
- ✅ Automated testing and linting
- ✅ Automatic deployment to Vercel
- ✅ Performance monitoring
- ✅ Security scanning
- ✅ Error tracking with Sentry
- ✅ Analytics with PostHog

Every push to main will automatically deploy your latest changes to production! 🚀