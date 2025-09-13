import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

interface FavoriteButtonProps {
  memeUrl: string;
  prompt: string;
  templateName?: string;
  caption?: string;
  isFavorited?: boolean;
  onFavoriteChange?: (favorited: boolean) => void;
}

interface FavoriteResponse {
  success: boolean;
  message: string;
  favoriteId?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  memeUrl,
  prompt,
  templateName,
  caption,
  isFavorited = false,
  onFavoriteChange
}) => {
  const { user, getIdToken } = useAuth();
  const [favorited, setFavorited] = useState(isFavorited);
  const [loading, setLoading] = useState(false);

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }

    setLoading(true);

    try {
      const token = await getIdToken();
      const endpoint = favorited ? '/api/favorites/remove' : '/api/favorites/add';
      const payload = favorited 
        ? { memeUrl }
        : { memeUrl, prompt, templateName, caption };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data: FavoriteResponse = await response.json();

      if (data.success) {
        const newFavorited = !favorited;
        setFavorited(newFavorited);
        onFavoriteChange?.(newFavorited);
        
        toast.success(newFavorited ? 'Added to favorites! ❤️' : 'Removed from favorites');
      } else {
        if (response.status === 409) {
          // Already favorited
          setFavorited(true);
          onFavoriteChange?.(true);
          toast.error('Meme is already in your favorites');
        } else {
          toast.error(data.message || 'Failed to update favorites');
        }
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
      toast.error('Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFavoriteToggle}
      disabled={loading}
      className={`
        inline-flex items-center justify-center
        px-4 py-2 rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${favorited 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
        }
      `}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving...
        </>
      ) : (
        <>
          <svg 
            className={`h-4 w-4 mr-2 ${favorited ? 'text-white' : 'text-gray-600'}`}
            fill={favorited ? 'currentColor' : 'none'}
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
          {favorited ? 'Favorited' : 'Add to Favorites'}
        </>
      )}
    </button>
  );
};