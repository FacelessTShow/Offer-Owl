import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SmartNotificationConfig {
  type: 'price_drop' | 'stock_alert' | 'deal_expiring' | 'flash_deal' | 'payday_reminder' | 'achievement';
  priority: 'low' | 'normal' | 'high' | 'critical';
  timing: 'immediate' | 'optimal_hour' | 'payday_week' | 'weekend';
  context: {
    userTimezone?: string;
    paycheck_date?: Date;
    shopping_patterns?: string[];
    location?: string;
    budget_range?: [number, number];
  };
  personalization: {
    use_name?: boolean;
    include_savings?: boolean;
    show_social_proof?: boolean;
    add_urgency?: boolean;
  };
}

export interface NotificationContent {
  title: string;
  body: string;
  subtitle?: string;
  data: any;
  categoryIdentifier?: string;
  actions?: NotificationAction[];
  image?: string;
  sound?: string;
}

export interface NotificationAction {
  identifier: string;
  buttonTitle: string;
  options?: {
    foreground?: boolean;
    destructive?: boolean;
    authenticationRequired?: boolean;
  };
}

export interface UserNotificationPreferences {
  enabled: boolean;
  priceDrops: boolean;
  stockAlerts: boolean;
  flashDeals: boolean;
  achievements: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  optimalTiming: boolean;
  maxPerDay: number;
  categories: string[];
  minimumDiscount: number; // percentage
}

class SmartNotificationService {
  private isConfigured = false;
  private userPreferences: UserNotificationPreferences | null = null;
  private notificationHistory: any[] = [];

  constructor() {
    this.initializeNotifications();
  }

