import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdBanner, { checkAdSafety, useAdSafety } from '../AdBanner';

// Mock Next.js router
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock window.adsbygoogle
const mockAdsByGoogle = [];
Object.defineProperty(window, 'adsbygoogle', {
  value: mockAdsByGoogle,
  writable: true,
});

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  mockAdsByGoogle.length = 0;
});

afterEach(() => {
  process.env = originalEnv;
});

describe('AdBanner', () => {
  const defaultProps = {
    isAdSafe: true,
    slot: '1234567890',
  };

  describe('AdSense Integration', () => {
    it('renders AdSense ad when content is ad-safe and AdSense is configured', () => {
      process.env.NEXT_PUBLIC_ADSENSE_ID = 'ca-pub-1234567890';

      render(<AdBanner {...defaultProps} />);

      expect(screen.getByText('Advertisement')).toBeInTheDocument();
      expect(document.querySelector('.adsbygoogle')).toBeInTheDocument();
      expect(document.querySelector('[data-ad-client="ca-pub-1234567890"]')).toBeInTheDocument();
      expect(document.querySelector('[data-ad-slot="1234567890"]')).toBeInTheDocument();
    });

    it('pushes to adsbygoogle array when component mounts', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_ID = 'ca-pub-1234567890';

      render(<AdBanner {...defaultProps} />);

      await waitFor(() => {
        expect(mockAdsByGoogle.length).toBe(1);
      });
    });

    it('handles different ad formats correctly', () => {
      process.env.NEXT_PUBLIC_ADSENSE_ID = 'ca-pub-1234567890';

      const { rerender } = render(<AdBanner {...defaultProps} format="rectangle" />);
      expect(document.querySelector('[data-ad-format="rectangle"]')).toBeInTheDocument();

      rerender(<AdBanner {...defaultProps} format="vertical" />);
      expect(document.querySelector('[data-ad-format="vertical"]')).toBeInTheDocument();
    });

    it('handles responsive ads correctly', () => {
      process.env.NEXT_PUBLIC_ADSENSE_ID = 'ca-pub-1234567890';

      const { rerender } = render(<AdBanner {...defaultProps} responsive={true} />);
      expect(document.querySelector('[data-full-width-responsive="true"]')).toBeInTheDocument();

      rerender(<AdBanner {...defaultProps} responsive={false} />);
      expect(document.querySelector('[data-full-width-responsive="false"]')).toBeInTheDocument();
    });
  });

  describe('Ad Safety Logic', () => {
    it('shows premium CTA when content is not ad-safe', () => {
      render(<AdBanner {...defaultProps} isAdSafe={false} />);

      expect(screen.getByText('Go Premium!')).toBeInTheDocument();
      expect(screen.getByText('Remove ads and unlock unlimited meme generation with premium templates')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Upgrade Now' })).toHaveAttribute('href', '/pricing');
    });

    it('returns null when content is not ad-safe and showPremiumCTA is false', () => {
      const { container } = render(
        <AdBanner {...defaultProps} isAdSafe={false} showPremiumCTA={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('shows ad placeholder when AdSense is not configured', () => {
      delete process.env.NEXT_PUBLIC_ADSENSE_ID;

      render(<AdBanner {...defaultProps} slot={undefined} />);

      expect(screen.getByText('Advertisement Space')).toBeInTheDocument();
      expect(screen.getByText('Configure NEXT_PUBLIC_ADSENSE_ID to show ads')).toBeInTheDocument();
    });

    it('shows premium CTA when AdSense is not configured and showPremiumCTA is true', () => {
      delete process.env.NEXT_PUBLIC_ADSENSE_ID;

      render(<AdBanner {...defaultProps} slot={undefined} showPremiumCTA={true} />);

      expect(screen.getByText('Go Premium!')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom CSS classes', () => {
      process.env.NEXT_PUBLIC_ADSENSE_ID = 'ca-pub-1234567890';

      render(<AdBanner {...defaultProps} className="custom-ad-class" />);

      expect(document.querySelector('.ad-banner.custom-ad-class')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles adsbygoogle push errors gracefully', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_ID = 'ca-pub-1234567890';
      
      // Mock console.error to track error calls
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock adsbygoogle to throw an error
      Object.defineProperty(window, 'adsbygoogle', {
        value: {
          push: jest.fn(() => {
            throw new Error('AdSense error');
          }),
        },
        configurable: true,
      });

      render(<AdBanner {...defaultProps} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('AdSense error:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('checkAdSafety', () => {
  const templates = [
    { id: '1', name: 'Safe Template', isAdSafe: true },
    { id: '2', name: 'Unsafe Template', isAdSafe: false },
    { id: '3', name: 'Another Safe Template', isAdSafe: true },
  ];

  it('returns true when all results are from ad-safe templates', () => {
    const results = [
      { templateId: '1' },
      { templateId: '3' },
    ];

    expect(checkAdSafety(results, templates)).toBe(true);
  });

  it('returns false when any result is from an ad-unsafe template', () => {
    const results = [
      { templateId: '1' },
      { templateId: '2' }, // unsafe template
      { templateId: '3' },
    ];

    expect(checkAdSafety(results, templates)).toBe(false);
  });

  it('returns false when results array is empty', () => {
    expect(checkAdSafety([], templates)).toBe(false);
  });

  it('returns false when results is null or undefined', () => {
    expect(checkAdSafety(null as any, templates)).toBe(false);
    expect(checkAdSafety(undefined as any, templates)).toBe(false);
  });

  it('returns false when template is not found', () => {
    const results = [{ templateId: 'non-existent' }];

    expect(checkAdSafety(results, templates)).toBe(false);
  });

  it('handles templates with undefined isAdSafe property', () => {
    const templatesWithUndefined = [
      { id: '1', name: 'Template', isAdSafe: undefined as any },
    ];
    const results = [{ templateId: '1' }];

    expect(checkAdSafety(results, templatesWithUndefined)).toBe(false);
  });
});

describe('useAdSafety', () => {
  const templates = [
    { id: '1', name: 'Safe Template', isAdSafe: true },
    { id: '2', name: 'Unsafe Template', isAdSafe: false },
  ];

  // Create a test component to test the hook
  const TestComponent: React.FC<{ results: any; templates: any }> = ({ results, templates }) => {
    const isAdSafe = useAdSafety(results, templates);
    return <div data-testid="ad-safety-result">{isAdSafe ? 'safe' : 'unsafe'}</div>;
  };

  it('returns true for ad-safe content', () => {
    const results = [{ templateId: '1' }];

    render(<TestComponent results={results} templates={templates} />);

    expect(screen.getByTestId('ad-safety-result')).toHaveTextContent('safe');
  });

  it('returns false for ad-unsafe content', () => {
    const results = [{ templateId: '2' }];

    render(<TestComponent results={results} templates={templates} />);

    expect(screen.getByTestId('ad-safety-result')).toHaveTextContent('unsafe');
  });

  it('returns false for null results', () => {
    render(<TestComponent results={null} templates={templates} />);

    expect(screen.getByTestId('ad-safety-result')).toHaveTextContent('unsafe');
  });

  it('returns false for empty results', () => {
    render(<TestComponent results={[]} templates={templates} />);

    expect(screen.getByTestId('ad-safety-result')).toHaveTextContent('unsafe');
  });
});

describe('Premium CTA Component', () => {
  it('renders with correct styling and content', () => {
    render(<AdBanner isAdSafe={false} />);

    const ctaContainer = document.querySelector('.premium-cta');
    expect(ctaContainer).toHaveClass('bg-gradient-to-r', 'from-purple-500', 'to-pink-500');

    expect(screen.getByText('Go Premium!')).toBeInTheDocument();
    expect(screen.getByText('Remove ads and unlock unlimited meme generation with premium templates')).toBeInTheDocument();
    
    const upgradeLink = screen.getByRole('link', { name: 'Upgrade Now' });
    expect(upgradeLink).toHaveAttribute('href', '/pricing');
    expect(upgradeLink).toHaveClass('bg-white', 'text-purple-600');
  });
});

describe('Ad Placeholder Component', () => {
  it('renders when AdSense is not configured and showPremiumCTA is false', () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_ID;

    render(<AdBanner isAdSafe={true} showPremiumCTA={false} />);

    expect(screen.getByText('Advertisement Space')).toBeInTheDocument();
    expect(screen.getByText('Configure NEXT_PUBLIC_ADSENSE_ID to show ads')).toBeInTheDocument();
    expect(document.querySelector('.ad-placeholder')).toBeInTheDocument();
  });
});