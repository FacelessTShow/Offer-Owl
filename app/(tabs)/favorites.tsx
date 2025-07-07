import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, ShoppingBag, Bell } from 'lucide-react-native';
import { ProductCard } from '../../components/ProductCard';
import { useFavorites } from '../../hooks/useFavorites';
import { useProducts } from '../../hooks/useProducts';
import { COLORS, FONTS, SPACING } from '../../utils/constants';
import { Product } from '../../types';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites } = useFavorites();
  const { products } = useProducts();

  const favoriteProducts = products.filter(product => favorites.includes(product.id));

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Heart size={64} color={COLORS.gray[400]} />
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start adding products to your favorites to keep track of items you love
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => router.push('/(tabs)/')}
      >
        <ShoppingBag size={20} color={COLORS.white} />
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Favorites</Text>
      <Text style={styles.subtitle}>
        {favoriteProducts.length} item{favoriteProducts.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderPriceAlertsBanner = () => (
    <View style={styles.alertsBanner}>
      <View style={styles.alertsIcon}>
        <Bell size={20} color={COLORS.primary} />
      </View>
      <View style={styles.alertsContent}>
        <Text style={styles.alertsTitle}>Price Alerts Active</Text>
        <Text style={styles.alertsSubtitle}>
          Get notified when prices drop on your favorite items
        </Text>
      </View>
      <TouchableOpacity style={styles.alertsButton}>
        <Text style={styles.alertsButtonText}>Manage</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={handleProductPress} />
  );

  const renderListHeader = () => (
    <View>
      {renderHeader()}
      {favoriteProducts.length > 0 && renderPriceAlertsBanner()}
    </View>
  );

  if (favoriteProducts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={favoriteProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderListHeader}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
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
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  shopButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
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
  alertsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertsIcon: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 20,
    padding: SPACING.sm,
    marginRight: SPACING.md,
  },
  alertsContent: {
    flex: 1,
  },
  alertsTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  alertsSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
  },
  alertsButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  alertsButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.white,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
});