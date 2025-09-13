import React from 'react';
import { toast } from 'react-hot-toast';

interface SocialShareButtonsProps {
  memeUrl: string;
  caption: string;
  prompt: string;
  className?: string;
}

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  memeUrl,
  caption,
  prompt,
  className = ''
}) => {
  const shareToReddit = () => {
    try {
      // Create Reddit share URL
      const title = `${caption} - Made with AI`;
      const redditUrl = `https://www.reddit.com/submit?${
        new URLSearchParams({
          url: memeUrl,
          title: title
        })
      }`;
      
      window.open(redditUrl, '_blank', 'noopener,noreferrer');
      toast.success('Opening Reddit share...');
    } catch (error) {
      console.error('Reddit share failed:', error);
      toast.error('Failed to share to Reddit');
    }
  };

  const shareToTwitter = () => {
    try {
      // Create Twitter share URL
      const tweetText = `${caption}\n\nMade with MemeMe AI! 🤖\n\n#memes #AI #funny #memegenerator`;
      const twitterUrl = `https://twitter.com/intent/tweet?${
        new URLSearchParams({
          text: tweetText,
          url: memeUrl
        })
      }`;
      
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
      toast.success('Opening Twitter share...');
    } catch (error) {
      console.error('Twitter share failed:', error);
      toast.error('Failed to share to Twitter');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(memeUrl);
      toast.success('Meme link copied to clipboard!');
    } catch (error) {
      console.error('Copy failed:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = memeUrl;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Meme link copied to clipboard!');
      } catch (fallbackError) {
        toast.error('Failed to copy link');
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Reddit Share */}
      <button
        onClick={shareToReddit}
        className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        title="Share on Reddit"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.238 15.348c.085-.297.154-.587.154-.937 0-1.094-.892-1.984-1.984-1.984s-1.984.892-1.984 1.984c0 .35.069.64.154.937 1.191.085 1.471.085 2.66 0zM4.082 9.196c-1.108 0-2.008.9-2.008 2.008 0 1.108.9 2.008 2.008 2.008 1.108 0 2.008-.9 2.008-2.008 0-1.108-.9-2.008-2.008-2.008zM20.204 11.204c0-1.108-.9-2.008-2.008-2.008s-2.008.9-2.008 2.008c0 1.108.9 2.008 2.008 2.008s2.008-.9 2.008-2.008zM8.82 9.196c0-1.108.9-2.008 2.008-2.008s2.008.9 2.008 2.008-.9 2.008-2.008 2.008-2.008-.9-2.008-2.008zM9.196 4.082c0-1.108.9-2.008 2.008-2.008s2.008.9 2.008 2.008-.9 2.008-2.008 2.008-2.008-.9-2.008-2.008zM13.012 18.06c.85.004 1.628-.092 2.272-.227l-.146-.59c-.537.109-1.27.227-2.272-.227-.85-.379-1.65-.852-2.272-.227-.537.537-.379 1.177.146.59.537-.537 1.177-.379 1.650-.227.537.146 1.177.537 1.650.227.537-.379.537-1.177.146-1.65-.379-.537-1.177-.379-1.65-.227-.537.146-1.177.537-1.65.227z"/>
        </svg>
        Reddit
      </button>

      {/* Twitter Share */}
      <button
        onClick={shareToTwitter}
        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        title="Share on Twitter"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        Twitter
      </button>

      {/* Copy Link */}
      <button
        onClick={copyLink}
        className="flex items-center gap-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        title="Copy meme link"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </button>

      {/* More Share Options */}
      <button
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: `${caption} - Made with AI`,
              text: `Check out this hilarious meme I made with MemeMe AI!`,
              url: memeUrl
            }).then(() => {
              toast.success('Thanks for sharing!');
            }).catch(() => {
              // User cancelled or sharing failed
            });
          } else {
            // Fallback - copy to clipboard
            copyLink();
          }
        }}
        className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        title="More sharing options"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
        Share
      </button>
    </div>
  );
};