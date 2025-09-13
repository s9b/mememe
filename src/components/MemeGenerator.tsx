import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdBanner, { useAdSafety } from './AdBanner';
import AuthModal from './AuthModal';
import { FavoriteButton } from './FavoriteButton';
import { SocialShareButtons } from './SocialShareButtons';
import { LanguageSelector } from './LanguageSelector';
import { MemeGenerationLoader, ButtonLoader, InlineLoader } from './LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import templatesData from '../data/templates.json';

// Mock types to match your existing structure
interface MemeResult {
  caption: string;
  imageUrl: string;
  templateId: string;
}

interface Template {
  id: string;
  name: string;
  allowedForAds: boolean;
}

interface ApiErrorResponse {
  error: string;
  code?: string;
  requiredTokens?: number;
}

const MemeGenerator: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tokens, setTokens] = useState<number>(0);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [results, setResults] = useState<MemeResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [usedTemplateIds, setUsedTemplateIds] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const templates: Template[] = templatesData.templates;
  const isAdSafe = useAdSafety(results, templates);

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
  }, [user, results]); // Refetch after results change (tokens may have been consumed)

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setError(null);
    
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Check if user has enough tokens
    if (tokens <= 0 && !tokensLoading) {
      setError('You need tokens to generate memes. Please purchase tokens to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic,
          userId: user.uid,
          language: selectedLanguage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        if (errorData.code === 'INSUFFICIENT_TOKENS') {
          setError(`You need ${errorData.requiredTokens || 1} tokens to generate memes. Please purchase more tokens.`);
        } else {
          setError(errorData.error || 'Failed to generate memes');
        }
        return;
      }

      setResults(data.results);
      
      // Track used template IDs for regeneration
      if (data.results && data.results.length > 0) {
        const templateIds = [...new Set(data.results.map((r: MemeResult) => r.templateId))] as string[];
        setUsedTemplateIds(templateIds);
        
        // Refetch tokens after successful generation
        setTokens(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error generating memes:', error);
      setError('Failed to generate memes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!results || results.length === 0 || !topic.trim()) return;
    
    setError(null);
    
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Check if user has enough tokens for regeneration
    if (tokens <= 0 && !tokensLoading) {
      setError('You need tokens to regenerate memes. Please purchase tokens to continue.');
      return;
    }

    setIsRegenerating(true);
    try {
      const captions = results.map(r => r.caption);
      
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic, 
          captions,
          usedTemplateIds,
          userId: user.uid,
          language: selectedLanguage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        if (errorData.code === 'INSUFFICIENT_TOKENS') {
          setError(`You need ${errorData.requiredTokens || 1} tokens to regenerate memes. Please purchase more tokens.`);
        } else {
          setError(errorData.error || 'Failed to regenerate memes');
        }
        return;
      }

      setResults(data.results);
      
      // Add the new template ID to used templates
      setUsedTemplateIds(prev => [...prev, data.newTemplateId]);
      
      // Refetch tokens after successful regeneration
      setTokens(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error regenerating memes:', error);
      setError('Failed to regenerate memes. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          MemeMe Generator
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Create hilarious memes with AI-powered captions
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        {/* Language Selector */}
        <div className="mb-4">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            className="max-w-xs"
          />
        </div>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic for your meme..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || isRegenerating || !topic.trim() || Boolean(user && tokens <= 0)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              user && tokens <= 0
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <ButtonLoader />
                <span className="ml-2">Generating...</span>
              </div>
            ) : !user ? 'Sign In to Generate' :
             tokens <= 0 ? '🪙 Buy Tokens to Generate' : 
             'Generate Memes'}
          </button>
          
          {results && results.length > 0 && (
            <button
              onClick={handleRegenerate}
              disabled={isLoading || isRegenerating || !topic.trim() || Boolean(user && tokens <= 0)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRegenerating ? (
                <div className="flex items-center">
                  <ButtonLoader />
                  <span className="ml-2">Regenerating...</span>
                </div>
              ) : user && tokens <= 0 ? 'Need Tokens' :
               'Try Different Template'}
            </button>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
            {error.includes('tokens') && (
              <button 
                onClick={() => router.push('/billing')}
                className="text-red-800 underline hover:no-underline font-medium mt-2 block"
              >
                🪙 Buy tokens now
              </button>
            )}
          </div>
        )}
        
        {/* Token Info for Users */}
        {user && tokens < 3 && tokens > 0 && !tokensLoading && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              ⚠️ You have <strong>{tokens} token{tokens !== 1 ? 's' : ''}</strong> remaining. 
              <button 
                onClick={() => router.push('/billing')}
                className="text-yellow-900 underline hover:no-underline font-medium ml-1"
              >
                Buy more tokens
              </button> to continue generating memes.
            </p>
          </div>
        )}
        
        {/* Token Display for Users */}
        {user && !tokensLoading && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-purple-800 text-sm">
                  🪙 <strong>{tokens} tokens</strong> available
                </span>
                <span className="text-purple-600 text-xs">
                  (1 token per meme generation)
                </span>
              </div>
              <button 
                onClick={() => router.push('/billing')}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition-colors"
              >
                Buy More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ad Banner - Show after results */}
      {results && results.length > 0 && (
        <div className="mb-8">
          <AdBanner
            allowedForAds={isAdSafe}
            slot="1234567890" // Replace with your actual AdSense slot ID
            format="auto"
            responsive={true}
            className="max-w-2xl mx-auto"
          />
        </div>
      )}

      {/* Results Section */}
      {results && results.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 text-center">
            Your Generated Memes {!isAdSafe && <span className="text-sm text-red-600">(Ad-unsafe content)</span>}
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {result.imageUrl ? (
                    <img
                      src={result.imageUrl}
                      alt={result.caption}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400">No image generated</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-700 mb-2">{result.caption}</p>
                  <p className="text-xs text-gray-500 mb-3">Template: {result.templateId}</p>
                  
                  {/* Action Buttons */}
                  <div className="mb-3 space-y-3">
                    <FavoriteButton
                      memeUrl={result.imageUrl}
                      prompt={topic}
                      templateName={result.templateId}
                      caption={result.caption}
                      onFavoriteChange={(favorited) => {
                        // Optionally handle state changes
                        console.log('Favorite status changed:', favorited);
                      }}
                    />
                    
                    {/* Social Share Buttons */}
                    <SocialShareButtons
                      memeUrl={result.imageUrl}
                      caption={result.caption}
                      prompt={topic}
                      className="flex-wrap"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      templates.find(t => t.id === result.templateId)?.allowedForAds
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {templates.find(t => t.id === result.templateId)?.allowedForAds ? 'Ad-safe' : 'Ad-unsafe'}
                    </span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Loading State */}
      {(isLoading || isRegenerating) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <MemeGenerationLoader
            message={isRegenerating ? '🎲 Finding a different template...' : '🎨 Generating your memes...'}
          />
          {isRegenerating && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Using AI to pick a better template for your topic!
              </p>
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="mt-4 text-center space-y-2">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce mr-2"></div>
                  Analyzing topic
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce mr-2" style={{animationDelay: '0.1s'}}></div>
                  Selecting templates
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce mr-2" style={{animationDelay: '0.2s'}}></div>
                  Creating memes
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!results && !isLoading && !isRegenerating && (
        <div className="text-center py-12 text-gray-500">
          {authLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Create Amazing Memes?
              </h3>
              <p className="text-gray-600 mb-6">
                Sign in to start generating hilarious, AI-powered memes instantly!
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get Started - It's Free! 🚀
              </button>
            </div>
          ) : (
            <p>Enter a topic above to generate memes!</p>
          )}
        </div>
      )}

      {/* Bottom Ad Banner - Always show (for ad-safe content or premium CTA) */}
      <div className="mt-12">
        <AdBanner
          allowedForAds={true} // Always show bottom ads or premium CTA
          slot="0987654321" // Different slot for bottom banner
          format="horizontal"
          responsive={true}
          className="max-w-4xl mx-auto"
        />
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default MemeGenerator;
