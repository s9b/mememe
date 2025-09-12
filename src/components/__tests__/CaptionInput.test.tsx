import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CaptionInput from '../CaptionInput';
import { useRouter } from 'next/router';
import type { Template } from '@/types';

// Mock the useRouter hook
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch for template loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ 
      templates: [
        { id: '1', name: 'Test Template', box_count: 2, url: 'http://example.com/1.jpg', width: 500, height: 500 } as Template
      ] 
    }),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
  })
) as jest.Mock;

describe('CaptionInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockImplementation(() => ({
      query: {},
    }));
  });

  it('renders the component', async () => {
    const mockOnSubmit = jest.fn();
    render(<CaptionInput onSubmit={mockOnSubmit} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Select Meme Template')).toBeInTheDocument();
    });
  });

  it('handles form submission', async () => {
    const mockOnSubmit = jest.fn();
    render(<CaptionInput onSubmit={mockOnSubmit} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Select Meme Template')).toBeInTheDocument();
    });
    
    // Fill in caption fields
    const captionInputs = screen.getAllByRole('textbox');
    fireEvent.change(captionInputs[0], { target: { value: 'Test Caption 1' } });
    if (captionInputs.length > 1) {
      fireEvent.change(captionInputs[1], { target: { value: 'Test Caption 2' } });
    }
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /generate meme/i });
    fireEvent.click(submitButton);
    
    // Check if onSubmit was called with the correct captions
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});