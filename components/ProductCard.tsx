import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Heart, Star, TrendingDown, ShoppingCart } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS, FONTS, SPACING } from '../utils/constants';
import { useFavorites } from '../hooks/useFavorites';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, compact = false }) => {
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();

  const handleFavoritePress = () => {
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product.id);
    }
  };

  const renderPriceInfo = () => {
    const lowestPrice = Math.min(...product.prices.map(p => p.price));
    const savings = product.originalPrice ? product.originalPrice - lowestPrice : 0;
    
    return (
      <View style={styles.priceContainer}>
        <Text style={styles.currentPrice}>${lowestPrice.toFixed(2)}</Text>
        {product.originalPrice && product.originalPrice > lowestPrice && (
          <Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
        )}
        {savings > 0 && (
          <View style={styles.savingsContainer}>
            <TrendingDown size={12} color={COLORS.success} />
            <Text style={styles.savingsText}>Save ${savings.toFixed(2)}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderRating = () => (
    <View style={styles.ratingContainer}>
      <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
      <Text style={styles.ratingText}>{product.averageRating.toFixed(1)}</Text>
      <Text style={styles.reviewCount}>({product.totalReviews})</Text>
    </View>
  );

  return (
    <TouchableOpacity style={[styles.card, compact && styles.compactCard]} onPress={() => onPress(product)}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {product.isOnSale && (
          <View style={styles.saleTag}>
            <Text style={styles.saleText}>SALE</Text>
          </View>
        )}
        <TouchableOpacity style={styles.favoriteButton} onPress={handleFavoritePress}>
          <Heart
            size={20}
            color={isFavorite(product.id) ? COLORS.error : COLORS.gray[400]}
            fill={isFavorite(product.id) ? COLORS.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {renderRating()}
        {renderPriceInfo()}
        
        <View style={styles.footer}>
          <Text style={styles.retailerCount}>
            {product.prices.length} store{product.prices.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity style={styles.compareButton}>
            <ShoppingCart size={16} color={COLORS.primary} />
            <Text style={styles.compareText}>Compare</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCard: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  saleTag: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  saleText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.sm,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: SPACING.md,
  },
  brand: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray[700],
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
  priceContainer: {
    marginBottom: SPACING.md,
  },
  currentPrice: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.success,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retailerCount: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  compareText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: 4,
  },
});