/**
 * Simplified Navigation bar for free token system
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/hooks/useAuth';
import { AuthModal } from './AuthModal';
import { ThemeToggle } from './ThemeToggle';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tokenData, setTokenData] = useState<{ tokens: number; daysUntilRefill: number } | null>(null);
  const [tokensLoading, setTokensLoading] = useState(true);

  // Fetch user tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (!user) {
        setTokenData(null);
        setTokensLoading(false);
        return;
      }

      try {
        setTokensLoading(true);
        const token = await user.getIdToken();
        const response = await fetch('/api/user/tokens', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTokenData({
            tokens: data.tokens || 0,
            daysUntilRefill: data.daysUntilRefill || 0
          });
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setTokenData({ tokens: 20, daysUntilRefill: 7 }); // Fallback
      } finally {
        setTokensLoading(false);
      }
    };

    fetchTokens();
  }, [user]);

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
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  🎨 MemeMe
                </h1>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  Free AI Memes
                </span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {user && (
                <Link href="/gallery" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                  ❤️ Gallery
                </Link>
              )}
              <Link href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Contact
              </Link>
            </div>

            {/* Theme & Auth Section */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {loading ? (
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              ) : user ? (
                <>
                  {/* Free Token Display */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-full px-3 py-1 flex items-center space-x-2">
                      <span className="text-lg">🪙</span>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {tokensLoading ? '...' : tokenData?.tokens || 20}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        FREE
                      </span>
                    </div>
                    
                    {/* Refill indicator */}
                    {tokenData && tokenData.daysUntilRefill > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Refills in {tokenData.daysUntilRefill}d
                      </div>
                    )}
                  </div>
                  
                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-md p-1"
                    >
                      {/* User Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium text-sm">
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
                        className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-50">
                        <div className="py-1">
                          {/* User Info */}
                          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.displayName || 'User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              🪙 {tokenData?.tokens || 20} free tokens • Refills weekly
                            </div>
                          </div>
                          
                          {/* Menu Items */}
                          <Link 
                            href="/gallery" 
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
                            onClick={() => setShowUserMenu(false)}
                          >
                            ❤️ My Gallery
                          </Link>
                          
                          <div className="border-t border-gray-100 dark:border-gray-700">
                            <button
                              onClick={handleLogout}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                /* Auth Buttons */
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Get Started Free
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default Navbar;