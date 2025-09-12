import Head from 'next/head';
import { useState, useEffect } from 'react';
import type { Template } from '../types';

// Import types from the API route
interface GenerateResult {
  caption: string;
  imageUrl: string;
  templateId: string;
}

interface GenerateResponse {
  results: GenerateResult[];
}

interface ErrorResponse {
  error: string;
}
import { ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [topic, setTopic] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{caption: string, imageUrl: string, templateId: string}> | null>(null);
  
  // Load templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        setError('Failed to load templates. Please try again later.');
      }
    };

    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setResults(null);
    setIsLoading(true);
    
    try {
      // Validate input
      if (!topic.trim()) {
        throw new Error('Please enter a topic');
      }
      
      // Make API request
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          templateId: selectedTemplateId || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (data.error === 'input_moderated') {
          throw new Error('Your topic contains inappropriate content. Please try a different topic.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(data.error || 'Failed to generate memes');
        }
      }
      
      // Set results
      setResults((data as GenerateResponse).results);
    } catch (error) {
      console.error('Error generating memes:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to download image
  const downloadImage = (imageUrl: string, caption: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `meme-${caption.substring(0, 10).replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to share image
  const shareImage = async (imageUrl: string, caption: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this meme!',
          text: caption,
          url: imageUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(imageUrl);
      alert('Image URL copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Head>
        <title>MeMeMe - AI Meme Generator</title>
        <meta name="description" content="Generate hilarious memes with AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-6xl mx-auto py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">MeMeMe</h1>
        <p className="text-center mb-8 text-lg">Generate hilarious memes with AI</p>
        
        {/* Meme Generation Form */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="topic" className="block text-sm font-medium mb-2">
                Topic or Idea
              </label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a topic for your meme (e.g., 'cats in space')"
                disabled={isLoading}
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="template" className="block text-sm font-medium mb-2">
                Meme Template (Optional)
              </label>
              <select
                id="template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Leave default for AI to choose the best template
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-300 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Memes...
                </>
              ) : (
                'Generate Memes'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}

        {/* Results Grid */}
        {results && results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">Your Generated Memes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-[1.02]">
                  <img 
                    src={result.imageUrl} 
                    alt={`Meme: ${result.caption}`} 
                    className="w-full h-auto" 
                    loading="lazy"
                  />
                  <div className="p-4">
                    <p className="text-sm mb-4 line-clamp-2">{result.caption}</p>
                    <div className="flex justify-between">
                      <button
                        onClick={() => downloadImage(result.imageUrl, result.caption)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => shareImage(result.imageUrl, result.caption)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ShareIcon className="h-4 w-4 mr-1" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center mt-12 mb-6 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} MeMeMe - All rights reserved
      </footer>
    </div>
  );
}