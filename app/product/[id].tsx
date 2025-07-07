import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, Star, ExternalLink, Bell, Share2 } from 'lucide-react-native';
import { useProducts } from '../../hooks/useProducts';
import { useFavorites } from '../../hooks/useFavorites';
import { COLORS, FONTS, SPACING } from '../../utils/constants';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getProductById } = useProducts();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const product = getProductById(id as string);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Product not found</Text>
      </SafeAreaView>
    );
  }

  const handleFavoritePress = () => {
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product.id);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={COLORS.gray[600]} />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Share2 size={20} color={COLORS.gray[600]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleFavoritePress}>
          <Heart
            size={20}
            color={isFavorite(product.id) ? COLORS.error : COLORS.gray[600]}
            fill={isFavorite(product.id) ? COLORS.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImageGallery = () => (
    <View style={styles.imageSection}>
      <Image
        source={{ uri: product.images[selectedImageIndex] }}
        style={styles.mainImage}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageList}
      >
        {product.images.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedImageIndex(index)}
            style={[
              styles.imageThumb,
              selectedImageIndex === index && styles.selectedImageThumb,
            ]}
          >
            <Image source={{ uri: image }} style={styles.thumbImage} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProductInfo = () => (
    <View style={styles.productInfo}>
      <Text style={styles.brand}>{product.brand}</Text>
      <Text style={styles.productName}>{product.name}</Text>
      
      <View style={styles.ratingSection}>
        <View style={styles.ratingContainer}>
          <Star size={16} color={COLORS.accent} fill={COLORS.accent} />
          <Text style={styles.ratingText}>{product.averageRating}</Text>
          <Text style={styles.reviewCount}>({product.totalReviews} reviews)</Text>
        </View>
        <TouchableOpacity style={styles.reviewsButton}>
          <Text style={styles.reviewsButtonText}>Read Reviews</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{product.description}</Text>
    </View>
  );

  const renderPriceSection = () => (
    <View style={styles.priceSection}>
      <Text style={styles.sectionTitle}>Price Comparison</Text>
      <View style={styles.priceList}>
        {product.prices.map((price, index) => (
          <View key={index} style={styles.priceItem}>
            <View style={styles.priceItemLeft}>
              <Image source={{ uri: price.retailerLogo }} style={styles.retailerLogo} />
              <View style={styles.priceItemInfo}>
                <Text style={styles.retailerName}>{price.retailer}</Text>
                <Text style={styles.deliveryTime}>{price.deliveryTime}</Text>
              </View>
            </View>
            <View style={styles.priceItemRight}>
              <Text style={styles.price}>${price.price}</Text>
              {price.originalPrice && price.originalPrice > price.price && (
                <Text style={styles.originalPrice}>${price.originalPrice}</Text>
              )}
              <TouchableOpacity style={styles.visitButton}>
                <ExternalLink size={14} color={COLORS.primary} />
                <Text style={styles.visitButtonText}>Visit Store</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSpecifications = () => (
    <View style={styles.specsSection}>
      <Text style={styles.sectionTitle}>Specifications</Text>
      <View style={styles.specsList}>
        {Object.entries(product.specifications).map(([key, value]) => (
          <View key={key} style={styles.specItem}>
            <Text style={styles.specKey}>{key}</Text>
            <Text style={styles.specValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderBottomActions = () => (
    <View style={styles.bottomActions}>
      <TouchableOpacity style={styles.alertButton}>
        <Bell size={20} color={COLORS.white} />
        <Text style={styles.alertButtonText}>Set Price Alert</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.compareButton}>
        <Text style={styles.compareButtonText}>Add to Compare</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderImageGallery()}
        {renderProductInfo()}
        {renderPriceSection()}
        {renderSpecifications()}
      </ScrollView>
      {renderBottomActions()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageSection: {
    marginBottom: SPACING.lg,
  },
  mainImage: {
    width: '100%',
    height: 300,
  },
  imageList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  imageThumb: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedImageThumb: {
    borderColor: COLORS.primary,
  },
  thumbImage: {
    width: 60,
    height: 60,
  },
  productInfo: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  brand: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING.md,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
  reviewsButton: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewsButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  description: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
  priceSection: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.md,
  },
  priceList: {
    gap: SPACING.md,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  retailerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  priceItemInfo: {
    flex: 1,
  },
  retailerName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
  priceItemRight: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  visitButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: 4,
  },
  specsSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  specsList: {
    gap: SPACING.sm,
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  specKey: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray[700],
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[900],
    flex: 2,
    textAlign: 'right',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    gap: SPACING.sm,
  },
  alertButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  alertButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  compareButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  compareButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
});