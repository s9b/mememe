import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface LegalLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, description, children }) => {
  return (
    <>
      <Head>
        <title>{title} - MemeMe</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                ← Back to MemeMe
              </Link>
              <div className="flex space-x-6 text-sm">
                <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                  Terms
                </Link>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                  Privacy
                </Link>
                <Link href="/dmca" className="text-gray-600 hover:text-gray-900">
                  DMCA
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="bg-white rounded-lg shadow-sm p-8">
            <div className="prose prose-gray max-w-none">
              {children}
            </div>
          </article>

          {/* Footer */}
          <footer className="mt-12 text-center text-gray-500 text-sm">
            <div className="space-y-2">
              <p>
                Questions? Contact us at{' '}
                <a href="mailto:legal@mememe.app" className="text-blue-600 hover:text-blue-800">
                  legal@mememe.app
                </a>
              </p>
              <div className="space-x-4">
                <Link href="/terms" className="hover:text-gray-700">
                  Terms of Service
                </Link>
                <span>•</span>
                <Link href="/privacy" className="hover:text-gray-700">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link href="/dmca" className="hover:text-gray-700">
                  DMCA Policy
                </Link>
                <span>•</span>
                <Link href="/pricing" className="hover:text-gray-700">
                  Pricing
                </Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
};

export default LegalLayout;