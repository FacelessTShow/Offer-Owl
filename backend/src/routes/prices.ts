import express from 'express';
import { retailerService } from '../services/retailerIntegration';
import { redis } from '../config/redis';
import { io } from '../server';
import { logger } from '../utils/logger';
import { auth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for price comparison endpoints
const priceCompareLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many price comparison requests, please try again later.'
});

const monitoringLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 monitoring requests per hour
  message: 'Too many monitoring requests, please try again later.'
});

/**
 * POST /api/prices/compare
 * Compare prices across all retailers for a specific product
 */
router.post('/compare', priceCompareLimit, async (req, res) => {
  try {
    const { productId, searchTerm, retailers, country } = req.body;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
    }

    logger.info(`Starting price comparison for: ${searchTerm}`);

    // Check cache first
    const cacheKey = `comparison:${Buffer.from(searchTerm).toString('base64')}:${country || 'all'}`;
    const cachedResults = await redis.get(cacheKey);

    if (cachedResults) {
      logger.info(`Returning cached results for: ${searchTerm}`);
      return res.json({
        success: true,
        prices: JSON.parse(cachedResults),
        fromCache: true,
        timestamp: new Date().toISOString()
      });
    }

    // Get prices from all retailers
    const prices = await retailerService.getMultiRetailerPrices(
      productId || generateProductId(searchTerm),
      searchTerm
    );

    // Filter by country if specified
    const filteredPrices = country 
      ? prices.filter(price => {
          const retailerConfig = retailerService.getRetailersList()
            .find(r => r.name === price.retailer);
          return retailerConfig?.country === country;
        })
      : prices;

    // Add additional metadata
    const enrichedPrices = await enrichPriceData(filteredPrices, searchTerm);

    // Cache results for 30 minutes
    await redis.setex(cacheKey, 1800, JSON.stringify(enrichedPrices));

    // Broadcast to real-time listeners
    io.emit('price_comparison_complete', {
      searchTerm,
      priceCount: enrichedPrices.length,
      lowestPrice: enrichedPrices.length > 0 ? Math.min(...enrichedPrices.map(p => p.price)) : null
    });

    res.json({
      success: true,
      prices: enrichedPrices,
      fromCache: false,
      timestamp: new Date().toISOString(),
      metadata: {
        totalRetailers: enrichedPrices.length,
        lowestPrice: enrichedPrices.length > 0 ? Math.min(...enrichedPrices.map(p => p.price)) : null,
        highestPrice: enrichedPrices.length > 0 ? Math.max(...enrichedPrices.map(p => p.price)) : null,
        averagePrice: enrichedPrices.length > 0 
          ? enrichedPrices.reduce((sum, p) => sum + p.price, 0) / enrichedPrices.length 
          : null
      }
    });

  } catch (error) {
    logger.error('Error in price comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare prices'
    });
  }
});

/**
 * POST /api/prices/single
 * Get price from a specific retailer
 */
router.post('/single', priceCompareLimit, async (req, res) => {
  try {
    const { retailer, productUrl, searchTerm } = req.body;

    if (!retailer || (!productUrl && !searchTerm)) {
      return res.status(400).json({
        success: false,
        error: 'Retailer and either productUrl or searchTerm is required'
      });
    }

    let price;
    if (productUrl) {
      price = await retailerService.scrapeProductPrice(retailer, productUrl);
    } else {
      // Search for product first, then get price
      const prices = await retailerService.getMultiRetailerPrices(
        generateProductId(searchTerm),
        searchTerm
      );
      price = prices.find(p => p.retailer === retailer);
    }

    if (!price) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or price unavailable'
      });
    }

    res.json({
      success: true,
      price,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting single price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price'
    });
  }
});

/**
 * GET /api/prices/retailers
 * Get list of all supported retailers
 */
router.get('/retailers', async (req, res) => {
  try {
    const retailers = retailerService.getRetailersList();
    
    const groupedRetailers = {
      US: retailers.filter(r => r.country === 'US'),
      BR: retailers.filter(r => r.country === 'BR')
    };

    res.json({
      success: true,
      retailers: groupedRetailers,
      total: retailers.length
    });

  } catch (error) {
    logger.error('Error getting retailers list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get retailers list'
    });
  }
});

