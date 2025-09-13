/**
 * Navigation bar with authentication
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import { ThemeToggle } from './ThemeToggle';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tokens, setTokens] = useState<number>(0);
  const [tokensLoading, setTokensLoading] = useState(true);

  // Fetch user tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (!user) {
        setTokens(0);
        setTokensLoading(false);
        return;
      }

      try {
        setTokensLoading(true);
        const response = await fetch('/api/user/tokens', {
          headers: {
            'Authorization': `Bearer ${user.uid}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTokens(data.tokens || 0);
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
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
                  MemeMe
                </h1>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  AI Meme Generator
                </span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/#templates" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Templates
              </Link>
              {user && (
                <Link href="/gallery" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                  ❤️ My Gallery
                </Link>
              )}
              <Link href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Contact
              </Link>
              {user && (
                <Link href="/billing" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Tokens
                </Link>
              )}
            </div>

            {/* Theme & Auth Section */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle size="md" />
              {loading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : user ? (
                <>
                  {/* Token Badge */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-purple-50 border border-purple-200 rounded-full px-3 py-1 flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">🪙</span>
                      </div>
                      <span className="text-sm font-medium text-purple-700">
                        {tokensLoading ? '...' : tokens}
                      </span>
                    </div>
                    
                    <Link href="/billing" className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium">
                      Buy More
                    </Link>
                  </div>
                  {/* User Menu */}
                  <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 text-gray-700 hover:text-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-md p-1"
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
                        <Link href="/gallery" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setShowUserMenu(false)}>
                          ❤️ My Favorites Gallery
                        </Link>
                        <Link href="/billing" className="block px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors" onClick={() => setShowUserMenu(false)}>
                          🪙 Buy Tokens ({tokens} remaining)
                        </Link>
                        <Link href="/billing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setShowUserMenu(false)}>
                          📊 Billing & Usage
                        </Link>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            // Add profile/settings functionality here
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          ⚙️ Settings
                        </button>
                        
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
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
            <Link href="/#templates" className="text-gray-600 hover:text-purple-600 text-sm">
              Templates
            </Link>
            <Link href="/#gallery" className="text-gray-600 hover:text-purple-600 text-sm">
              Gallery
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-purple-600 text-sm">
              Contact
            </Link>
            {user && (
              <Link href="/billing" className="text-gray-600 hover:text-purple-600 text-sm">
                Tokens
              </Link>
            )}
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
