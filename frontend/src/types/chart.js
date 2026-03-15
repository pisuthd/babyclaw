/**
 * @typedef {Object} HistoricalPricePoint
 * @property {string} timestamp
 * @property {number} price
 * @property {number} market_cap
 * @property {number} volume_24h
 * @property {string} last_updated
 */

/**
 * @typedef {Object} HistoricalPriceResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {string} data.symbol
 * @property {string} data.period
 * @property {HistoricalPricePoint[]} data.prices
 * @property {number} count
 */

/**
 * @typedef {Object} ChartDataPoint
 * @property {string} time
 * @property {number} price
 * @property {number} timestamp
 */

/**
 * @typedef {'1D' | '1W' | '1M' | '1Y'} TimeRange
 */

/**
 * @typedef {Object} UseHistoricalPricesOptions
 * @property {string} symbol
 * @property {TimeRange} [timeRange]
 * @property {boolean} [enabled]
 */

/**
 * @typedef {Object} UseHistoricalPricesReturn
 * @property {ChartDataPoint[]} data
 * @property {boolean} isLoading
 * @property {string|null} error
 * @property {Function} refetch
 * @property {number} currentPrice
 * @property {number} priceChange
 * @property {number} priceChangePercent
 * @property {number} periodHigh
 * @property {number} periodLow
 */
