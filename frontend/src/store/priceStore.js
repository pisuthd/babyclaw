/**
 * Prices Store (Zustand)
 * Global state management for token prices
 */

import { create } from 'zustand';
import { fetchPricesFromAPI, processPriceData } from '../utils/prices.js';

export const usePricesStore = create((set) => ({
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