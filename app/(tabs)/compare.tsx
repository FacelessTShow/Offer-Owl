import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Plus, X, TrendingUp, TrendingDown } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../utils/constants';
import { useProducts } from '../../hooks/useProducts';
import { Product } from '../../types';

export default function CompareScreen() {
  const { products } = useProducts();
  const [compareList, setCompareList] = useState<Product[]>([]);

  const addToCompare = () => {
    if (compareList.length >= 3) {
      Alert.alert('Limit Reached', 'You can compare up to 3 products at a time');
      return;
    }
    
    // For demo, add a random product
    const availableProducts = products.filter(p => !compareList.find(c => c.id === p.id));
    if (availableProducts.length > 0) {
      const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
      setCompareList([...compareList, randomProduct]);
    }
  };

  const removeFromCompare = (productId: string) => {
    setCompareList(compareList.filter(p => p.id !== productId));
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BarChart3 size={64} color={COLORS.gray[400]} />
      <Text style={styles.emptyTitle}>No Products to Compare</Text>
      <Text style={styles.emptySubtitle}>
        Add products from search results to compare prices and features
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={addToCompare}>
        <Plus size={20} color={COLORS.white} />
        <Text style={styles.addButtonText}>Add Product</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompareHeader = () => (
    <View style={styles.compareHeader}>
      <Text style={styles.compareTitle}>Compare Products</Text>
      <Text style={styles.compareSubtitle}>
        {compareList.length} of 3 products selected
      </Text>
    </View>
  );

  const renderPriceComparison = () => (
    <View style={styles.comparisonSection}>
      <Text style={styles.sectionTitle}>Price Comparison</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.comparisonTable}>
          <View style={styles.tableHeader}>
            <View style={styles.tableCell}>
              <Text style={styles.tableHeaderText}>Product</Text>
            </View>
            {compareList.map((product) => (
              <View key={product.id} style={styles.tableCell}>
                <Text style={styles.tableHeaderText} numberOfLines={2}>
                  {product.name}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCompare(product.id)}
                >
                  <X size={16} color={COLORS.gray[500]} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text style={styles.tableCellText}>Current Price</Text>
            </View>
            {compareList.map((product) => (
              <View key={product.id} style={styles.tableCell}>
                <Text style={styles.priceText}>${product.currentPrice}</Text>
                {product.isOnSale && (
                  <View style={styles.saleTag}>
                    <TrendingDown size={12} color={COLORS.success} />
                    <Text style={styles.saleText}>Sale</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text style={styles.tableCellText}>Rating</Text>
            </View>
            {compareList.map((product) => (
              <View key={product.id} style={styles.tableCell}>
                <Text style={styles.ratingText}>{product.averageRating}/5</Text>
                <Text style={styles.reviewText}>({product.totalReviews} reviews)</Text>
              </View>
            ))}
          </View>

          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text style={styles.tableCellText}>Stores</Text>
            </View>
            {compareList.map((product) => (
              <View key={product.id} style={styles.tableCell}>
                <Text style={styles.storeText}>{product.prices.length} stores</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderPriceTrends = () => (
    <View style={styles.comparisonSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Price Trends</Text>
        <TouchableOpacity style={styles.trendButton}>
          <TrendingUp size={16} color={COLORS.primary} />
          <Text style={styles.trendButtonText}>View Charts</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.trendContainer}>
        {compareList.map((product) => (
          <View key={product.id} style={styles.trendItem}>
            <Text style={styles.trendProductName} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.trendStats}>
              <View style={styles.trendStat}>
                <Text style={styles.trendLabel}>Lowest</Text>
                <Text style={styles.trendValue}>${product.lowestPrice}</Text>
              </View>
              <View style={styles.trendStat}>
                <Text style={styles.trendLabel}>Highest</Text>
                <Text style={styles.trendValue}>${product.highestPrice}</Text>
              </View>
              <View style={styles.trendStat}>
                <Text style={styles.trendLabel}>Avg Savings</Text>
                <Text style={[styles.trendValue, { color: COLORS.success }]}>
                  ${(product.highestPrice - product.lowestPrice).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (compareList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {renderCompareHeader()}
        {renderPriceComparison()}
        {renderPriceTrends()}
        
        <TouchableOpacity style={styles.addMoreButton} onPress={addToCompare}>
          <Plus size={20} color={COLORS.primary} />
          <Text style={styles.addMoreText}>Add Another Product</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  scrollContainer: {
    padding: SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  compareHeader: {
    marginBottom: SPACING.xl,
  },
  compareTitle: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  compareSubtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
  },
  comparisonSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  comparisonTable: {
    minWidth: 300,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  tableCell: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: SPACING.sm,
  },
  tableHeaderText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
  },
  tableCellText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray[700],
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  saleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  saleText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.success,
    marginLeft: 2,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
  },
  reviewText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  storeText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[700],
  },
  trendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trendButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: 4,
  },
  trendContainer: {
    gap: SPACING.md,
  },
  trendItem: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: SPACING.md,
  },
  trendProductName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.sm,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendStat: {
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  trendValue: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  addMoreText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
});