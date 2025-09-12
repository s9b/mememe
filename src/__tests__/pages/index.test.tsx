import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../index';

// Mock the heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ArrowDownTrayIcon: () => <span data-testid="download-icon">Download Icon</span>,
  ShareIcon: () => <span data-testid="share-icon">Share Icon</span>,
}));

// Mock templates response
const mockTemplates = {
  templates: [
    { id: 'template1', name: 'Template 1' },
    { id: 'template2', name: 'Template 2' },
  ]
};

// Mock successful generate response
const mockGenerateSuccess = {
  results: [
    {
      caption: 'This is a funny meme about cats',
      imageUrl: 'https://example.com/meme1.jpg',
      templateId: 'template1'
    },
    {
      caption: 'Another hilarious meme about cats',
      imageUrl: 'https://example.com/meme2.jpg',
      templateId: 'template2'
    }
  ]
};

// Setup for each test
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Mock templates fetch
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/templates') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTemplates)
      });
    }
    
    if (url === '/api/generate') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGenerateSuccess)
      });
    }
    
    return Promise.reject(new Error(`Unhandled fetch request to ${url}`));
  });
});

// Create a custom render function for Next.js pages
const customRender = (ui: React.ReactElement) => {
  return render(ui);
};


// Mock the navigator.share API
Object.defineProperty(global.navigator, 'share', {
  value: jest.fn().mockImplementation(() => Promise.resolve()),
  configurable: true
});

// Mock the navigator.clipboard API
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: jest.fn().mockImplementation(() => Promise.resolve()) },
  configurable: true
});

// Mock window.alert
global.alert = jest.fn();

describe('Home Page', () => {
  it('renders the page title and form elements', async () => {
    customRender(<Home />);
    
    // Check for title
    expect(screen.getByText('MeMeMe')).toBeInTheDocument();
    
    // Check for form elements
    expect(screen.getByLabelText(/topic or idea/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meme template/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate memes/i })).toBeInTheDocument();
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
    });
  });
  
  it('displays generated memes after successful submission', async () => {
    customRender(<Home />);
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/topic or idea/i), { target: { value: 'cats' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /generate memes/i }));
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Your Generated Memes')).toBeInTheDocument();
    });
    
    // Check for meme content
    expect(screen.getByText('This is a funny meme about cats')).toBeInTheDocument();
    expect(screen.getByText('Another hilarious meme about cats')).toBeInTheDocument();
    
    // Check for download and share buttons
    expect(screen.getAllByTestId('download-icon')).toHaveLength(2);
    expect(screen.getAllByTestId('share-icon')).toHaveLength(2);
  });
  
  it('shows error message for inappropriate content', async () => {
    // Mock error response for inappropriate content
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === '/api/templates') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplates)
        });
      }
      return Promise.resolve();
    });
    
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === '/api/generate') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'input_moderated' })
        });
      }
      return Promise.resolve();
    });
    
    customRender(<Home />);
    
    // Fill the form with inappropriate content
    fireEvent.change(screen.getByLabelText(/topic or idea/i), { target: { value: 'inappropriate content' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /generate memes/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/your topic contains inappropriate content/i)).toBeInTheDocument();
    });
  });
});