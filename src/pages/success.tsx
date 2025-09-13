import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';

const SuccessPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { session_id } = router.query;

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    const fetchSessionDetails = async () => {
      if (!session_id || !user) return;

      try {
        setLoading(true);
        
        // In a real implementation, you might want to fetch session details
        // from Stripe to show purchase information
        // For now, we'll just show a generic success message
        
        // Simulate a brief delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSessionDetails({
          sessionId: session_id,
          status: 'paid'
        });
        
      } catch (err) {
        console.error('Error fetching session details:', err);
        setError('Failed to fetch purchase details');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [session_id, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-400">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected
  }

  return (
    <>
      <Head>
        <title>Purchase Successful - MemeMe</title>
        <meta name="description" content="Your token purchase was successful" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-400">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {error ? (
              <div className="bg-white rounded-lg shadow-xl p-8 text-center">
                <div className="text-red-600 text-6xl mb-6">⚠️</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  Something went wrong
                </h1>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <div className="space-y-4">
                  <Link href="/billing">
                    <a className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                      Back to Billing
                    </a>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-xl p-8 text-center">
                <div className="text-green-600 text-6xl mb-6">✅</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  Purchase Successful!
                </h1>
                <p className="text-gray-600 mb-6">
                  Thank you for your purchase! Your tokens have been added to your account and you can start creating memes right away.
                </p>
                
                {sessionDetails && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600">
                      Session ID: <span className="font-mono text-xs">{sessionDetails.sessionId}</span>
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <Link href="/">
                    <a className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors mr-4">
                      Start Creating Memes
                    </a>
                  </Link>
                  <Link href="/billing">
                    <a className="inline-block bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                      View Billing
                    </a>
                  </Link>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h2 className="text-lg font-semibold text-blue-800 mb-2">
                    What's next?
                  </h2>
                  <ul className="text-blue-700 text-sm space-y-1 text-left">
                    <li>• Your tokens are now available in your account</li>
                    <li>• Each meme generation uses 1 token</li>
                    <li>• You can view your token balance anytime in the billing section</li>
                    <li>• Need help? Contact support through our help center</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SuccessPage;