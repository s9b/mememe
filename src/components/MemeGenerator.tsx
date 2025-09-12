import React, { useState } from 'react';
import AdBanner, { useAdSafety } from './AdBanner';
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
  isAdSafe: boolean;
}

const MemeGenerator: React.FC = () => {
  const [results, setResults] = useState<MemeResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState('');

  const templates: Template[] = templatesData.templates;
  const isAdSafe = useAdSafety(results, templates);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

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
    } catch (error) {
      console.error('Error generating memes:', error);
    } finally {
      setIsLoading(false);
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
            disabled={isLoading || !topic.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Memes'}
          </button>
        </div>
      </div>

      {/* Ad Banner - Show after results */}
      {results && results.length > 0 && (
        <div className="mb-8">
          <AdBanner
            isAdSafe={isAdSafe}
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
                      templates.find(t => t.id === result.templateId)?.isAdSafe
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {templates.find(t => t.id === result.templateId)?.isAdSafe ? 'Ad-safe' : 'Ad-unsafe'}
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
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Generating your memes...</p>
        </div>
      )}

      {/* Empty State */}
      {!results && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <p>Enter a topic above to generate memes!</p>
        </div>
      )}

      {/* Bottom Ad Banner - Always show (for ad-safe content or premium CTA) */}
      <div className="mt-12">
        <AdBanner
          isAdSafe={true} // Always show bottom ads or premium CTA
          slot="0987654321" // Different slot for bottom banner
          format="horizontal"
          responsive={true}
          className="max-w-4xl mx-auto"
        />
      </div>
    </div>
  );
};

export default MemeGenerator;