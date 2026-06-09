// eslint-disable-next-line no-unused-vars
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { dbService } from './services/db';
import { triageInput } from './services/ai';

vi.mock('./services/db', () => ({
  dbService: {
    queryItems: vi.fn(),
    saveItem: vi.fn(),
    deleteItem: vi.fn(),
  }
}));

vi.mock('./services/ai', () => ({
  triageInput: vi.fn(),
}));

vi.mock('./services/speech', () => ({
  createSpeechRecognition: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
}));

// Global mock for IntersectionObserver
window.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbService.queryItems.mockResolvedValue([]);
  });

  it('renders the header and empty state initially', async () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <App />
      </GoogleOAuthProvider>
    );
    expect(screen.getByText('Blitz')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Your mind, structured instantly/)).toBeInTheDocument();
    });
  });

  it('loads items from db and renders them', async () => {
    dbService.queryItems.mockResolvedValue([{
      id: '1',
      raw_text: 'Test item',
      category: 'STATIC_INTEL',
      priority: 'LOW',
      created_at: Date.now(),
      metadata_json: '{}'
    }]);

    render(
      <GoogleOAuthProvider clientId="test">
        <App />
      </GoogleOAuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test item')).toBeInTheDocument();
    });
  });

  it('submits text and creates a new item', async () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <App />
      </GoogleOAuthProvider>
    );
    
    const mockNewItem = {
      id: '2',
      raw_text: 'Buy milk',
      category: 'ACTION_ITEM',
      priority: 'NORMAL',
      created_at: Date.now(),
      metadata_json: '{}'
    };
    
    triageInput.mockResolvedValue(mockNewItem);

    const input = screen.getByPlaceholderText('Capture thought...');
    fireEvent.change(input, { target: { value: 'Buy milk' } });
    
    // Check if send button becomes visible and click it
    // We just find the form and submit it
    const form = input.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(triageInput).toHaveBeenCalledWith('Buy milk');
      expect(dbService.saveItem).toHaveBeenCalledWith(mockNewItem);
      expect(screen.getByText('Buy milk')).toBeInTheDocument();
    });
  });

  it('processes PWA share target parameters on mount', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, search: '?text=Buy%20milk&title=Shopping' };

    const mockNewItem = {
      id: 'share_1',
      raw_text: '[SHARED VIA DEVICE]: Shopping Buy milk',
      category: 'ACTION_ITEM',
      priority: 'NORMAL',
      created_at: Date.now(),
      metadata_json: '{}'
    };
    triageInput.mockResolvedValue(mockNewItem);

    render(
      <GoogleOAuthProvider clientId="test">
        <App />
      </GoogleOAuthProvider>
    );

    await waitFor(() => {
      expect(triageInput).toHaveBeenCalledWith('[SHARED VIA DEVICE]: Shopping Buy milk');
      expect(dbService.saveItem).toHaveBeenCalledWith(mockNewItem);
    });

    window.location = originalLocation;
  });
});
