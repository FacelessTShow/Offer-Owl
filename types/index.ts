export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  description: string;
  specifications: Record<string, string>;
  averageRating: number;
  totalReviews: number;
  prices: ProductPrice[];
  isOnSale: boolean;
  originalPrice?: number;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  priceHistory: PriceHistoryPoint[];
  availability: 'in-stock' | 'out-of-stock' | 'limited' | 'pre-order';
  shippingInfo: ShippingInfo;
  deals: Deal[];
  similarProducts: string[];
}

export interface ProductPrice {
  retailer: string;
  retailerLogo: string;
  price: number;
  originalPrice?: number;
  url: string;
  availability: 'in-stock' | 'out-of-stock' | 'limited';
  shippingCost: number;
  deliveryTime: string;
  isOfficial: boolean;
  rating: number;
  lastUpdated: Date;
}

export interface PriceHistoryPoint {
  date: Date;
  price: number;
  retailer: string;
}

export interface ShippingInfo {
  freeShipping: boolean;
  minimumForFreeShipping?: number;
  estimatedDelivery: string;
  shippingCost: number;
}

export interface Deal {
  id: string;
  type: 'discount' | 'coupon' | 'cashback' | 'bundle';
  title: string;
  description: string;
  discount: number;
  couponCode?: string;
  expiryDate: Date;
  retailer: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: UserPreferences;
  favorites: string[];
  priceAlerts: PriceAlert[];
  searchHistory: SearchHistoryItem[];
}

export interface UserPreferences {
  preferredRetailers: string[];
  maxShippingCost: number;
  priceAlertThreshold: number;
  categories: string[];
  currency: string;
  notifications: {
    priceDrops: boolean;
    deals: boolean;
    backInStock: boolean;
  };
}

export interface PriceAlert {
  id: string;
  productId: string;
  targetPrice: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: 'text' | 'voice' | 'image';
  timestamp: Date;
  results: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  verified: boolean;
  helpful: number;
  timestamp: Date;
  images?: string[];
}

export interface SearchFilters {
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  retailers?: string[];
  availability?: string;
  deals?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'rating' | 'popularity' | 'newest';
}