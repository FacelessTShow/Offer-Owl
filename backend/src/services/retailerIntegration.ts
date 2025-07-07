import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { io } from '../server';

export interface RetailerConfig {
  name: string;
  country: 'US' | 'BR';
  type: 'api' | 'scraper';
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  selectors?: {
    price: string;
    title: string;
    image: string;
    availability: string;
    rating?: string;
    reviews?: string;
  };
  headers?: Record<string, string>;
}

export interface ProductPrice {
  retailer: string;
  price: number;
  originalPrice?: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited_stock';
  shipping?: number;
  shippingTime?: string;
  url: string;
  lastUpdated: Date;
  discount?: number;
  couponCode?: string;
}

export class RetailerIntegrationService {
  private retailers: Map<string, RetailerConfig> = new Map();
  private browserPool: puppeteer.Browser[] = [];
  private maxBrowsers = 5;
  
  constructor() {
    this.initializeRetailers();
    this.initializeBrowserPool();
  }

  private initializeRetailers() {
    // US Retailers
    const usRetailers: RetailerConfig[] = [
      {
        name: 'Amazon',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://www.amazon.com',
        rateLimit: 30,
        selectors: {
          price: '.a-price-whole, .a-offscreen',
          title: '#productTitle',
          image: '#landingImage',
          availability: '#availability span',
          rating: '.a-icon-alt',
          reviews: '#acrCustomerReviewText'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      },
      {
        name: 'Walmart',
        country: 'US',
        type: 'api',
        baseUrl: 'https://api.walmart.com/v1',
        apiKey: process.env.WALMART_API_KEY,
        rateLimit: 60
      },
      {
        name: 'eBay',
        country: 'US',
        type: 'api',
        baseUrl: 'https://api.ebay.com/ws/api.dll',
        apiKey: process.env.EBAY_API_KEY,
        rateLimit: 45
      },
      {
        name: 'Target',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://www.target.com',
        rateLimit: 25,
        selectors: {
          price: '[data-test="product-price"]',
          title: '[data-test="product-title"]',
          image: 'picture img',
          availability: '[data-test="availability-text"]'
        }
      },
      {
        name: 'Best Buy',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://www.bestbuy.com',
        rateLimit: 30,
        selectors: {
          price: '.sr-only:contains("current price"), .visually-hidden:contains("current price")',
          title: '.sku-title h1',
          image: '.primary-image img',
          availability: '.fulfillment-add-to-cart-button'
        }
      },
      {
        name: 'Newegg',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://www.newegg.com',
        rateLimit: 20,
        selectors: {
          price: '.price-current-num',
          title: '.product-title',
          image: '.product-view-img-original img',
          availability: '.flags-body'
        }
      },
      {
        name: 'AliExpress',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://www.aliexpress.us',
        rateLimit: 15,
        selectors: {
          price: '.notranslate',
          title: '.product-title-text',
          image: '.magnifier-image img',
          availability: '.quantity-info',
          rating: '.overview-rating-average',
          reviews: '.reviewer-reviews'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.aliexpress.us/'
        }
      },
      {
        name: 'Temu',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://www.temu.com',
        rateLimit: 20,
        selectors: {
          price: '[class*="price"], [data-testid*="price"]',
          title: '[class*="title"], h1',
          image: '[class*="image"] img, .swiper-slide img',
          availability: '[class*="stock"], [class*="inventory"]',
          rating: '[class*="rating"]',
          reviews: '[class*="review"]'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      },
      {
        name: 'Shopee',
        country: 'US',
        type: 'scraper',
        baseUrl: 'https://shopee.com',
        rateLimit: 15,
        selectors: {
          price: '[class*="price"]',
          title: '[class*="title"]',
          image: '.page-product__media img',
          availability: '[class*="stock"]',
          rating: '[class*="rating"]'
        }
      }
    ];

    // Brazilian Retailers
    const brRetailers: RetailerConfig[] = [
      {
        name: 'Magazine Luiza',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.magazineluiza.com.br',
        rateLimit: 30,
        selectors: {
          price: '[data-testid="price-value"]',
          title: '[data-testid="heading-product-title"]',
          image: '.sc-dOkuiw img',
          availability: '[data-testid="availability"]'
        }
      },
      {
        name: 'Submarino',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.submarino.com.br',
        rateLimit: 25,
        selectors: {
          price: '.sales-price',
          title: '.product-title',
          image: '.showcase-product-card-image img',
          availability: '.btn-buy'
        }
      },
      {
        name: 'KaBuM!',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.kabum.com.br',
        rateLimit: 30,
        selectors: {
          price: '.finalPrice',
          title: '.nameCard',
          image: '.imageCard img',
          availability: '.availability'
        }
      },
      {
        name: 'Terabyte Shop',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.terabyteshop.com.br',
        rateLimit: 20,
        selectors: {
          price: '.prod-new-price',
          title: '.prod-name',
          image: '.prod-image img',
          availability: '.prod-availability'
        }
      },
      {
        name: 'Mercado Livre',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.mercadolivre.com.br',
        rateLimit: 25,
        selectors: {
          price: '.andes-money-amount__fraction',
          title: '.x-item-title-label',
          image: '.ui-pdp-image img',
          availability: '.ui-pdp-buybox__quantity'
        }
      },
      {
        name: 'Casas Bahia',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.casasbahia.com.br',
        rateLimit: 20,
        selectors: {
          price: '[data-testid="price-original"]',
          title: '.css-1t1nq07',
          image: '.slick-slide img',
          availability: '.css-1xd84rh'
        }
      },
      {
        name: 'Extra',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.extra.com.br',
        rateLimit: 20,
        selectors: {
          price: '[data-testid="price-original"]',
          title: '[data-testid="product-name"]',
          image: '.ProductImage img',
          availability: '[data-testid="add-to-cart"]'
        }
      },
      {
        name: 'Americanas',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://www.americanas.com.br',
        rateLimit: 25,
        selectors: {
          price: '[data-testid="price-original"]',
          title: '[data-testid="product-name"]',
          image: '.product-image img',
          availability: '[data-testid="buy-button"]'
        }
      },
      {
        name: 'AliExpress Brasil',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://pt.aliexpress.com',
        rateLimit: 15,
        selectors: {
          price: '.notranslate',
          title: '.product-title-text',
          image: '.magnifier-image img',
          availability: '.quantity-info',
          rating: '.overview-rating-average'
        }
      },
      {
        name: 'Shopee Brasil',
        country: 'BR',
        type: 'scraper',
        baseUrl: 'https://shopee.com.br',
        rateLimit: 15,
        selectors: {
          price: '[class*="price"]',
          title: '[class*="title"]',
          image: '.page-product__media img',
          availability: '[class*="stock"]'
        }
      }
    ];

    // Register all retailers
    [...usRetailers, ...brRetailers].forEach(retailer => {
      this.retailers.set(retailer.name, retailer);
    });

    logger.info(`Initialized ${this.retailers.size} retailers for price tracking`);
  }

  private async initializeBrowserPool() {
    for (let i = 0; i < this.maxBrowsers; i++) {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      this.browserPool.push(browser);
    }
    logger.info(`Initialized browser pool with ${this.maxBrowsers} browsers`);
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browserPool.length > 0) {
      return this.browserPool.pop()!;
    }
    
    // Create new browser if pool is empty
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  private async returnBrowser(browser: puppeteer.Browser) {
    if (this.browserPool.length < this.maxBrowsers) {
      this.browserPool.push(browser);
    } else {
      await browser.close();
    }
  }

  async scrapeProductPrice(retailer: string, productUrl: string): Promise<ProductPrice | null> {
    const config = this.retailers.get(retailer);
    if (!config) {
      throw new Error(`Retailer ${retailer} not configured`);
    }

    if (config.type === 'api') {
      return await this.fetchPriceFromAPI(config, productUrl);
    } else {
      return await this.scrapePrice(config, productUrl);
    }
  }

  private async scrapePrice(config: RetailerConfig, url: string): Promise<ProductPrice | null> {
    const browser = await this.getBrowser();
    let page: puppeteer.Page | null = null;

    try {
      page = await browser.newPage();
      
      // Set headers and user agent
      if (config.headers) {
        await page.setExtraHTTPHeaders(config.headers);
      }
      
      await page.setUserAgent(config.headers?.['User-Agent'] || 
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      // Navigate to product page
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });

      // Wait for price element to load
      await page.waitForSelector(config.selectors!.price, { timeout: 10000 });

      // Extract product data
      const productData = await page.evaluate((selectors) => {
        const extractText = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        const extractPrice = (priceText: string) => {
          const cleanPrice = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
          return parseFloat(cleanPrice) || 0;
        };

        const priceText = extractText(selectors.price);
        const price = extractPrice(priceText);

        return {
          price,
          title: extractText(selectors.title),
          availability: extractText(selectors.availability).toLowerCase(),
          rating: selectors.rating ? extractText(selectors.rating) : null,
          reviews: selectors.reviews ? extractText(selectors.reviews) : null
        };
      }, config.selectors);

      // Determine availability status
      let availability: 'in_stock' | 'out_of_stock' | 'limited_stock' = 'in_stock';
      if (productData.availability.includes('out of stock') || 
          productData.availability.includes('indisponível') ||
          productData.availability.includes('esgotado')) {
        availability = 'out_of_stock';
      } else if (productData.availability.includes('limited') || 
                 productData.availability.includes('últimas unidades')) {
        availability = 'limited_stock';
      }

      // Determine currency based on country
      const currency = config.country === 'BR' ? 'BRL' : 'USD';

      return {
        retailer: config.name,
        price: productData.price,
        currency,
        availability,
        url,
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error(`Error scraping ${config.name} for URL ${url}:`, error);
      return null;
    } finally {
      if (page) {
        await page.close();
      }
      await this.returnBrowser(browser);
    }
  }

  private async fetchPriceFromAPI(config: RetailerConfig, productId: string): Promise<ProductPrice | null> {
    try {
      let response;
      
      switch (config.name) {
        case 'Walmart':
          response = await this.fetchWalmartPrice(productId);
          break;
        case 'eBay':
          response = await this.fetchEbayPrice(productId);
          break;
        default:
          throw new Error(`API integration not implemented for ${config.name}`);
      }

      return response;
    } catch (error) {
      logger.error(`Error fetching price from ${config.name} API:`, error);
      return null;
    }
  }

  private async fetchWalmartPrice(itemId: string): Promise<ProductPrice | null> {
    try {
      const response = await axios.get(`https://api.walmart.com/v1/items/${itemId}`, {
        params: {
          apikey: process.env.WALMART_API_KEY,
          format: 'json'
        }
      });

      const item = response.data;
      
      return {
        retailer: 'Walmart',
        price: parseFloat(item.salePrice),
        originalPrice: item.msrp ? parseFloat(item.msrp) : undefined,
        currency: 'USD',
        availability: item.availableOnline ? 'in_stock' : 'out_of_stock',
        url: item.productUrl,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error fetching Walmart price:', error);
      return null;
    }
  }

  private async fetchEbayPrice(itemId: string): Promise<ProductPrice | null> {
    try {
      const response = await axios.get('https://api.ebay.com/ws/api.dll', {
        params: {
          callname: 'GetSingleItem',
          responseencoding: 'JSON',
          appid: process.env.EBAY_API_KEY,
          siteid: '0',
          version: '967',
          ItemID: itemId,
          IncludeSelector: 'Details'
        }
      });

      const item = response.data.Item;
      
      return {
        retailer: 'eBay',
        price: parseFloat(item.CurrentPrice.Value),
        currency: item.CurrentPrice.CurrencyID,
        availability: item.Quantity > 0 ? 'in_stock' : 'out_of_stock',
        url: item.ViewItemURL,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error fetching eBay price:', error);
      return null;
    }
  }

  async getMultiRetailerPrices(productIdentifier: string, searchTerm: string): Promise<ProductPrice[]> {
    const prices: ProductPrice[] = [];
    const searchPromises: Promise<void>[] = [];

    // Search each retailer concurrently
    for (const [retailerName, config] of this.retailers) {
      searchPromises.push(
        this.searchRetailerForProduct(config, searchTerm)
          .then(async (productUrl) => {
            if (productUrl) {
              const price = await this.scrapeProductPrice(retailerName, productUrl);
              if (price) {
                prices.push(price);
                
                // Cache the price
                await this.cachePriceData(productIdentifier, price);
                
                // Emit real-time update
                io.emit('price_update', {
                  productId: productIdentifier,
                  retailer: retailerName,
                  price: price.price,
                  currency: price.currency
                });
              }
            }
          })
          .catch(error => {
            logger.error(`Error searching ${retailerName}:`, error);
          })
      );
    }

    await Promise.allSettled(searchPromises);
    
    // Sort by price (lowest first)
    prices.sort((a, b) => a.price - b.price);
    
    logger.info(`Found prices from ${prices.length} retailers for product: ${searchTerm}`);
    return prices;
  }

  private async searchRetailerForProduct(config: RetailerConfig, searchTerm: string): Promise<string | null> {
    if (config.type === 'api') {
      return await this.searchViaAPI(config, searchTerm);
    } else {
      return await this.searchViaScraping(config, searchTerm);
    }
  }

  private async searchViaScraping(config: RetailerConfig, searchTerm: string): Promise<string | null> {
    const browser = await this.getBrowser();
    let page: puppeteer.Page | null = null;

    try {
      page = await browser.newPage();
      
      if (config.headers) {
        await page.setExtraHTTPHeaders(config.headers);
      }

      // Construct search URL
      const searchUrl = this.buildSearchUrl(config, searchTerm);
      await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Find first product link
      const productUrl = await page.evaluate((baseUrl) => {
        // Generic selectors for product links
        const selectors = [
          'a[href*="/dp/"]', // Amazon
          'a[href*="/ip/"]', // Walmart
          'a[href*="/item/"]', // General item links
          'a[href*="/product"]', // Product pages
          '.product-title a',
          '.product-name a',
          '[data-testid*="product"] a'
        ];

        for (const selector of selectors) {
          const link = document.querySelector(selector) as HTMLAnchorElement;
          if (link?.href) {
            return link.href.startsWith('http') ? link.href : baseUrl + link.href;
          }
        }
        return null;
      }, config.baseUrl);

      return productUrl;
    } catch (error) {
      logger.error(`Error searching ${config.name}:`, error);
      return null;
    } finally {
      if (page) {
        await page.close();
      }
      await this.returnBrowser(browser);
    }
  }

  private async searchViaAPI(config: RetailerConfig, searchTerm: string): Promise<string | null> {
    // Implement API-based product search for supported retailers
    switch (config.name) {
      case 'Walmart':
        return await this.searchWalmartAPI(searchTerm);
      case 'eBay':
        return await this.searchEbayAPI(searchTerm);
      default:
        return null;
    }
  }

  private async searchWalmartAPI(searchTerm: string): Promise<string | null> {
    try {
      const response = await axios.get('https://api.walmart.com/v1/search', {
        params: {
          apikey: process.env.WALMART_API_KEY,
          query: searchTerm,
          format: 'json'
        }
      });

      const items = response.data.items;
      return items.length > 0 ? items[0].productUrl : null;
    } catch (error) {
      logger.error('Error searching Walmart API:', error);
      return null;
    }
  }

  private async searchEbayAPI(searchTerm: string): Promise<string | null> {
    try {
      const response = await axios.get('https://svcs.ebay.com/services/search/FindingService/v1', {
        params: {
          'OPERATION-NAME': 'findItemsByKeywords',
          'SERVICE-VERSION': '1.0.0',
          'SECURITY-APPNAME': process.env.EBAY_API_KEY,
          'RESPONSE-DATA-FORMAT': 'JSON',
          'keywords': searchTerm,
          'paginationInput.entriesPerPage': '1'
        }
      });

      const items = response.data.findItemsByKeywordsResponse[0].searchResult[0].item;
      return items.length > 0 ? items[0].viewItemURL[0] : null;
    } catch (error) {
      logger.error('Error searching eBay API:', error);
      return null;
    }
  }

  private buildSearchUrl(config: RetailerConfig, searchTerm: string): string {
    const encodedTerm = encodeURIComponent(searchTerm);
    
    const searchPaths: Record<string, string> = {
      'Amazon': `/s?k=${encodedTerm}`,
      'Target': `/s?searchTerm=${encodedTerm}`,
      'Best Buy': `/site/searchpage.jsp?st=${encodedTerm}`,
      'Newegg': `/p/pl?d=${encodedTerm}`,
      'AliExpress': `/w/wholesale-${encodedTerm}.html`,
      'Temu': `/search_result.html?search_key=${encodedTerm}`,
      'Shopee': `/search?keyword=${encodedTerm}`,
      'Magazine Luiza': `/busca/${encodedTerm}`,
      'Submarino': `/busca?q=${encodedTerm}`,
      'KaBuM!': `/busca/${encodedTerm}`,
      'Terabyte Shop': `/busca?str=${encodedTerm}`,
      'Mercado Livre': `/${encodedTerm}`,
      'Casas Bahia': `/busca/${encodedTerm}`,
      'Extra': `/busca?q=${encodedTerm}`,
      'Americanas': `/busca/${encodedTerm}`,
      'AliExpress Brasil': `/w/wholesale-${encodedTerm}.html`,
      'Shopee Brasil': `/search?keyword=${encodedTerm}`
    };

    const searchPath = searchPaths[config.name] || `/search?q=${encodedTerm}`;
    return config.baseUrl + searchPath;
  }

  private async cachePriceData(productId: string, price: ProductPrice): Promise<void> {
    const cacheKey = `price:${productId}:${price.retailer}`;
    await redis.setex(cacheKey, 1800, JSON.stringify(price)); // Cache for 30 minutes
  }

  async getCachedPrices(productId: string): Promise<ProductPrice[]> {
    const pattern = `price:${productId}:*`;
    const keys = await redis.keys(pattern);
    const prices: ProductPrice[] = [];

    for (const key of keys) {
      const priceData = await redis.get(key);
      if (priceData) {
        prices.push(JSON.parse(priceData));
      }
    }

    return prices.sort((a, b) => a.price - b.price);
  }

  async startRealTimePriceMonitoring(productId: string, searchTerm: string): Promise<void> {
    // Set up periodic price checking every 30 minutes
    const intervalId = setInterval(async () => {
      try {
        const prices = await this.getMultiRetailerPrices(productId, searchTerm);
        
        // Check for significant price changes
        const cachedPrices = await this.getCachedPrices(productId);
        
        for (const newPrice of prices) {
          const oldPrice = cachedPrices.find(p => p.retailer === newPrice.retailer);
          
          if (oldPrice && Math.abs(newPrice.price - oldPrice.price) > oldPrice.price * 0.05) {
            // 5% price change threshold
            io.to(`price_${productId}`).emit('significant_price_change', {
              productId,
              retailer: newPrice.retailer,
              oldPrice: oldPrice.price,
              newPrice: newPrice.price,
              changePercent: ((newPrice.price - oldPrice.price) / oldPrice.price * 100).toFixed(2)
            });
          }
        }
      } catch (error) {
        logger.error(`Error in real-time monitoring for product ${productId}:`, error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Store interval ID for cleanup
    await redis.setex(`monitor:${productId}`, 24 * 60 * 60, intervalId.toString());
  }

  async stopRealTimePriceMonitoring(productId: string): Promise<void> {
    const intervalIdStr = await redis.get(`monitor:${productId}`);
    if (intervalIdStr) {
      clearInterval(parseInt(intervalIdStr));
      await redis.del(`monitor:${productId}`);
    }
  }

  getRetailersList(): RetailerConfig[] {
    return Array.from(this.retailers.values());
  }

  async cleanup(): Promise<void> {
    // Close all browser instances
    await Promise.all(this.browserPool.map(browser => browser.close()));
    logger.info('Browser pool cleaned up');
  }
}

export const retailerService = new RetailerIntegrationService();