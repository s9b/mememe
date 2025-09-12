# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MemeMe is a Next.js application that generates memes using AI-powered captions and the Imgflip API. It's a full-stack web application with AI integration, image processing, and monetization features.

## Essential Commands

### Development
```bash
# Start development server
npm run dev

# Start production server (after build)
npm run start
```

### Building and Testing
```bash
# Build for production
npm run build

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run CI-ready tests (no watch, with coverage)
npm run test:ci
```

### Code Quality
```bash
# Lint code
npm run lint

# Lint and fix issues automatically
npm run lint:fix

# TypeScript type checking
npm run type-check
```

### Running Individual Tests
```bash
# Test specific file
npm run test -- --testPathPattern=src/lib/__tests__/generateCaptions.test.ts

# Test specific directory
npm run test -- --testPathPattern=src/components/__tests__

# Run tests matching a pattern
npm run test -- --testNamePattern="should generate"
```

## Architecture Overview

### Core Flow
1. **User Input** → `src/components/MemeGenerator.tsx`
2. **API Processing** → `src/pages/api/generate.ts`
3. **Caption Generation** → `src/lib/generateCaptions.ts` (OpenAI)
4. **Content Moderation** → `src/lib/moderation.ts`
5. **Meme Rendering** → `src/lib/imgflip.ts` (Imgflip API)
6. **Caching** → `src/lib/cache.ts` (Redis/LRU)
7. **Image Storage** → `src/lib/cloudinary.ts` (optional)

### Key Components

#### API Routes (`src/pages/api/`)
- `generate.ts` - Main meme generation endpoint with comprehensive error handling and telemetry
- `templates.ts` - Fetch available meme templates
- `health.ts` - Health check endpoint
- `create-checkout-session.ts` - Stripe integration for payments

#### Core Libraries (`src/lib/`)
- `generateCaptions.ts` - OpenAI integration for AI-powered caption generation
- `imgflip.ts` - Imgflip API wrapper with caching support
- `moderation.ts` - Content moderation using OpenAI
- `rateLimit.ts` - Request rate limiting (Redis or in-memory LRU)
- `cache.ts` - Caching layer for captions and images
- `telemetry.ts` - Sentry integration for error tracking and performance monitoring
- `cloudinary.ts` - Optional image storage and optimization

#### Frontend Components (`src/components/`)
- `MemeGenerator.tsx` - Main UI component with ad-safety checks
- `AdBanner.tsx` - Google AdSense integration with content safety
- `CaptionInput.tsx` - User input handling component

### External Services Integration

#### Required APIs
- **OpenAI API** - Caption generation and content moderation
- **Imgflip API** - Meme template fetching and image generation

#### Optional APIs
- **Cloudinary** - Image storage and optimization
- **Stripe** - Payment processing
- **Redis** - Caching (falls back to in-memory LRU)
- **Sentry** - Error monitoring
- **PostHog** - Analytics
- **Google AdSense** - Monetization

### Environment Configuration

Copy `.env.example` to `.env.local` and configure:

**Required:**
- `OPENAI_API_KEY` - For AI caption generation
- `IMGFLIP_USER` / `IMGFLIP_PASS` - For meme generation

**Optional:**
- `CLOUDINARY_*` variables - Image storage
- `STRIPE_*` variables - Payments
- `REDIS_URL` - Caching (defaults to in-memory)
- `SENTRY_DSN` - Error monitoring
- `NEXT_PUBLIC_POSTHOG_*` - Analytics

## Development Practices

### Content Safety
- All user inputs and AI-generated content go through moderation
- Templates are classified as ad-safe/ad-unsafe
- Ad banners only show for appropriate content
- Rate limiting prevents abuse

### Error Handling
- Comprehensive error tracking with Sentry
- Graceful fallbacks (Redis → LRU cache, etc.)
- Detailed logging with breadcrumbs for debugging
- Health check endpoint for monitoring

### Performance
- Multi-layer caching (captions and generated images)
- Image optimization through Cloudinary
- Rate limiting to prevent API abuse
- Performance monitoring with transactions

### Testing Strategy
- Unit tests for all core libraries (`src/lib/__tests__/`)
- Component tests for React components (`src/components/__tests__/`)
- API route testing (`src/pages/api/__tests__/`)
- Mock external services (OpenAI, Imgflip, etc.)

## CI/CD Pipeline

### GitHub Actions
- **All branches**: Lint → Test → Type check → Security audit
- **Main branch**: Build → Deploy to Vercel → Performance testing (Lighthouse)
- Pre-commit hooks with Husky ensure code quality

### Deployment
- Automatic deployment to Vercel on main branch
- Environment variables managed in both GitHub Secrets and Vercel Dashboard
- Health checks and monitoring included

## Important Implementation Details

### API Route Structure
The main `/api/generate` endpoint follows this pattern:
1. Rate limiting check
2. Input validation and moderation
3. Caption generation with caching
4. Per-caption moderation
5. Meme rendering with Imgflip
6. Comprehensive error handling and telemetry

### Caching Strategy
- **Captions**: Cached by topic + templateId combination
- **Images**: Cached by templateId + text combinations
- **Fallback**: Redis → in-memory LRU cache if Redis unavailable

### Content Moderation
- Input moderation before processing
- Caption moderation before meme generation
- Flagged content returns appropriate error responses

### Ad Safety System
- Templates marked as ad-safe/ad-unsafe
- Dynamic ad display based on content safety
- Premium upgrade prompts for ad-unsafe content

## Troubleshooting

### Common Issues
- **Build fails**: Check environment variables in both local and deployment
- **API timeouts**: Verify external service credentials (OpenAI, Imgflip)
- **Cache issues**: Check Redis connection or verify LRU fallback
- **Rate limiting**: Adjust limits in `src/lib/rateLimit.ts`

### Debugging
- Check Sentry dashboard for detailed error reports
- Use health endpoint `/api/health` for service status
- Enable debug logs by setting appropriate log levels