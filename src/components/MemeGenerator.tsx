import React, { useState } from 'react';
import AdBanner, { useAdSafety } from './AdBanner';
import AuthModal from './AuthModal';
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

const MemeGenerator: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<MemeResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [usedTemplateIds, setUsedTemplateIds] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const templates: Template[] = templatesData.templates;
  const isAdSafe = useAdSafety(results, templates);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate memes');
      }

      const data = await response.json();
      setResults(data.results);
      
      // Track used template IDs for regeneration
      if (data.results && data.results.length > 0) {
        const templateIds = [...new Set(data.results.map((r: MemeResult) => r.templateId))];
        setUsedTemplateIds(templateIds);
      }
    } catch (error) {
      console.error('Error generating memes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!results || results.length === 0 || !topic.trim()) return;
    
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
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
          usedTemplateIds 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate memes');
      }

      const data = await response.json();
      setResults(data.results);
      
      // Add the new template ID to used templates
      setUsedTemplateIds(prev => [...prev, data.newTemplateId]);
      
    } catch (error) {
      console.error('Error regenerating memes:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          MemeMe Generator
        </h1>
        <p className="text-xl text-gray-600">
          Create hilarious memes with AI-powered captions
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic for your meme..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || isRegenerating || !topic.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Memes'}
          </button>
          
          {results && results.length > 0 && (
            <button
              onClick={handleRegenerate}
              disabled={isLoading || isRegenerating || !topic.trim()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRegenerating ? 'Regenerating...' : 'Try Different Template'}
            </button>
          )}
        </div>
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
                  <p className="text-xs text-gray-500">Template: {result.templateId}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      templates.find(t => t.id === result.templateId)?.allowedForAds
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {templates.find(t => t.id === result.templateId)?.allowedForAds ? 'Ad-safe' : 'Ad-unsafe'}
                    </span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isRegenerating) && (
        <div className="text-center py-12">
          <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
            isRegenerating ? 'border-green-600' : 'border-blue-600'
          }`}></div>
          <p className="mt-2 text-gray-600">
            {isRegenerating ? '🎲 Finding a different template...' : 'Generating your memes...'}
          </p>
          {isRegenerating && (
            <p className="mt-1 text-sm text-gray-500">
              Using AI to pick a better template for your topic!
            </p>
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
