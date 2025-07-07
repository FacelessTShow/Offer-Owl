import { useState, useEffect } from 'react';
import { Product, SearchFilters } from '../types';
import { MOCK_PRODUCTS } from '../utils/mockData';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    if (searchQuery || Object.keys(filters).length > 0) {
      searchProducts();
    } else {
      setProducts(MOCK_PRODUCTS);
    }
  }, [searchQuery, filters]);

  const searchProducts = async () => {
    setLoading(true);
    try {
      // Mock search with filtering
      let filteredProducts = MOCK_PRODUCTS;

      if (searchQuery) {
        filteredProducts = filteredProducts.filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (filters.category) {
        filteredProducts = filteredProducts.filter(product =>
          product.category === filters.category
        );
      }

      if (filters.priceRange) {
        filteredProducts = filteredProducts.filter(product =>
          product.currentPrice >= filters.priceRange!.min &&
          product.currentPrice <= filters.priceRange!.max
        );
      }

      if (filters.rating) {
        filteredProducts = filteredProducts.filter(product =>
          product.averageRating >= filters.rating!
        );
      }

      if (filters.deals) {
        filteredProducts = filteredProducts.filter(product =>
          product.isOnSale
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        filteredProducts.sort((a, b) => {
          switch (filters.sortBy) {
            case 'price-asc':
              return a.currentPrice - b.currentPrice;
            case 'price-desc':
              return b.currentPrice - a.currentPrice;
            case 'rating':
              return b.averageRating - a.averageRating;
            default:
              return 0;
          }
        });
      }

      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductById = (id: string): Product | undefined => {
    return MOCK_PRODUCTS.find(product => product.id === id);
  };

  const getFeaturedProducts = (): Product[] => {
    return MOCK_PRODUCTS.filter(product => product.isOnSale);
  };

  return {
    products,
    loading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    searchProducts,
    getProductById,
    getFeaturedProducts,
  };
};