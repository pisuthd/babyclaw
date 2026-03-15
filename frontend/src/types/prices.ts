/**
 * Price Data Types
 * Types for the price API response
 */

export interface PriceData {
  symbol: string;
  price: number;
  percent_change_24h: number;
  market_cap: number;
  volume_24h: number;
  last_updated: string;
  timestamp: string;
}

export interface PriceApiResponse {
  success: boolean;
  data: PriceData[];
  count: number;
}