/**
 * Prices Store (Zustand)
 * Global state management for token prices
 */

import { create } from 'zustand';
import type { PriceData } from '../types/prices.js';
import { fetchPricesFromAPI, processPriceData } from '../utils/prices.js';

export interface PricesState {
  // Prices map: symbol -> price (e.g., { "KUB": 0.9435, "USD₮": 1.0 })
  prices: Record<string, number>;
  
  // Full price data: symbol -> complete PriceData object
  priceData: Record<string, PriceData>;
  
  // Loading state
  isLoading: boolean;
  
  // Error message
  error: string | null;
  
  // Whether prices have been fetched at least once
  hasFetched: boolean;
  
  // Fetch prices from API
  fetchPrices: () => Promise<void>;
  
  // Reset error state
  clearError: () => void;
}

export const usePricesStore = create<PricesState>((set) => ({
  prices: {},
  priceData: {},
  isLoading: false,
  error: null,
  hasFetched: false,
  
  fetchPrices: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetchPricesFromAPI();
      
      if (!response.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      const { prices, priceData } = processPriceData(response.data);
      
      set({
        prices,
        priceData,
        isLoading: false,
        error: null,
        hasFetched: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },
  
  clearError: () => {
    set({ error: null });
  },
}));