/**
 * Navigation bar with authentication
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTokens } from '../hooks/useTokens';
import AuthModal from './AuthModal';
import BuyTokensModal from './BuyTokensModal';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const { tokens, loading: tokensLoading } = useTokens();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBuyTokensModal, setShowBuyTokensModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">
                MemeMe
              </h1>
              <span className="ml-2 text-sm text-gray-500 hidden sm:inline">
                AI Meme Generator
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                Templates
              </a>
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                Gallery
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">
                Pricing
              </a>
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : user ? (
                <>
                  {/* Token Badge */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1 flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">🪙</span>
                      </div>
                      <span className="text-sm font-medium text-blue-700">
                        {tokensLoading ? '...' : tokens}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setShowBuyTokensModal(true)}
                      className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                    >
                      Buy More
                    </button>
                  </div>
                  {/* User Menu */}
                  <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || user.email || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span>
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* User Name */}
                    <span className="hidden sm:block font-medium">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                    
                    {/* Dropdown Icon */}
                    <svg 
                      className="w-4 h-4 transition-transform duration-200"
                      style={{ transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="py-1">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || 'User'}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {user.email}
                          </div>
                        </div>
                        
                        {/* Menu Items */}
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          🎨 My Memes
                        </a>
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          ⚙️ Settings
                        </a>
                        <button
                          onClick={() => setShowBuyTokensModal(true)}
                          className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          🪙 Buy Tokens ({tokens} remaining)
                        </button>
                        <a
                          href="#pricing"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          ⭐ Upgrade to Pro
                        </a>
                        
                        <div className="border-t border-gray-100">
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            🚪 Sign out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </>
              ) : (
                /* Logged Out State */
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Button (if needed in future) */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex space-x-4">
            <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
              Templates
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
              Gallery
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600 text-sm">
              Pricing
            </a>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      {/* Buy Tokens Modal */}
      <BuyTokensModal
        isOpen={showBuyTokensModal}
        onClose={() => setShowBuyTokensModal(false)}
      />
    </>
  );
};

export default Navbar;
