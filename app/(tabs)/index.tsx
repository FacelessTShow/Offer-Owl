import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Filter, Sparkles, TrendingUp } from 'lucide-react-native';
import { SearchBar } from '../../components/SearchBar';
import { ProductCard } from '../../components/ProductCard';
import { FilterSheet } from '../../components/FilterSheet';
import { useProducts } from '../../hooks/useProducts';
import { COLORS, FONTS, SPACING } from '../../utils/constants';
import { Product } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { products, loading, searchQuery, setSearchQuery, filters, setFilters } = useProducts();
  const [showFilters, setShowFilters] = useState(false);

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleVoiceSearch = () => {
    Alert.alert('Voice Search', 'Voice search functionality would be implemented here');
  };

  const handleImageSearch = () => {
    Alert.alert('Image Search', 'Image search functionality would be implemented here');
  };

  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>PriceCompare</Text>
      <Text style={styles.subtitle}>Find the best deals on everything</Text>
    </View>
  );

  const renderSearchSection = () => (
    <View style={styles.searchSection}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onVoiceSearch={handleVoiceSearch}
        onImageSearch={handleImageSearch}
      />
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <Filter size={20} color={COLORS.gray[600]} />
      </TouchableOpacity>
    </View>
  );

  const renderFeaturedSection = () => {
    if (searchQuery || Object.keys(filters).length > 0) return null;

    return (
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Sparkles size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Featured Deals</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResultsHeader = () => {
    if (!searchQuery && Object.keys(filters).length === 0) return null;

    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {products.length} result{products.length !== 1 ? 's' : ''}
          {searchQuery && ` for "${searchQuery}"`}
        </Text>
        <TouchableOpacity style={styles.trendingButton}>
          <TrendingUp size={14} color={COLORS.success} />
          <Text style={styles.trendingText}>Price Trends</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={handleProductPress} />
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchSection()}
      
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View>
            {renderFeaturedSection()}
            {renderResultsHeader()}
          </View>
        }
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => {
          // Refresh logic would go here
        }}
      />

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  filterButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginRight: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginLeft: SPACING.sm,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  resultsText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[700],
  },
  trendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trendingText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.success,
    marginLeft: 4,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
});