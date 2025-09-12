/**
 * Buy Tokens Modal for purchasing additional meme generation tokens
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTokens } from '../hooks/useTokens';

interface BuyTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  description: string;
}

const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    tokens: 20,
    price: 2.99,
    description: '20 meme generations'
  },
  {
    id: 'popular',
    tokens: 50,
    price: 4.99,
    originalPrice: 7.47,
    popular: true,
    description: '50 meme generations'
  },
  {
    id: 'pro',
    tokens: 100,
    price: 7.99,
    originalPrice: 14.95,
    description: '100 meme generations'
  },
  {
    id: 'unlimited',
    tokens: 500,
    price: 19.99,
    originalPrice: 74.75,
    description: '500 meme generations'
  }
];

const BuyTokensModal: React.FC<BuyTokensModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { tokens, userStats } = useTokens();
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(TOKEN_PACKAGES[1]); // Default to popular
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!user || !selectedPackage) return;

    try {
      setIsProcessing(true);
      setError(null);

      // TODO: Implement Stripe checkout
      // For now, we'll simulate the purchase flow
      console.log('Purchasing:', selectedPackage);
      
      // In a real implementation, this would:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe
      // 3. Handle webhook for successful payment
      // 4. Update user tokens via API
      
      alert(`Purchase simulation: ${selectedPackage.tokens} tokens for $${selectedPackage.price}. This will be implemented with Stripe in the next step!`);
      
      onClose();
    } catch (err) {
      console.error('Purchase error:', err);
      setError('Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              🪙 Buy Meme Tokens
            </h2>
            <p className="text-gray-600">
              You have <span className="font-semibold text-blue-600">{tokens} tokens</span> remaining
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Stats */}
          {userStats && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{userStats.memesGenerated}</div>
                  <div className="text-sm text-gray-600">Memes Created</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{userStats.totalTokensUsed}</div>
                  <div className="text-sm text-gray-600">Tokens Used</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-2xl font-bold text-green-600">{userStats.totalTokensPurchased || 0}</div>
                  <div className="text-sm text-gray-600">Tokens Purchased</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Token Packages */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Token Package</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOKEN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedPackage.id === pkg.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${pkg.popular ? 'ring-2 ring-purple-500 ring-opacity-20' : ''}`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {pkg.tokens}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {pkg.description}
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-2xl font-bold text-blue-600">
                        ${pkg.price}
                      </span>
                      {pkg.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ${pkg.originalPrice}
                        </span>
                      )}
                    </div>
                    
                    {pkg.originalPrice && (
                      <div className="text-xs text-green-600 font-medium">
                        Save ${(pkg.originalPrice - pkg.price).toFixed(2)}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      ${(pkg.price / pkg.tokens).toFixed(3)} per token
                    </div>
                  </div>
                  
                  {selectedPackage.id === pkg.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">✨ What you get:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>AI-powered meme generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Access to 100+ meme templates</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>High-quality image downloads</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>No watermarks or ads</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Unlimited regenerations</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Priority processing</span>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Maybe Later
            </button>
            <button
              onClick={handlePurchase}
              disabled={isProcessing || !selectedPackage}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Buy ${selectedPackage.tokens} Tokens for $${selectedPackage.price}`
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure payment powered by Stripe • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyTokensModal;