#!/bin/bash

# 🚀 MemeMe Staging Environment Setup Script
# This script helps set up the staging environment for MemeMe

set -e  # Exit on any error

echo "🎨 MemeMe Staging Environment Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing globally..."
        npm install -g vercel
    fi
    
    print_success "All dependencies are available"
}

# Create staging environment file
create_env_file() {
    print_status "Creating staging environment configuration..."
    
    if [ -f ".env.staging" ]; then
        read -p "❓ .env.staging already exists. Overwrite? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Skipping environment file creation"
            return
        fi
    fi
    
    cat > .env.staging << 'EOF'
# 🌍 MemeMe Staging Environment Configuration
# Update these values with your actual staging credentials

# App Configuration
NEXT_PUBLIC_APP_URL=https://mememe-staging.vercel.app
NODE_ENV=production

# Firebase Staging Project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mememe-staging
NEXT_PUBLIC_FIREBASE_API_KEY=your-staging-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mememe-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mememe-staging.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-staging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-staging-app-id

# Firebase Admin (Staging)
FIREBASE_PROJECT_ID=mememe-staging
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-staging-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@mememe-staging.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://mememe-staging-default-rtdb.firebaseio.com

# Stripe Test Keys (Never use production keys in staging!)
STRIPE_PUBLIC_KEY=pk_test_your_test_public_key
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
STRIPE_WEBHOOK_SECRET=whsec_test_webhook_secret

# Token Pricing (Test Products - Create these in Stripe Dashboard)
STRIPE_5_TOKENS_PRICE_ID=price_test_5_tokens_id
STRIPE_15_TOKENS_PRICE_ID=price_test_15_tokens_id
STRIPE_50_TOKENS_PRICE_ID=price_test_50_tokens_id

# AI Services (Use separate API keys for staging if possible)
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
IMGFLIP_USERNAME=your-imgflip-username
IMGFLIP_PASSWORD=your-imgflip-password

# Email Configuration (Consider using a test SMTP service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging-noreply@yourdomain.com
SMTP_PASSWORD=your-staging-smtp-password
CONTACT_EMAIL=staging-feedback@yourdomain.com

# Security
CRON_SECRET=staging-cron-secret-random-string
ADMIN_SECRET=staging-admin-secret-random-string

# Analytics & Monitoring (Optional - use test/staging keys)
POSTHOG_KEY=phc_staging_posthog_key
SENTRY_DSN=https://your-staging-sentry-dsn@sentry.io/project-id

# Rate Limiting (More lenient for testing)
CONTACT_RATE_LIMIT=10
GENERATE_RATE_LIMIT=50
EOF

    print_success "Created .env.staging template"
    print_warning "🔧 Please update .env.staging with your actual staging credentials!"
}

# Build and test locally
test_build() {
    print_status "Testing local build with staging environment..."
    
    # Copy staging env to .env.local for testing
    cp .env.staging .env.local
    
    print_status "Installing dependencies..."
    npm ci
    
    print_status "Running build..."
    if npm run build; then
        print_success "Build completed successfully"
    else
        print_error "Build failed. Please fix errors before deploying."
        exit 1
    fi
    
    # Clean up
    rm -f .env.local
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel staging..."
    
    # Login check
    if ! vercel whoami &> /dev/null; then
        print_status "Please log in to Vercel:"
        vercel login
    fi
    
    # Deploy
    print_status "Deploying to production (staging environment)..."
    vercel deploy --prod --env .env.staging
    
    print_success "Deployment completed!"
    print_status "Don't forget to configure environment variables in Vercel dashboard"
}

# Setup Firebase staging project
setup_firebase() {
    print_status "Firebase staging setup instructions:"
    echo
    echo "1. Go to https://console.firebase.google.com"
    echo "2. Create a new project named 'mememe-staging'"
    echo "3. Enable Authentication with Email/Password and Google"
    echo "4. Create Firestore database in test mode"
    echo "5. Generate service account key for admin SDK"
    echo "6. Update .env.staging with the generated credentials"
    echo
    read -p "Press Enter to continue after setting up Firebase..."
}

# Setup Stripe testing
setup_stripe() {
    print_status "Stripe staging setup instructions:"
    echo
    echo "1. Log in to your Stripe Dashboard"
    echo "2. Make sure you're in 'Test Mode' (toggle in top left)"
    echo "3. Go to Products and create test products:"
    echo "   - '5 Tokens' for $1.99"
    echo "   - '15 Tokens' for $4.99" 
    echo "   - '50 Tokens' for $14.99"
    echo "4. Copy the price IDs to .env.staging"
    echo "5. Get your test API keys from API Keys section"
    echo "6. Set up webhook endpoint for /api/webhooks/stripe"
    echo
    read -p "Press Enter to continue after setting up Stripe..."
}

# Main execution
main() {
    echo
    print_status "Starting MemeMe staging setup..."
    
    # Step 1: Check dependencies
    check_dependencies
    echo
    
    # Step 2: Create environment file
    create_env_file
    echo
    
    # Step 3: Firebase setup
    read -p "🔥 Set up Firebase staging project? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_firebase
    fi
    echo
    
    # Step 4: Stripe setup
    read -p "💳 Set up Stripe test environment? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_stripe
    fi
    echo
    
    # Step 5: Test build
    read -p "🔨 Test build locally? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_build
    fi
    echo
    
    # Step 6: Deploy
    read -p "🚀 Deploy to Vercel staging? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_vercel
    fi
    
    echo
    print_success "🎉 Staging setup completed!"
    echo
    echo "📋 Next steps:"
    echo "1. Update environment variables in Vercel dashboard"
    echo "2. Test the staging deployment thoroughly"
    echo "3. Run the friend invitation script: npm run send-invites"
    echo "4. Monitor feedback and fix any issues"
    echo
    echo "📊 Useful commands:"
    echo "- View logs: vercel logs <deployment-url>"
    echo "- Update env vars: vercel env add <key> <value>"
    echo "- Send invites: npm run send-invites"
    echo
}

# Run main function
main "$@"