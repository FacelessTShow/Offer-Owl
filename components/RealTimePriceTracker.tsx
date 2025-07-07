import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  ExternalLink,
  Zap,
  Clock,
  DollarSign,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../utils/constants';

interface RetailerPrice {
  retailer: string;
  price: number;
  originalPrice?: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited_stock';
  shipping?: number;
  shippingTime?: string;
  url: string;
  lastUpdated: string;
  discount?: number;
  couponCode?: string;
  isLowest?: boolean;
  priceChange?: {
    amount: number;
    percentage: number;
    direction: 'up' | 'down';
  };
}

interface RealTimePriceTrackerProps {
  productId: string;
  productName: string;
  searchTerm: string;
  onPriceAlert?: (targetPrice: number) => void;
  socket?: any;
}

export const RealTimePriceTracker: React.FC<RealTimePriceTrackerProps> = ({
  productId,
  productName,
  searchTerm,
  onPriceAlert,
  socket,
}) => {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<RetailerPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [priceStats, setPriceStats] = useState({
    lowest: 0,
    highest: 0,
    average: 0,
    totalStores: 0,
  });

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const priceAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

  useEffect(() => {
    loadInitialPrices();
    setupWebSocketListeners();
    return () => {
      cleanupWebSocketListeners();
    };
  }, [productId]);

  useEffect(() => {
    calculatePriceStats();
  }, [prices]);

  const loadInitialPrices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/prices/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          searchTerm,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const processedPrices = processPriceData(data.prices);
        setPrices(processedPrices);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error loading prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    if (!socket) return;

    socket.on('price_update', handlePriceUpdate);
    socket.on('significant_price_change', handleSignificantPriceChange);
    socket.emit('join_price_watch', productId);
  };

  const cleanupWebSocketListeners = () => {
    if (!socket) return;

    socket.off('price_update', handlePriceUpdate);
    socket.off('significant_price_change', handleSignificantPriceChange);
    socket.emit('leave_price_watch', productId);
  };

  const handlePriceUpdate = (data: any) => {
    setPrices(prevPrices => {
      const newPrices = prevPrices.map(price => {
        if (price.retailer === data.retailer) {
          const oldPrice = price.price;
          const newPrice = data.price;
          
          // Animate price change
          animatePriceChange(data.retailer, oldPrice !== newPrice);
          
          return {
            ...price,
            price: newPrice,
            lastUpdated: new Date().toISOString(),
            priceChange: {
              amount: newPrice - oldPrice,
              percentage: ((newPrice - oldPrice) / oldPrice) * 100,
              direction: newPrice > oldPrice ? 'up' : 'down',
            },
          };
        }
        return price;
      });
      
      return processPriceData(newPrices);
    });
    
    setLastUpdate(new Date());
    startPulseAnimation();
  };

  const handleSignificantPriceChange = (data: any) => {
    Alert.alert(
      t('priceDropAlert'),
      `${data.retailer}: ${data.oldPrice} → ${data.newPrice} (${data.changePercent}%)`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('viewDeal'), onPress: () => openRetailerLink(data.retailer) },
      ]
    );
  };

  const processPriceData = (rawPrices: RetailerPrice[]): RetailerPrice[] => {
    const validPrices = rawPrices.filter(p => p.price > 0);
    const sortedPrices = validPrices.sort((a, b) => a.price - b.price);
    
    // Mark the lowest price
    if (sortedPrices.length > 0) {
      sortedPrices[0].isLowest = true;
    }
    
    return sortedPrices;
  };

  const calculatePriceStats = () => {
    if (prices.length === 0) return;

    const validPrices = prices.filter(p => p.availability !== 'out_of_stock');
    const priceValues = validPrices.map(p => p.price);
    
    setPriceStats({
      lowest: Math.min(...priceValues),
      highest: Math.max(...priceValues),
      average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
      totalStores: validPrices.length,
    });
  };

  const animatePriceChange = (retailer: string, hasChange: boolean) => {
    if (!priceAnimations[retailer]) {
      priceAnimations[retailer] = new Animated.Value(1);
    }

    if (hasChange) {
      Animated.sequence([
        Animated.timing(priceAnimations[retailer], {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(priceAnimations[retailer], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startRealTimeMonitoring = async () => {
    try {
      const response = await fetch(`/api/prices/monitor/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          searchTerm,
        }),
      });

      if (response.ok) {
        setIsMonitoring(true);
        Alert.alert(t('success'), 'Real-time monitoring started');
      }
    } catch (error) {
      Alert.alert(t('error'), 'Failed to start monitoring');
    }
  };

  const stopRealTimeMonitoring = async () => {
    try {
      const response = await fetch(`/api/prices/monitor/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        setIsMonitoring(false);
        Alert.alert(t('success'), 'Real-time monitoring stopped');
      }
    } catch (error) {
      Alert.alert(t('error'), 'Failed to stop monitoring');
    }
  };

  const openRetailerLink = (retailerName: string) => {
    const price = prices.find(p => p.retailer === retailerName);
    if (price?.url) {
      // Open external link
      console.log('Opening:', price.url);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'BRL' ? 'R$' : '$';
    return `${symbol}${price.toFixed(2)}`;
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in_stock':
        return COLORS.success;
      case 'limited_stock':
        return COLORS.warning;
      case 'out_of_stock':
        return COLORS.error;
      default:
        return COLORS.gray[500];
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'in_stock':
        return t('inStock');
      case 'limited_stock':
        return t('limitedStock');
      case 'out_of_stock':
        return t('outOfStock');
      default:
        return 'Unknown';
    }
  };

  const renderPriceStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatPrice(priceStats.lowest, 'USD')}</Text>
        <Text style={styles.statLabel}>{t('lowestPrice')}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatPrice(priceStats.average, 'USD')}</Text>
        <Text style={styles.statLabel}>{t('averagePrice')}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{priceStats.totalStores}</Text>
        <Text style={styles.statLabel}>{t('stores')}</Text>
      </View>
    </View>
  );

  const renderPriceItem = (item: RetailerPrice, index: number) => {
    const animationValue = priceAnimations[item.retailer] || new Animated.Value(1);
    
    return (
      <Animated.View
        key={item.retailer}
        style={[
          styles.priceItem,
          item.isLowest && styles.lowestPriceItem,
          { transform: [{ scale: animationValue }] },
        ]}
      >
        <View style={styles.priceHeader}>
          <View style={styles.retailerInfo}>
            <Text style={styles.retailerName}>{item.retailer}</Text>
            {item.isLowest && (
              <View style={styles.bestDealBadge}>
                <Text style={styles.bestDealText}>{t('bestDeal')}</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.externalLinkButton}
            onPress={() => openRetailerLink(item.retailer)}
          >
            <ExternalLink size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.priceDetails}>
          <View style={styles.priceSection}>
            <Text style={[styles.currentPrice, item.isLowest && styles.lowestPrice]}>
              {formatPrice(item.price, item.currency)}
            </Text>
            
            {item.originalPrice && item.originalPrice > item.price && (
              <>
                <Text style={styles.originalPrice}>
                  {formatPrice(item.originalPrice, item.currency)}
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                  </Text>
                </View>
              </>
            )}
          </View>

          {item.priceChange && (
            <View style={styles.priceChangeContainer}>
              {item.priceChange.direction === 'up' ? (
                <TrendingUp size={14} color={COLORS.error} />
              ) : (
                <TrendingDown size={14} color={COLORS.success} />
              )}
              <Text
                style={[
                  styles.priceChangeText,
                  { color: item.priceChange.direction === 'up' ? COLORS.error : COLORS.success },
                ]}
              >
                {item.priceChange.amount > 0 ? '+' : ''}
                {formatPrice(Math.abs(item.priceChange.amount), item.currency)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.priceFooter}>
          <View style={styles.availabilityContainer}>
            <View
              style={[
                styles.availabilityIndicator,
                { backgroundColor: getAvailabilityColor(item.availability) },
              ]}
            />
            <Text style={styles.availabilityText}>
              {getAvailabilityText(item.availability)}
            </Text>
          </View>

          {item.shipping && (
            <Text style={styles.shippingText}>
              +{formatPrice(item.shipping, item.currency)} {t('shipping')}
            </Text>
          )}

          <Text style={styles.lastUpdated}>
            {t('lastUpdated')}: {new Date(item.lastUpdated).toLocaleTimeString()}
          </Text>
        </View>

        {item.couponCode && (
          <View style={styles.couponContainer}>
            <Text style={styles.couponText}>Code: {item.couponCode}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{t('realTimePrices')}</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
          <Zap size={20} color={COLORS.accent} />
        </Animated.View>
      </View>
      
      <Text style={styles.subtitle}>{productName}</Text>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadInitialPrices}
          disabled={loading}
        >
          <RefreshCw size={16} color={COLORS.primary} />
          <Text style={styles.refreshText}>{t('refresh')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.monitorButton,
            isMonitoring && styles.monitorButtonActive,
          ]}
          onPress={isMonitoring ? stopRealTimeMonitoring : startRealTimeMonitoring}
        >
          <Bell size={16} color={isMonitoring ? COLORS.white : COLORS.primary} />
          <Text
            style={[
              styles.monitorText,
              isMonitoring && styles.monitorTextActive,
            ]}
          >
            {isMonitoring ? t('monitoring') : t('startMonitoring')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.lastUpdateContainer}>
        <Clock size={12} color={COLORS.gray[500]} />
        <Text style={styles.lastUpdateText}>
          {t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  const renderPriceAlert = () => (
    <TouchableOpacity
      style={styles.priceAlertButton}
      onPress={() => {
        if (onPriceAlert && priceStats.lowest > 0) {
          onPriceAlert(priceStats.lowest * 0.9); // 10% below current lowest
        }
      }}
    >
      <DollarSign size={16} color={COLORS.white} />
      <Text style={styles.priceAlertText}>
        {t('setAlertAt')} {formatPrice(priceStats.lowest * 0.9, 'USD')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadInitialPrices} />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}
      {renderPriceStats()}
      
      <View style={styles.pricesList}>
        {prices.map((item, index) => renderPriceItem(item, index))}
      </View>

      {priceStats.lowest > 0 && renderPriceAlert()}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('pricesUpdatedEvery')} 30 {t('minutes')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginRight: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
    marginBottom: SPACING.lg,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  monitorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  monitorButtonActive: {
    backgroundColor: COLORS.primary,
  },
  monitorText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  monitorTextActive: {
    color: COLORS.white,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdateText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
  pricesList: {
    margin: SPACING.lg,
  },
  priceItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lowestPriceItem: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  retailerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retailerName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginRight: SPACING.sm,
  },
  bestDealBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bestDealText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  externalLinkButton: {
    padding: SPACING.sm,
  },
  priceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginRight: SPACING.sm,
  },
  lowestPrice: {
    color: COLORS.success,
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginRight: SPACING.sm,
  },
  discountBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChangeText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
  priceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
  },
  shippingText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
  lastUpdated: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.gray[400],
  },
  couponContainer: {
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.sm,
    borderRadius: 6,
    marginTop: SPACING.sm,
  },
  couponText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.warning,
    textAlign: 'center',
  },
  priceAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  priceAlertText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  footer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
});