/**
 * POST /api/prices/monitor/start
 * Start real-time price monitoring for a product
 */
router.post('/monitor/start', auth, monitoringLimit, async (req, res) => {
  try {
    const { productId, searchTerm, alertThreshold, retailers } = req.body;
    const userId = req.user.id;

    if (!productId || !searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Product ID and search term are required'
      });
    }

    // Start monitoring service
    await retailerService.startRealTimePriceMonitoring(productId, searchTerm);

    // Store user's monitoring preference
    const monitoringData = {
      userId,
      productId,
      searchTerm,
      alertThreshold: alertThreshold || null,
      retailers: retailers || 'all',
      startedAt: new Date().toISOString(),
      isActive: true
    };

    await redis.setex(
      `monitoring:${userId}:${productId}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(monitoringData)
    );

    // Add to user's active monitoring list
    const userMonitoringKey = `user_monitoring:${userId}`;
    await redis.sadd(userMonitoringKey, productId);
    await redis.expire(userMonitoringKey, 24 * 60 * 60);

    logger.info(`Started monitoring for user ${userId}, product ${productId}`);

    res.json({
      success: true,
      message: 'Real-time monitoring started',
      productId,
      monitoringData
    });

  } catch (error) {
    logger.error('Error starting price monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring'
    });
  }
});

/**
 * POST /api/prices/monitor/stop
 * Stop real-time price monitoring for a product
 */
router.post('/monitor/stop', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    // Stop monitoring service
    await retailerService.stopRealTimePriceMonitoring(productId);

    // Remove from user's monitoring
    await redis.del(`monitoring:${userId}:${productId}`);
    await redis.srem(`user_monitoring:${userId}`, productId);

    logger.info(`Stopped monitoring for user ${userId}, product ${productId}`);

    res.json({
      success: true,
      message: 'Real-time monitoring stopped',
      productId
    });

  } catch (error) {
    logger.error('Error stopping price monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring'
    });
  }
});

/**
 * GET /api/prices/monitor/active
 * Get user's active price monitoring
 */
router.get('/monitor/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userMonitoringKey = `user_monitoring:${userId}`;
    
    const activeProductIds = await redis.smembers(userMonitoringKey);
    const activeMonitoring = [];

    for (const productId of activeProductIds) {
      const monitoringData = await redis.get(`monitoring:${userId}:${productId}`);
      if (monitoringData) {
        activeMonitoring.push(JSON.parse(monitoringData));
      }
    }

    res.json({
      success: true,
      monitoring: activeMonitoring,
      count: activeMonitoring.length
    });

  } catch (error) {
    logger.error('Error getting active monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active monitoring'
    });
  }
});

/**
 * GET /api/prices/history/:productId
 * Get price history for a specific product
 */
router.get('/history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { timeframe = '30d', retailer } = req.query;

    // Get cached price history
    const historyKey = `price_history:${productId}:${timeframe}:${retailer || 'all'}`;
    const cachedHistory = await redis.get(historyKey);

    if (cachedHistory) {
      return res.json({
        success: true,
        history: JSON.parse(cachedHistory),
        fromCache: true
      });
    }

    // Get current prices for comparison
    const currentPrices = await retailerService.getCachedPrices(productId);
    
    // Generate mock historical data (in real implementation, this would come from database)
    const history = generatePriceHistory(currentPrices, timeframe as string, retailer as string);

    // Cache for 1 hour
    await redis.setex(historyKey, 3600, JSON.stringify(history));

    res.json({
      success: true,
      history,
      fromCache: false
    });

  } catch (error) {
    logger.error('Error getting price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price history'
    });
  }
});

/**
 * POST /api/prices/bulk-compare
 * Compare prices for multiple products at once
 */
router.post('/bulk-compare', priceCompareLimit, async (req, res) => {
  try {
    const { products, country } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Products array is required'
      });
    }

    if (products.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 products allowed per bulk comparison'
      });
    }

    const results = [];

    // Process products in parallel with a concurrency limit
    const concurrencyLimit = 3;
    const chunks = [];
    for (let i = 0; i < products.length; i += concurrencyLimit) {
      chunks.push(products.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (product) => {
        try {
          const prices = await retailerService.getMultiRetailerPrices(
            product.id || generateProductId(product.searchTerm),
            product.searchTerm
          );

          const filteredPrices = country 
            ? prices.filter(price => {
                const retailerConfig = retailerService.getRetailersList()
                  .find(r => r.name === price.retailer);
                return retailerConfig?.country === country;
              })
            : prices;

          return {
            productId: product.id,
            searchTerm: product.searchTerm,
            prices: await enrichPriceData(filteredPrices, product.searchTerm),
            success: true
          };
        } catch (error) {
          logger.error(`Error in bulk compare for ${product.searchTerm}:`, error);
          return {
            productId: product.id,
            searchTerm: product.searchTerm,
            prices: [],
            success: false,
            error: error.message
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in bulk price comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk comparison'
    });
  }
});

/**
 * GET /api/prices/trending
 * Get trending products and their prices
 */
router.get('/trending', async (req, res) => {
  try {
    const { country = 'all', category, limit = 20 } = req.query;

    // Get trending products from cache or generate based on search patterns
    const trendingKey = `trending:${country}:${category || 'all'}`;
    let trendingProducts = await redis.get(trendingKey);

    if (!trendingProducts) {
      // Generate trending products (in real implementation, this would be based on user analytics)
      trendingProducts = await generateTrendingProducts(country as string, category as string, parseInt(limit as string));
      await redis.setex(trendingKey, 3600, JSON.stringify(trendingProducts)); // Cache for 1 hour
    } else {
      trendingProducts = JSON.parse(trendingProducts);
    }

    res.json({
      success: true,
      trending: trendingProducts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting trending products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending products'
    });
  }
});

// Helper Functions

function generateProductId(searchTerm: string): string {
  return Buffer.from(searchTerm.toLowerCase().replace(/\s+/g, '-')).toString('base64').slice(0, 16);
}

async function enrichPriceData(prices: any[], searchTerm: string) {
  // Add additional metadata to price data
  return prices.map((price, index) => ({
    ...price,
    isLowest: index === 0, // Assuming prices are sorted by price
    priceRank: index + 1,
    savingsFromHighest: prices.length > 1 ? prices[prices.length - 1].price - price.price : 0,
    searchTerm
  }));
}

function generatePriceHistory(currentPrices: any[], timeframe: string, retailer?: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const history = [];

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayHistory = currentPrices
      .filter(price => !retailer || price.retailer === retailer)
      .map(price => ({
        ...price,
        price: price.price * (0.8 + Math.random() * 0.4), // Simulate price variation
        date: date.toISOString()
      }));

    history.push(...dayHistory);
  }

  return history;
}

async function generateTrendingProducts(country: string, category: string, limit: number) {
  // Mock trending products - in real implementation, this would be based on analytics
  const trendingTerms = [
    'iPhone 15 Pro',
    'Samsung Galaxy S24',
    'MacBook Air M3',
    'PlayStation 5',
    'Nintendo Switch',
    'iPad Pro',
    'AirPods Pro',
    'Tesla Model 3',
    'Apple Watch Series 9',
    'Google Pixel 8'
  ];

  const trending = [];
  
  for (let i = 0; i < Math.min(limit, trendingTerms.length); i++) {
    const term = trendingTerms[i];
    const productId = generateProductId(term);
    
    // Get cached prices or generate mock data
    const cachedPrices = await retailerService.getCachedPrices(productId);
    
    trending.push({
      productId,
      searchTerm: term,
      rank: i + 1,
      priceRange: cachedPrices.length > 0 
        ? `$${Math.min(...cachedPrices.map(p => p.price)).toFixed(0)} - $${Math.max(...cachedPrices.map(p => p.price)).toFixed(0)}`
        : '$999 - $1299',
      retailerCount: cachedPrices.length || 8,
      category: category || 'electronics'
    });
  }

  return trending;
}

export default router;