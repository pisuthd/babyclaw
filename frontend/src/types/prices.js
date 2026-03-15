/**
 * Price Data Types
 * Types for the price API response
 */

/**
 * @typedef {Object} PriceData
 * @property {string} symbol
 * @property {number} price
 * @property {number} percent_change_24h
 * @property {number} market_cap
 * @property {number} volume_24h
 * @property {string} last_updated
 * @property {string} timestamp
 */

/**
 * @typedef {Object} PriceApiResponse
 * @property {boolean} success
 * @property {PriceData[]} data
 * @property {number} count
 */
