import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { smartNotificationService } from '../services/smartNotifications';
import { dealSharingService } from '../services/dealSharingService';
import { gamificationService } from '../services/gamificationService';
import { DealSharingButton } from './DealSharingButton';
import { useTranslation } from 'react-i18next';

export const SmartNotificationDemo: React.FC = () => {
  const { t } = useTranslation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [animatedValue] = useState(new Animated.Value(0));

  // Demo deal data
  const sampleDeal = {
    productId: 'iphone15pro',
    productName: 'iPhone 15 Pro 256GB',
    currentPrice: 999.99,
    originalPrice: 1199.99,
    currency: 'USD' as const,
    retailer: 'Amazon',
    productUrl: 'https://amazon.com/iphone15pro',
    imageUrl: 'https://example.com/iphone.jpg',
    category: 'Electronics',
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };

  useEffect(() => {
    loadUserData();
    startAnimation();
  }, []);

  const startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadUserData = async () => {
    try {
      const profile = await gamificationService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Demo: Smart Notification with contextual timing
  const sendSmartPriceDropNotification = async () => {
    try {
      const success = await smartNotificationService.sendSmartNotification(
        sampleDeal.productId,
        {
          type: 'price_drop',
          priority: 'high',
          timing: 'optimal_hour',
          context: {
            userTimezone: 'America/New_York',
            paycheck_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            shopping_patterns: ['electronics', 'tech'],
            budget_range: [800, 1200]
          },
          personalization: {
            use_name: true,
            include_savings: true,
            show_social_proof: true,
            add_urgency: true
          }
        }
      );

      if (success) {
        Alert.alert(
          '🎯 Smart Notification Sent!',
          'Your personalized price drop alert has been scheduled for optimal delivery time.'
        );
        
        // Award points for smart shopping
        await gamificationService.onProductTracked(sampleDeal.productId, 200);
        
        // Update UI
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'price_drop',
          product: sampleDeal.productName,
          savings: 200,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  // Demo: Flash Deal with urgent timing
  const sendFlashDealNotification = async () => {
    try {
      const success = await smartNotificationService.sendSmartNotification(
        'flash_deal_' + Date.now(),
        {
          type: 'flash_deal',
          priority: 'critical',
          timing: 'immediate',
          context: {},
          personalization: {
            show_social_proof: true,
            add_urgency: true
          }
        },
        {
          title: '⚡ FLASH DEAL ALERT!',
          body: `${sampleDeal.productName} - Limited time offer! Only 2 hours left at this price.`,
          data: { dealId: 'flash_' + Date.now() }
        }
      );

      if (success) {
        Alert.alert('⚡ Flash Deal Alert Sent!', 'Urgent notification delivered immediately');
        await gamificationService.onProductTracked('flash_deal', 0);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send flash deal notification');
    }
  };

  // Demo: Achievement notification
  const simulateAchievement = async () => {
    try {
      const success = await smartNotificationService.sendSmartNotification(
        'achievement_demo',
        {
          type: 'achievement',
          priority: 'normal',
          timing: 'immediate',
          context: {},
          personalization: { show_social_proof: true }
        },
        {
          title: '🏆 Achievement Unlocked!',
          body: 'Congratulations! You\'ve saved $500 this month through smart shopping!',
          data: { 
            type: 'savings_master', 
            points: 100,
            totalSavings: 500
          }
        }
      );

      if (success) {
        // Award achievement points
        await gamificationService.earnPoints(100, 'Achievement unlocked: Savings Master', 'achievement');
        
        Alert.alert(
          '🎉 Achievement Unlocked!',
          'Savings Master achievement! You earned 100 points.'
        );
        
        loadUserData(); // Refresh user profile
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger achievement');
    }
  };

  // Demo: Deal sharing with gamification
  const handleDealShareSuccess = async (platform: string) => {
    Alert.alert(
      '📤 Deal Shared Successfully!',
      `Your deal was shared on ${platform}. You earned 10 points for helping friends save money!`
    );
    
    // Update user data after sharing
    loadUserData();
  };

  // Demo: App session tracking
  const simulateAppSession = async () => {
    await gamificationService.onAppSessionStart();
    Alert.alert(
      '📱 Daily Bonus!',
      'Welcome back! You earned 2 points for using the app today.'
    );
    loadUserData();
  };

  // Demo: Price comparison action
  const simulatePriceComparison = async () => {
    await gamificationService.onPriceComparison(5); // Compared across 5 retailers
    Alert.alert(
      '🔍 Smart Shopping!',
      'You compared prices across 5 retailers! Earned 2 points.'
    );
    loadUserData();
  };

  const pulsate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05]
  });

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animated.Text 
          style={[
            styles.headerTitle,
            { transform: [{ scale: pulsate }] }
          ]}
        >
          🚀 Smart Features Demo
        </Animated.Text>
        <Text style={styles.headerSubtitle}>
          Experience AI-powered notifications, viral sharing, and gamification
        </Text>
      </LinearGradient>

      {/* User Profile Card */}
      {userProfile && (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileIcon}>{userProfile.level.icon}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.username}</Text>
              <Text style={styles.profileLevel}>{userProfile.level.name}</Text>
            </View>
            <View style={styles.profileStats}>
              <Text style={styles.profilePoints}>{userProfile.totalPoints}</Text>
              <Text style={styles.profilePointsLabel}>points</Text>
            </View>
          </View>
          <Text style={styles.profileSavings}>
            💰 Total Saved: ${userProfile.lifetimeSavings.toFixed(2)}
          </Text>
          <Text style={styles.profileStreak}>
            🔥 Current Streak: {userProfile.currentStreak} days
          </Text>
        </View>
      )}

      {/* Demo Product Card */}
      <View style={styles.productCard}>
        <Text style={styles.productTitle}>{sampleDeal.productName}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>${sampleDeal.currentPrice}</Text>
          <Text style={styles.originalPrice}>${sampleDeal.originalPrice}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(((sampleDeal.originalPrice - sampleDeal.currentPrice) / sampleDeal.originalPrice) * 100)}% OFF
            </Text>
          </View>
        </View>
        <Text style={styles.retailer}>Available at {sampleDeal.retailer}</Text>
        
        {/* Deal Sharing Component */}
        <View style={styles.sharingSection}>
          <Text style={styles.sectionTitle}>📤 Viral Sharing</Text>
          <DealSharingButton
            deal={sampleDeal}
            size="large"
            variant="primary"
            showSocialProof={true}
            onShareSuccess={handleDealShareSuccess}
            style={styles.shareButton}
          />
        </View>
      </View>

      {/* Smart Notifications Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 Smart Notifications</Text>
        <Text style={styles.sectionDescription}>
          AI-powered notifications with optimal timing and personalization
        </Text>
        
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={sendSmartPriceDropNotification}
        >
          <Text style={styles.demoButtonText}>💰 Send Smart Price Drop Alert</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.demoButton, styles.urgentButton]}
          onPress={sendFlashDealNotification}
        >
          <Text style={styles.demoButtonText}>⚡ Send Flash Deal Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Gamification Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Gamification System</Text>
        <Text style={styles.sectionDescription}>
          Reward users for smart shopping behaviors
        </Text>
        
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={simulateAchievement}
        >
          <Text style={styles.demoButtonText}>🏆 Unlock Achievement</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={simulateAppSession}
        >
          <Text style={styles.demoButtonText}>📱 Daily App Usage Bonus</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={simulatePriceComparison}
        >
          <Text style={styles.demoButtonText}>🔍 Price Comparison Action</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recent Activity</Text>
          {notifications.slice(-3).map((notification) => (
            <View key={notification.id} style={styles.activityItem}>
              <Text style={styles.activityIcon}>
                {notification.type === 'price_drop' ? '💰' : 
                 notification.type === 'achievement' ? '🏆' : '⚡'}
              </Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {notification.type === 'price_drop' ? 
                    `Price drop alert for ${notification.product}` :
                    `${notification.type} notification sent`}
                </Text>
                <Text style={styles.activityTime}>
                  {notification.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              {notification.savings && (
                <Text style={styles.activitySavings}>
                  +${notification.savings}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Feature Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Features Implemented</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>🧠 Smart notifications with optimal timing</Text>
          <Text style={styles.featureItem}>📤 Viral deal sharing across platforms</Text>
          <Text style={styles.featureItem}>🎮 Comprehensive gamification system</Text>
          <Text style={styles.featureItem}>🏆 Achievement and points system</Text>
          <Text style={styles.featureItem}>📊 Social proof and viral mechanics</Text>
          <Text style={styles.featureItem}>⚡ Real-time engagement tracking</Text>
          <Text style={styles.featureItem}>🎯 Contextual personalization</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  profileLevel: {
    fontSize: 14,
    color: '#666',
  },
  profileStats: {
    alignItems: 'center',
  },
  profilePoints: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  profilePointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  profileSavings: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileStreak: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B6B',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  retailer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sharingSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
    marginTop: 16,
  },
  shareButton: {
    marginTop: 12,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  demoButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  urgentButton: {
    backgroundColor: '#FF3B30',
  },
  demoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activitySavings: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    paddingLeft: 8,
  },
});

export default SmartNotificationDemo;