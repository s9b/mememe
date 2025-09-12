# MeMeMe - AI Meme Generator

A Next.js application that generates memes using AI and the Imgflip API.

## Features

- Generate memes with custom captions
- AI-powered caption suggestions
- Multiple meme templates to choose from
- Image storage with Cloudinary

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- OpenAI API
- Imgflip API
- Cloudinary
- ESLint
- Jest for testing
- Husky for pre-commit hooks

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm or yarn
- Accounts for the following services:
  - OpenAI
  - Imgflip
  - Cloudinary
  - (Optional) Google AdSense
  - (Optional) Stripe

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/mememe.git
cd mememe
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

Copy the `.env.example` file to `.env.local` and fill in your API keys and credentials:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file with your actual credentials:

- `OPENAI_API_KEY`: Your OpenAI API key
- `IMGFLIP_USER`: Your Imgflip username
- `IMGFLIP_PASS`: Your Imgflip password
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
- `NEXT_PUBLIC_ADSENSE_ID`: (Optional) Your Google AdSense ID
- `STRIPE_SECRET`: (Optional) Your Stripe secret key

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run Jest tests

### Husky Pre-commit Hooks

This project uses Husky to run tests and linting before each commit. This ensures that only quality code is committed to the repository.

## License

MIT