import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const PricingPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Handle success/cancel messages from URL params
  useEffect(() => {
    const { success, canceled } = router.query;
    
    if (success === 'true') {
      setMessage('🎉 Welcome to Premium! Your subscription is now active.');
    } else if (canceled === 'true') {
      setMessage('Payment was canceled. You can try again anytime.');
    }
  }, [router.query]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // In a real app, you'd get this from your Stripe dashboard
          // For demo purposes, using a placeholder
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_demo_monthly_plan',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing - MemeMe</title>
        <meta name="description" content="Upgrade to premium for unlimited meme generation and ad-free experience" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            {/* Status Messages */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.includes('Welcome') ? 'bg-green-50 text-green-700 border border-green-200' :
                message.includes('canceled') ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
            <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
              ← Back to MemeMe
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600">
              Upgrade to premium for unlimited meme generation and an ad-free experience
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Free Plan */}
            <div className="bg-white rounded-lg shadow-lg p-8 relative">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $0
                  <span className="text-lg font-normal text-gray-500">/month</span>
                </div>
                <p className="text-gray-600">Perfect for casual meme creators</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">10 memes per day</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Basic templates</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Standard resolution</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-400">Ads displayed</span>
                </li>
              </ul>

              <button 
                className="w-full bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                disabled
              >
                Current Plan
              </button>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg shadow-xl p-8 relative">
              <div className="absolute top-0 right-6 transform -translate-y-1/2">
                <span className="bg-yellow-400 text-yellow-900 text-sm font-semibold py-1 px-3 rounded-full">
                  POPULAR
                </span>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-2">Premium</h3>
                <div className="text-4xl font-bold mb-2">
                  $9.99
                  <span className="text-lg font-normal opacity-80">/month</span>
                </div>
                <p className="opacity-90">For serious meme enthusiasts</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Unlimited memes</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>All templates + exclusive ones</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>HD resolution downloads</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No ads</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Priority support</span>
                </li>
              </ul>

              <button 
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full bg-white text-purple-600 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Upgrade to Premium'
                )}
              </button>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">
                  Yes! You can cancel your premium subscription at any time. Your access will continue until the end of your billing period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">
                  We accept all major credit cards, PayPal, and other popular payment methods through Stripe.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Are there any usage limits for premium users?</h3>
                <p className="text-gray-600">
                  Premium users get unlimited meme generation with no daily limits or restrictions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h3>
                <p className="text-gray-600">
                  We offer a 30-day money-back guarantee. If you're not satisfied with premium features, contact us for a full refund.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center mt-12">
            <p className="text-gray-600">
              Have questions? <a href="mailto:support@mememe.app" className="text-blue-600 hover:text-blue-800">Contact us</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingPage;