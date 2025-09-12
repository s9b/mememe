import React, { useEffect } from 'react';
import Link from 'next/link';

interface AdBannerProps {
  allowedForAds: boolean;
  slot?: string;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
  showPremiumCTA?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdBanner: React.FC<AdBannerProps> = ({
  allowedForAds,
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  showPremiumCTA = true,
}) => {
  const adSenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  useEffect(() => {
    if (allowedForAds && adSenseId && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, [allowedForAds, adSenseId]);

  // Don't render anything if content is not ad-safe
  if (!allowedForAds) {
    if (showPremiumCTA) {
      return <PremiumCTA />;
    }
    return null;
  }

  // Don't render ads if AdSense is not configured
  if (!adSenseId || !slot) {
    if (showPremiumCTA) {
      return <PremiumCTA />;
    }
    return <AdPlaceholder />;
  }

  return (
    <div className={`ad-banner ${className}`}>
      <div className="text-xs text-gray-500 text-center mb-1">
        Advertisement
      </div>
      <ins
        className="adsbygoogle"
        style={{ 
          display: 'block',
          textAlign: 'center',
        }}
        data-ad-client={adSenseId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

// Premium CTA component
const PremiumCTA: React.FC = () => (
  <div className="premium-cta bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white text-center shadow-lg">
    <div className="mb-2">
      <svg 
        className="w-8 h-8 mx-auto mb-2" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.856.048l-1.179-4.456L6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
    <h3 className="text-lg font-bold mb-2">Go Premium!</h3>
    <p className="text-sm mb-4 opacity-90">
      Remove ads and unlock unlimited meme generation with premium templates
    </p>
    <Link 
      href="/pricing" 
      className="inline-block bg-white text-purple-600 font-semibold py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors duration-200"
    >
      Upgrade Now
    </Link>
  </div>
);

// Ad placeholder for development/testing
const AdPlaceholder: React.FC = () => (
  <div className="ad-placeholder bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
    <div className="text-gray-500">
      <svg 
        className="w-12 h-12 mx-auto mb-2" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
          clipRule="evenodd" 
        />
      </svg>
      <p className="text-sm font-medium">Advertisement Space</p>
      <p className="text-xs opacity-75">Configure NEXT_PUBLIC_ADSENSE_ID to show ads</p>
    </div>
  </div>
);

export default AdBanner;

// Utility function to check if all generated results are ad-safe
export const checkAdSafety = (
  results: Array<{ templateId: string }>,
  templates: Array<{ id: string; allowedForAds: boolean }>
): boolean => {
  if (!results || results.length === 0) {
    return false;
  }

  return results.every(result => {
    const template = templates.find(t => t.id === result.templateId);
    return template?.allowedForAds === true;
  });
};

// Hook for checking ad safety based on template data
export const useAdSafety = (
  results: Array<{ templateId: string }> | null,
  templates: Array<{ id: string; allowedForAds: boolean }>
) => {
  if (!results || results.length === 0) {
    return false;
  }

  return checkAdSafety(results, templates);
};
