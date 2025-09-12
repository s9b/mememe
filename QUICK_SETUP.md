# ⚡ Quick CI/CD Setup

## 📋 GitHub Secrets Checklist

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### ✅ Required for Deployment:
```
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_vercel_org_id_here  
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

### ✅ Required for Production Build:
```
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### ✅ Optional (for enhanced features):
```
CODECOV_TOKEN=your_codecov_token_here
SNYK_TOKEN=your_snyk_token_here
```

## 🚀 Get Your Vercel Credentials

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Login**: `vercel login`  
3. **Link project**: `vercel link`
4. **Get token**: Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
5. **Get IDs**: Run `vercel teams ls` and `vercel projects ls`

## 🎯 What Happens When You Push

### Any Branch:
- ✅ Lint check (`npm run lint`)
- ✅ Tests (`npm run test`)
- ✅ Type check (`tsc --noEmit`)
- ✅ Security audit

### Main Branch:
- 🏗️ Build app (`npm run build`)
- 🚀 Deploy to Vercel
- 📊 Performance test (Lighthouse)
- 💬 Comment with deployment URL

## 🔧 Local Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Check linting
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking
```

## 📊 Monitoring URLs

- **Health Check**: `https://your-app.vercel.app/api/health`
- **Main API**: `https://your-app.vercel.app/api/generate`

## 🚨 Troubleshooting

1. **Build fails**: Check environment variables in both GitHub Secrets and Vercel Dashboard
2. **Tests fail**: Ensure Node.js version matches (18) and all dependencies are installed
3. **Deployment fails**: Verify Vercel token has correct permissions

**Need help?** Check `DEPLOYMENT.md` for detailed instructions!

---

🎉 **That's it!** Push to main and watch your app deploy automatically!