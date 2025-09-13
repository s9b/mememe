import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { TOKEN_PACKAGES } from '../lib/stripe';

interface UserTokenData {
  tokens: number;
  totalTokensPurchased: number;
  totalTokensUsed: number;
}

interface TokenTransaction {
  id: string;
  type: 'purchase' | 'usage' | 'refund';
  amount: number;
  description: string;
  timestamp: Date;
}

const BillingPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userTokens, setUserTokens] = useState<UserTokenData | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
  }, [user, authLoading, router]);

  // Fetch user token data and history
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user token balance
        const tokenResponse = await fetch('/api/user/tokens');
        if (!tokenResponse.ok) {
          throw new Error('Failed to fetch token balance');
        }
        const tokenData = await tokenResponse.json();
        setUserTokens(tokenData);

        // Fetch token transaction history
        const historyResponse = await fetch('/api/user/token-history');
        if (!historyResponse.ok) {
          throw new Error('Failed to fetch transaction history');
        }
        const historyData = await historyResponse.json();
        setTokenHistory(historyData.transactions || []);

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handlePurchase = async (packageId: string) => {
    if (!user) return;

    try {
      setPurchaseLoading(packageId);
      setError(null);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;

    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError((err as Error).message);
    } finally {
      setPurchaseLoading(null);
    }
  };

  const formatDate = (timestamp: Date) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <title>Billing & Tokens - MemeMe</title>
        <meta name="description" content="Manage your tokens and billing" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-400">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-white text-center mb-8">
              Billing & Tokens
            </h1>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {/* Token Balance Card */}
            <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Token Balance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {userTokens?.tokens || 0}
                  </div>
                  <div className="text-gray-600">Available Tokens</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {userTokens?.totalTokensPurchased || 0}
                  </div>
                  <div className="text-gray-600">Total Purchased</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {userTokens?.totalTokensUsed || 0}
                  </div>
                  <div className="text-gray-600">Total Used</div>
                </div>
              </div>
            </div>

            {/* Token Packages */}
            <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Buy More Tokens</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {TOKEN_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="border rounded-lg p-4 relative">
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {pkg.tokens}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">tokens</div>
                      <div className="text-lg font-semibold mb-4">
                        ${pkg.price}
                      </div>
                      {pkg.bonus && (
                        <div className="text-sm text-green-600 font-semibold mb-4">
                          {pkg.bonus} bonus tokens!
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mb-4">
                        {pkg.description}
                      </p>
                      <button
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchaseLoading === pkg.id}
                        className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                          pkg.popular
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } ${
                          purchaseLoading === pkg.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        {purchaseLoading === pkg.id ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                          </span>
                        ) : (
                          'Purchase'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Transaction History</h2>
              {tokenHistory.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Description</th>
                        <th className="text-right py-3 px-4">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenHistory.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {formatDate(transaction.timestamp)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'usage' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {transaction.description}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${
                            transaction.type === 'purchase' ? 'text-green-600' :
                            transaction.type === 'usage' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {transaction.type === 'purchase' ? '+' : '-'}{transaction.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BillingPage;