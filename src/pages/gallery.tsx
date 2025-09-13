import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FavoriteButton } from '../components/FavoriteButton';
import { SocialShareButtons } from '../components/SocialShareButtons';
import { PullToRefresh, MobileCard, MobileSkeleton, useIsMobile } from '../components/MobileOptimizations';
import { InlineLoader } from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import AuthModal from '../components/AuthModal';
import Navbar from '../components/Navbar';
import Link from 'next/link';

interface Favorite {
  id: string;
  memeUrl: string;
  prompt: string;
  templateName?: string;
  caption?: string;
  createdAt: string;
}

interface ListFavoritesResponse {
  success: boolean;
  message: string;
  favorites?: Favorite[];
  total?: number;
}

const Gallery: React.FC = () => {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useIsMobile();
  
  const PAGE_SIZE = 12;

  const fetchFavorites = async (page = 0, append = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (!append) setLoading(true);
      
      const token = await getIdToken();
      const response = await fetch(`/api/favorites/list?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data: ListFavoritesResponse = await response.json();

      if (data.success && data.favorites) {
        if (append) {
          setFavorites(prev => [...prev, ...data.favorites!]);
        } else {
          setFavorites(data.favorites);
        }
        
        setTotalFavorites(data.total || 0);
        setHasMore(data.favorites.length === PAGE_SIZE);
      } else {
        setError(data.message || 'Failed to load favorites');
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchFavorites();
    }
  }, [user, authLoading]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchFavorites(nextPage, true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0);
    await fetchFavorites(0, false);
    setRefreshing(false);
  };

  const handleFavoriteRemoved = (memeUrl: string) => {
    setFavorites(prev => prev.filter(fav => fav.memeUrl !== memeUrl));
    setTotalFavorites(prev => Math.max(0, prev - 1));
    toast.success('Removed from favorites');
  };

  const downloadImage = async (imageUrl: string, caption: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meme-${caption.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Meme downloaded!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download meme');
    }
  };

  // Show auth prompt for non-authenticated users
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="text-6xl mb-6">❤️</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Your Favorite Memes Gallery
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Sign in to view and manage your favorite memes
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In to View Gallery 🚀
            </button>
          </div>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                My Favorite Memes ❤️
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {totalFavorites === 0 
                  ? 'No favorites yet - start generating memes!'
                  : `${totalFavorites} favorite${totalFavorites !== 1 ? 's' : ''} saved`
                }
              </p>
            </div>
            <Link href="/" className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors">
              Generate More Memes
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading && favorites.length === 0 ? (
          <div className="text-center py-16">
            {isMobile ? (
              <MobileSkeleton lines={4} className="max-w-md mx-auto" avatar />
            ) : (
              <div>
                <InlineLoader message="Loading your favorites..." />
              </div>
            )}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">💔</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              No Favorites Yet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start generating memes and click the heart button to add them to your gallery!
            </p>
            <Link href="/" className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 font-medium transition-colors">
              Create Your First Meme 🚀
            </Link>
          </div>
        ) : (
          <PullToRefresh onRefresh={handleRefresh}>
            {refreshing && (
              <div className="text-center py-4">
                <InlineLoader message="Refreshing favorites..." />
              </div>
            )}
            
            {/* Memes Grid */}
            <div className={`grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-4 sm:gap-6 mb-8`}>
              {favorites.map((favorite) => (
                <MobileCard 
                  key={favorite.id} 
                  className="overflow-hidden" 
                  padding={isMobile ? 'sm' : 'md'}
                >
                  <div className={`${isMobile ? 'aspect-square' : 'aspect-square'} bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden rounded-lg`}>
                    <img
                      src={favorite.memeUrl}
                      alt={favorite.caption || 'Meme'}
                      className={`max-w-full max-h-full object-contain transition-transform cursor-pointer ${
                        isMobile ? 'active:scale-95' : 'hover:scale-105'
                      }`}
                      onClick={() => downloadImage(favorite.memeUrl, favorite.caption || 'meme')}
                      title="Tap to download"
                    />
                  </div>
                  
                  <div className={isMobile ? 'p-3' : 'p-4'}>
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        "{favorite.caption || 'No caption'}"
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        Topic: {favorite.prompt}
                      </p>
                      {favorite.templateName && (
                        <p className="text-xs text-gray-500">
                          Template: {favorite.templateName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Added: {new Date(favorite.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Favorite Button */}
                      <div className="flex items-center justify-between gap-2">
                        <FavoriteButton
                          memeUrl={favorite.memeUrl}
                          prompt={favorite.prompt}
                          templateName={favorite.templateName}
                          caption={favorite.caption}
                          isFavorited={true}
                          onFavoriteChange={(favorited) => {
                            if (!favorited) {
                              handleFavoriteRemoved(favorite.memeUrl);
                            }
                          }}
                        />
                        
                        <button
                          onClick={() => downloadImage(favorite.memeUrl, favorite.caption || 'meme')}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </div>
                      
                      {/* Social Share Buttons */}
                      <SocialShareButtons
                        memeUrl={favorite.memeUrl}
                        caption={favorite.caption || 'Check out this meme!'}
                        prompt={favorite.prompt}
                        className="flex-wrap"
                      />
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors ${
                    isMobile ? 'px-6 py-3 text-base w-full sm:w-auto' : 'px-8 py-3'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <InlineLoader message="Loading..." />
                    </div>
                  ) : (
                    'Load More Favorites'
                  )}
                </button>
              </div>
            )}
            
            {!hasMore && favorites.length >= PAGE_SIZE && (
              <div className="text-center text-gray-500">
                <p>🎉 You've viewed all your favorites!</p>
              </div>
            )}
          </PullToRefresh>
        )}
      </div>
    </div>
  );
};

export default Gallery;