  async initializeNotifications() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }

      // Configure notification categories with actions
      await this.setupNotificationCategories();
      
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const preferences = await this.getUserPreferences();
          
          // Check quiet hours
          if (preferences.quietHours.enabled && this.isQuietHour(preferences.quietHours)) {
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }

          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        },
      });

      this.isConfigured = true;
    }
  }

  private async setupNotificationCategories() {
    const categories = [
      {
        identifier: 'PRICE_DROP',
        actions: [
          {
            identifier: 'VIEW_DEAL',
            buttonTitle: '🛍️ View Deal',
            options: { foreground: true }
          },
          {
            identifier: 'SHARE_DEAL',
            buttonTitle: '📤 Share',
            options: { foreground: false }
          },
          {
            identifier: 'SET_REMINDER',
            buttonTitle: '⏰ Remind Later',
            options: { foreground: false }
          }
        ],
        options: { allowInCarPlay: false }
      },
      {
        identifier: 'FLASH_DEAL',
        actions: [
          {
            identifier: 'VIEW_DEAL',
            buttonTitle: '⚡ Grab Deal',
            options: { foreground: true }
          },
          {
            identifier: 'SHARE_URGENT',
            buttonTitle: '🚨 Share Now',
            options: { foreground: false }
          }
        ],
        options: { allowInCarPlay: false }
      },
      {
        identifier: 'ACHIEVEMENT',
        actions: [
          {
            identifier: 'VIEW_PROGRESS',
            buttonTitle: '🏆 View Progress',
            options: { foreground: true }
          },
          {
            identifier: 'SHARE_ACHIEVEMENT',
            buttonTitle: '✨ Share Achievement',
            options: { foreground: false }
          }
        ],
        options: { allowInCarPlay: false }
      }
    ];

    await Notifications.setNotificationCategoryAsync('PRICE_DROP', categories[0]);
    await Notifications.setNotificationCategoryAsync('FLASH_DEAL', categories[1]);
    await Notifications.setNotificationCategoryAsync('ACHIEVEMENT', categories[2]);
  }

  async sendSmartNotification(
    productId: string,
    config: SmartNotificationConfig,
    customContent?: Partial<NotificationContent>
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Notifications not configured');
      return false;
    }

    const preferences = await this.getUserPreferences();
    
    // Check if this type of notification is enabled
    if (!this.isNotificationTypeEnabled(config.type, preferences)) {
      return false;
    }

    // Check daily limit
    if (await this.hasExceededDailyLimit(preferences.maxPerDay)) {
      return false;
    }

    // Generate smart content
    const content = await this.generateSmartContent(productId, config, customContent);
    
    // Calculate optimal timing
    const deliveryTime = await this.calculateOptimalTiming(config, preferences);

    // Schedule notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        subtitle: content.subtitle,
        data: {
          productId,
          type: config.type,
          timestamp: new Date().toISOString(),
          ...content.data
        },
        categoryIdentifier: this.getCategoryIdentifier(config.type),
        sound: content.sound || this.getOptimalSound(config),
      },
      trigger: deliveryTime
    });

    // Track notification
    await this.trackNotification(identifier, config, content);

    return true;
  }

  private async generateSmartContent(
    productId: string,
    config: SmartNotificationConfig,
    customContent?: Partial<NotificationContent>
  ): Promise<NotificationContent> {
    const userPrefs = await this.getUserPreferences();
    const product = await this.getProductInfo(productId);
    const context = config.context;

    let title = '';
    let body = '';
    let subtitle = '';

    switch (config.type) {
      case 'price_drop':
        title = this.generatePriceDropTitle(product, config.personalization);
        body = this.generatePriceDropBody(product, context, config.personalization);
        subtitle = this.generatePriceDropSubtitle(product);
        break;
        
      case 'flash_deal':
        title = this.generateFlashDealTitle(product, config.personalization);
        body = this.generateFlashDealBody(product, context, config.personalization);
        subtitle = `⚡ Limited Time Offer`;
        break;
        
      case 'stock_alert':
        title = `📦 Back in Stock!`;
        body = `${product.name} is available again at ${product.retailer}. Price: ${product.price}`;
        break;
        
      case 'achievement':
        title = '🏆 Achievement Unlocked!';
        body = customContent?.body || 'You reached a new milestone!';
        break;
        
      case 'payday_reminder':
        title = '💰 Payday Deal Reminder';
        body = `Your wishlist items are ready! Perfect timing for your paycheck.`;
        break;
    }

    return {
      title: customContent?.title || title,
      body: customContent?.body || body,
      subtitle: customContent?.subtitle || subtitle,
      data: customContent?.data || {},
      actions: this.generateNotificationActions(config.type),
      image: customContent?.image,
      sound: customContent?.sound
    };
  }

  private generatePriceDropTitle(product: any, personalization: any): string {
    const emojis = ['💰', '🔥', '⬇️', '🎯'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const variations = [
      `${emoji} Price Drop Alert!`,
      `${emoji} Great Deal Found!`,
      `${emoji} Price Dropped!`,
      `${emoji} Save Money Alert!`
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
  }

  private generatePriceDropBody(product: any, context: any, personalization: any): string {
    const discount = product.originalPrice ? 
      Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    
    const baseMessage = `${product.name} dropped to ${product.currency === 'BRL' ? 'R$' : '$'}${product.price}`;
    
    let message = baseMessage;
    
    if (discount > 0) {
      message += ` (${discount}% off!)`;
    }
    
    if (personalization.show_social_proof) {
      const users = Math.floor(Math.random() * 50) + 10;
      message += `\n\n${users} users are tracking this deal`;
    }
    
    if (personalization.add_urgency && product.availability === 'limited_stock') {
      message += '\n⚠️ Limited stock available';
    }
    
    if (context.paycheck_date) {
      const days = Math.ceil((new Date(context.paycheck_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 3) {
        message += '\n💰 Perfect timing for payday!';
      }
    }
    
    return message;
  }

  private generatePriceDropSubtitle(product: any): string {
    const savings = product.originalPrice ? product.originalPrice - product.price : 0;
    const currency = product.currency === 'BRL' ? 'R$' : '$';
    
    if (savings > 0) {
      return `Save ${currency}${savings.toFixed(2)} at ${product.retailer}`;
    }
    
    return `Best price at ${product.retailer}`;
  }

  private generateFlashDealTitle(product: any, personalization: any): string {
    const urgentEmojis = ['⚡', '🚨', '🔥', '💥'];
    const emoji = urgentEmojis[Math.floor(Math.random() * urgentEmojis.length)];
    
    return `${emoji} Flash Deal Alert!`;
  }

  private generateFlashDealBody(product: any, context: any, personalization: any): string {
    const timeLeft = this.calculateTimeLeft(product.dealExpiry);
    let message = `${product.name} - FLASH SALE!\n${product.currency === 'BRL' ? 'R$' : '$'}${product.price}`;
    
    if (timeLeft) {
      message += `\n⏰ Expires in ${timeLeft}`;
    }
    
    if (personalization.show_social_proof) {
      const grabbed = Math.floor(Math.random() * 20) + 5;
      message += `\n🏃‍♂️ ${grabbed} people already grabbed this!`;
    }
    
    return message;
  }

  private async calculateOptimalTiming(
    config: SmartNotificationConfig,
    preferences: UserNotificationPreferences
  ): Promise<any> {
    const now = new Date();
    
    switch (config.timing) {
      case 'immediate':
        return null; // Send immediately
        
      case 'optimal_hour':
        if (!preferences.optimalTiming) return null;
        
        // Get user's optimal shopping hours (based on their activity patterns)
        const optimalHours = await this.getUserOptimalHours();
        const nextOptimalTime = this.getNextOptimalTime(optimalHours);
        
        // Don't delay critical notifications too long
        if (config.priority === 'critical' || config.type === 'flash_deal') {
          const maxDelay = 30 * 60 * 1000; // 30 minutes
          if (nextOptimalTime.getTime() - now.getTime() > maxDelay) {
            return null;
          }
        }
        
        return nextOptimalTime;
        
      case 'payday_week':
        if (!config.context.paycheck_date) return null;
        
        const paydayWeek = new Date(config.context.paycheck_date);
        paydayWeek.setDate(paydayWeek.getDate() - 2); // 2 days before payday
        
        return paydayWeek > now ? paydayWeek : null;
        
      case 'weekend':
        const weekend = this.getNextWeekend();
        return weekend;
        
      default:
        return null;
    }
  }

  private async getUserOptimalHours(): Promise<number[]> {
    // In a real app, this would analyze user behavior patterns
    // For now, return common shopping hours
    const saved = await AsyncStorage.getItem('user_optimal_hours');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Default optimal hours: 10am, 2pm, 7pm
    return [10, 14, 19];
  }

  private getNextOptimalTime(optimalHours: number[]): Date {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find next optimal hour today
    const todayOptimal = optimalHours.find(hour => hour > currentHour);
    
    if (todayOptimal) {
      const nextTime = new Date(now);
      nextTime.setHours(todayOptimal, 0, 0, 0);
      return nextTime;
    }
    
    // Use first optimal hour tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(optimalHours[0], 0, 0, 0);
    
    return tomorrow;
  }

  private getNextWeekend(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSaturday = 6 - dayOfWeek;
    
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    saturday.setHours(10, 0, 0, 0); // Saturday 10am
    
    return saturday;
  }

  private generateNotificationActions(type: string): NotificationAction[] {
    switch (type) {
      case 'price_drop':
      case 'stock_alert':
        return [
          {
            identifier: 'VIEW_DEAL',
            buttonTitle: '🛍️ View Deal',
            options: { foreground: true }
          },
          {
            identifier: 'SHARE_DEAL',
            buttonTitle: '📤 Share',
            options: { foreground: false }
          }
        ];
        
      case 'flash_deal':
        return [
          {
            identifier: 'VIEW_DEAL',
            buttonTitle: '⚡ Grab Now',
            options: { foreground: true }
          },
          {
            identifier: 'SHARE_URGENT',
            buttonTitle: '🚨 Share',
            options: { foreground: false }
          }
        ];
        
      case 'achievement':
        return [
          {
            identifier: 'VIEW_PROGRESS',
            buttonTitle: '🏆 View',
            options: { foreground: true }
          },
          {
            identifier: 'SHARE_ACHIEVEMENT',
            buttonTitle: '✨ Share',
            options: { foreground: false }
          }
        ];
        
      default:
        return [];
    }
  }

  private getCategoryIdentifier(type: string): string {
    switch (type) {
      case 'price_drop':
      case 'stock_alert':
        return 'PRICE_DROP';
      case 'flash_deal':
        return 'FLASH_DEAL';
      case 'achievement':
        return 'ACHIEVEMENT';
      default:
        return 'DEFAULT';
    }
  }

  private getOptimalSound(config: SmartNotificationConfig): string {
    if (config.priority === 'critical' || config.type === 'flash_deal') {
      return 'urgent.wav';
    }
    if (config.type === 'achievement') {
      return 'celebration.wav';
    }
    return 'default';
  }

  private isNotificationTypeEnabled(
    type: string,
    preferences: UserNotificationPreferences
  ): boolean {
    if (!preferences.enabled) return false;
    
    switch (type) {
      case 'price_drop':
        return preferences.priceDrops;
      case 'stock_alert':
        return preferences.stockAlerts;
      case 'flash_deal':
        return preferences.flashDeals;
      case 'achievement':
        return preferences.achievements;
      default:
        return true;
    }
  }

  private isQuietHour(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(quietHours.start);
    const endTime = this.parseTime(quietHours.end);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  private async hasExceededDailyLimit(maxPerDay: number): Promise<boolean> {
    const today = new Date().toDateString();
    const todayHistory = this.notificationHistory.filter(
      notification => new Date(notification.timestamp).toDateString() === today
    );
    
    return todayHistory.length >= maxPerDay;
  }

  private async trackNotification(
    identifier: string,
    config: SmartNotificationConfig,
    content: NotificationContent
  ): Promise<void> {
    const record = {
      identifier,
      type: config.type,
      title: content.title,
      timestamp: new Date().toISOString(),
      delivered: true
    };
    
    this.notificationHistory.push(record);
    
    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.notificationHistory = this.notificationHistory.filter(
      record => new Date(record.timestamp) > thirtyDaysAgo
    );
    
    // Save to storage
    await AsyncStorage.setItem(
      'notification_history',
      JSON.stringify(this.notificationHistory)
    );
  }

  private calculateTimeLeft(expiryDate?: Date): string | null {
    if (!expiryDate) return null;
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private async getProductInfo(productId: string): Promise<any> {
    // In a real app, this would fetch from your API
    // For now, return mock data
    return {
      id: productId,
      name: 'iPhone 15 Pro',
      price: 999.99,
      originalPrice: 1199.99,
      currency: 'USD',
      retailer: 'Amazon',
      availability: 'in_stock'
    };
  }

  async getUserPreferences(): Promise<UserNotificationPreferences> {
    if (this.userPreferences) {
      return this.userPreferences;
    }
    
    const saved = await AsyncStorage.getItem('notification_preferences');
    if (saved) {
      this.userPreferences = JSON.parse(saved);
      return this.userPreferences;
    }
    
    // Default preferences
    this.userPreferences = {
      enabled: true,
      priceDrops: true,
      stockAlerts: true,
      flashDeals: true,
      achievements: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      },
      optimalTiming: true,
      maxPerDay: 10,
      categories: [],
      minimumDiscount: 10
    };
    
    return this.userPreferences;
  }

  async updateUserPreferences(
    preferences: Partial<UserNotificationPreferences>
  ): Promise<void> {
    const current = await this.getUserPreferences();
    this.userPreferences = { ...current, ...preferences };
    
    await AsyncStorage.setItem(
      'notification_preferences',
      JSON.stringify(this.userPreferences)
    );
  }

  async getPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
      return null;
    }
    
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }
}

export const smartNotificationService = new SmartNotificationService();