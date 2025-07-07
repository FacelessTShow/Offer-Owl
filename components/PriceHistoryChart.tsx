import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../utils/constants';

const { width: screenWidth } = Dimensions.get('window');

interface PricePoint {
  date: string;
  price: number;
  retailer: string;
  isLowest?: boolean;
  isHighest?: boolean;
}

interface PriceHistoryChartProps {
  productId: string;
  productName: string;
  currentPrice: number;
  priceHistory: PricePoint[];
  onSetPriceAlert?: (targetPrice: number) => void;
}

type TimeFrame = '7d' | '30d' | '90d' | '1y';

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  productId,
  productName,
  currentPrice,
  priceHistory,
  onSetPriceAlert,
}) => {
  const { t } = useTranslation();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('30d');
  const [filteredData, setFilteredData] = useState<PricePoint[]>([]);
  const [priceStats, setPriceStats] = useState({
    lowestPrice: 0,
    highestPrice: 0,
    averagePrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
  });

  useEffect(() => {
    filterDataByTimeFrame();
  }, [selectedTimeFrame, priceHistory]);

  const filterDataByTimeFrame = () => {
    const now = new Date();
    let cutoffDate = new Date();

    switch (selectedTimeFrame) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = priceHistory.filter(
      (point) => new Date(point.date) >= cutoffDate
    );

    setFilteredData(filtered);
    calculatePriceStats(filtered);
  };

  const calculatePriceStats = (data: PricePoint[]) => {
    if (data.length === 0) return;

    const prices = data.map((point) => point.price);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    const oldestPrice = data[0]?.price || currentPrice;
    const priceChange = currentPrice - oldestPrice;
    const priceChangePercent = ((priceChange / oldestPrice) * 100);

    setPriceStats({
      lowestPrice,
      highestPrice,
      averagePrice,
      priceChange,
      priceChangePercent,
    });
  };

  const getChartData = () => {
    if (filteredData.length === 0) {
      return {
        labels: ['Now'],
        datasets: [
          {
            data: [currentPrice],
            color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      };
    }

    // Sample data points for the chart (limit to show clean visualization)
    const maxPoints = 10;
    const step = Math.ceil(filteredData.length / maxPoints);
    const sampledData = filteredData.filter((_, index) => index % step === 0);

    // Add current price as the last point
    const currentPoint = {
      date: new Date().toISOString(),
      price: currentPrice,
      retailer: 'Current',
    };
    sampledData.push(currentPoint);

    const labels = sampledData.map((point) => {
      const date = new Date(point.date);
      if (selectedTimeFrame === '7d') {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (selectedTimeFrame === '30d') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
    });

    const data = sampledData.map((point) => point.price);

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const renderTimeFrameSelector = () => (
    <View style={styles.timeFrameSelector}>
      {(['7d', '30d', '90d', '1y'] as TimeFrame[]).map((timeFrame) => (
        <TouchableOpacity
          key={timeFrame}
          style={[
            styles.timeFrameButton,
            selectedTimeFrame === timeFrame && styles.timeFrameButtonActive,
          ]}
          onPress={() => setSelectedTimeFrame(timeFrame)}
        >
          <Text
            style={[
              styles.timeFrameButtonText,
              selectedTimeFrame === timeFrame && styles.timeFrameButtonTextActive,
            ]}
          >
            {t(timeFrame === '7d' ? 'last7Days' : 
               timeFrame === '30d' ? 'last30Days' : 
               timeFrame === '90d' ? 'last90Days' : 'last1Year')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPriceStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('currentPrice')}</Text>
          <Text style={styles.statValue}>${currentPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('averagePrice')}</Text>
          <Text style={styles.statValue}>${priceStats.averagePrice.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statWithIcon}>
            <TrendingDown size={16} color={COLORS.success} />
            <Text style={styles.statLabel}>{t('lowestPrice')}</Text>
          </View>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            ${priceStats.lowestPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.statWithIcon}>
            <TrendingUp size={16} color={COLORS.error} />
            <Text style={styles.statLabel}>{t('highestPrice')}</Text>
          </View>
          <Text style={[styles.statValue, { color: COLORS.error }]}>
            ${priceStats.highestPrice.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.priceChangeContainer}>
        <View style={styles.priceChangeRow}>
          {priceStats.priceChange >= 0 ? (
            <TrendingUp size={20} color={COLORS.error} />
          ) : (
            <TrendingDown size={20} color={COLORS.success} />
          )}
          <Text style={styles.priceChangeLabel}>
            {t('priceChange')} ({selectedTimeFrame})
          </Text>
        </View>
        <View style={styles.priceChangeValues}>
          <Text
            style={[
              styles.priceChangeAmount,
              { color: priceStats.priceChange >= 0 ? COLORS.error : COLORS.success },
            ]}
          >
            {priceStats.priceChange >= 0 ? '+' : ''}${priceStats.priceChange.toFixed(2)}
          </Text>
          <Text
            style={[
              styles.priceChangePercent,
              { color: priceStats.priceChange >= 0 ? COLORS.error : COLORS.success },
            ]}
          >
            ({priceStats.priceChange >= 0 ? '+' : ''}{priceStats.priceChangePercent.toFixed(1)}%)
          </Text>
        </View>
      </View>
    </View>
  );

  const renderChart = () => (
    <View style={styles.chartContainer}>
      <LineChart
        data={getChartData()}
        width={screenWidth - SPACING.lg * 2}
        height={220}
        chartConfig={{
          backgroundColor: COLORS.white,
          backgroundGradientFrom: COLORS.white,
          backgroundGradientTo: COLORS.white,
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.7})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: COLORS.primary,
            fill: COLORS.white,
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: COLORS.gray[200],
            strokeWidth: 1,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        formatYLabel={(value) => `$${parseFloat(value).toFixed(0)}`}
      />
    </View>
  );

  const renderPriceAlertSection = () => (
    <View style={styles.alertSection}>
      <View style={styles.alertHeader}>
        <AlertCircle size={20} color={COLORS.accent} />
        <Text style={styles.alertTitle}>{t('priceAlert')}</Text>
      </View>
      <Text style={styles.alertDescription}>
        Get notified when the price drops below your target
      </Text>
      <TouchableOpacity
        style={styles.alertButton}
        onPress={() => {
          if (onSetPriceAlert) {
            const targetPrice = priceStats.lowestPrice * 0.95; // 5% below lowest price
            onSetPriceAlert(targetPrice);
          }
        }}
      >
        <DollarSign size={16} color={COLORS.white} />
        <Text style={styles.alertButtonText}>
          Set Alert for ${(priceStats.lowestPrice * 0.95).toFixed(2)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('priceChart')}</Text>
        <Text style={styles.subtitle}>{productName}</Text>
      </View>

      {renderTimeFrameSelector()}
      {renderPriceStats()}
      {renderChart()}
      {renderPriceAlertSection()}
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
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
  },
  timeFrameSelector: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    padding: 4,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeFrameButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeFrameButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray[600],
  },
  timeFrameButtonTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  statsContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  statWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
    marginBottom: 4,
    marginLeft: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
  },
  priceChangeContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  priceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  priceChangeLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray[700],
    marginLeft: SPACING.sm,
  },
  priceChangeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priceChangeAmount: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  priceChangePercent: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 12,
  },
  alertSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginLeft: SPACING.sm,
  },
  alertDescription: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
    marginBottom: SPACING.lg,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  alertButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
});