import { Share, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { smartNotificationService } from './smartNotifications';

export interface DealShareData {
  productId: string;
  productName: string;
  currentPrice: number;
  originalPrice?: number;
  currency: 'USD' | 'BRL';
  retailer: string;
  productUrl: string;
  imageUrl?: string;
  category: string;
  discount?: number;
  expiryDate?: Date;
  sharedBy?: string;
  referralCode?: string;
}

export interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  isAvailable: boolean;
  urlTemplate?: string;
  deepLinkTemplate?: string;
}

export interface ShareStats {
  totalShares: number;
  platformBreakdown: Record<string, number>;
  clicksGenerated: number;
  conversions: number;
  revenue: number;
  topSharedProducts: string[];
  referralEarnings: number;
}

export interface SocialProof {
  sharedBy: string[];
  totalShares: number;
  recentShares: {
    userName: string;
    platform: string;
    timestamp: Date;
    savings: number;
  }[];
  trending: boolean;
  viralScore: number;
}

class DealSharingService {
  private shareHistory: any[] = [];
  private socialProofCache: Map<string, SocialProof> = new Map();

  constructor() {
    this.loadShareHistory();
  }

  async shareDeal(
    dealData: DealShareData,
    platform: string,
    customMessage?: string
  ): Promise<boolean> {
    try {
      const shareContent = this.generateShareContent(dealData, platform, customMessage);
      const success = await this.executeShare(platform, shareContent, dealData);
      
      if (success) {
        await this.trackShare(dealData, platform);
        await this.updateSocialProof(dealData, platform);
        await this.checkViralAchievements(dealData);
      }
      
      return success;
    } catch (error) {
      console.error('Error sharing deal:', error);
      return false;
    }
  }

  private generateShareContent(
    dealData: DealShareData,
    platform: string,
    customMessage?: string
  ): any {
    const discount = dealData.originalPrice ? 
      Math.round(((dealData.originalPrice - dealData.currentPrice) / dealData.originalPrice) * 100) : 0;
    
    const currency = dealData.currency === 'BRL' ? 'R$' : '$';
    const price = `${currency}${dealData.currentPrice}`;
    const savings = dealData.originalPrice ? 
      `${currency}${(dealData.originalPrice - dealData.currentPrice).toFixed(2)}` : '';

    let message = customMessage || this.getDefaultMessage(dealData, platform);
    
    // Platform-specific content generation
    switch (platform) {
      case 'whatsapp':
        message = this.generateWhatsAppMessage(dealData, discount, price, savings);
        break;
      case 'telegram':
        message = this.generateTelegramMessage(dealData, discount, price, savings);
        break;
      case 'twitter':
        message = this.generateTwitterMessage(dealData, discount, price, savings);
        break;
      case 'instagram':
        message = this.generateInstagramMessage(dealData, discount, price, savings);
        break;
      case 'facebook':
        message = this.generateFacebookMessage(dealData, discount, price, savings);
        break;
    }

    return {
      title: this.generateShareTitle(dealData, discount),
      message,
      url: this.generateTrackingUrl(dealData, platform),
      subject: `Amazing ${discount}% off deal on ${dealData.productName}!`
    };
  }

  private generateWhatsAppMessage(
    dealData: DealShareData,
    discount: number,
    price: string,
    savings: string
  ): string {
    const urgency = dealData.expiryDate ? 
      ` ⏰ Expires ${this.formatTimeLeft(dealData.expiryDate)}` : '';
    
    return `🔥 *AMAZING DEAL ALERT* 🔥

💰 *${dealData.productName}*
💸 Now: *${price}* ${savings ? `(Save ${savings}!)` : ''}
🛍️ At: *${dealData.retailer}*
📈 *${discount}% OFF!*${urgency}

🎯 Found this incredible deal using PriceTracker Pro!

👆 Tap link to grab it: ${this.generateTrackingUrl(dealData, 'whatsapp')}

📱 Download the app and never miss deals:
[App Store Link]

#Deal #Savings #${dealData.category}`;
  }

  private generateTelegramMessage(
    dealData: DealShareData,
    discount: number,
    price: string,
    savings: string
  ): string {
    return `🚨 <b>HOT DEAL ALERT</b> 🚨

💎 <b>${dealData.productName}</b>
💰 Price: <b>${price}</b> ${savings ? `(${savings} savings!)` : ''}
🏪 Store: <b>${dealData.retailer}</b>
📊 Discount: <b>${discount}%</b>

🎯 Found with PriceTracker Pro - Smart Shopping Assistant

🔗 <a href="${this.generateTrackingUrl(dealData, 'telegram')}">Grab this deal now!</a>

Join our deal alerts channel: @PriceTrackerDeals`;
  }

  private generateTwitterMessage(
    dealData: DealShareData,
    discount: number,
    price: string,
    savings: string
  ): string {
    const hashtags = `#Deal #${dealData.category.replace(' ', '')} #Savings #Shopping`;
    const shortName = dealData.productName.length > 30 ? 
      dealData.productName.substring(0, 30) + '...' : dealData.productName;
    
    return `🔥 ${discount}% OFF ${shortName}!

💰 ${price} at ${dealData.retailer}
${savings ? `💸 Save ${savings}` : ''}

Found with @PriceTrackerPro 📱

${this.generateTrackingUrl(dealData, 'twitter')}

${hashtags}`;
  }

  private generateInstagramMessage(
    dealData: DealShareData,
    discount: number,
    price: string,
    savings: string
  ): string {
    return `🛍️ DEAL OF THE DAY 🛍️

✨ ${dealData.productName}
💰 ${price} (${discount}% off!)
🏪 ${dealData.retailer}
${savings ? `💸 You save ${savings}!` : ''}

🎯 Found using PriceTracker Pro - the smartest way to shop!

Tap link in bio for more amazing deals 📲

#shopping #deals #savings #${dealData.category.toLowerCase().replace(' ', '')} #pricetracker #smartshopping #dealoftheday`;
  }

  private generateFacebookMessage(
    dealData: DealShareData,
    discount: number,
    price: string,
    savings: string
  ): string {
    const urgency = dealData.expiryDate ? 
      `\n\n⏰ Limited time offer - expires ${this.formatTimeLeft(dealData.expiryDate)}!` : '';
    
    return `🎉 Found an incredible deal to share with everyone!

🛍️ ${dealData.productName}
💰 ${price} at ${dealData.retailer}
📈 ${discount}% discount ${savings ? `- save ${savings}!` : ''}

I'm using PriceTracker Pro to find the best deals automatically. It compares prices across all major retailers and alerts me when prices drop!${urgency}

Check it out: ${this.generateTrackingUrl(dealData, 'facebook')}

#deals #shopping #savings #${dealData.category}`;
  }

  private generateShareTitle(dealData: DealShareData, discount: number): string {
    return `${discount}% OFF ${dealData.productName} at ${dealData.retailer}!`;
  }

  private generateTrackingUrl(dealData: DealShareData, platform: string): string {
    const baseUrl = dealData.productUrl;
    const params = new URLSearchParams({
      utm_source: 'pricetracker_app',
      utm_medium: 'social_share',
      utm_campaign: platform,
      utm_content: dealData.productId,
      ref: dealData.referralCode || 'shared_deal'
    });
    
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  private async executeShare(
    platform: string,
    content: any,
    dealData: DealShareData
  ): Promise<boolean> {
    switch (platform) {
      case 'native':
        return this.shareNative(content);
      case 'whatsapp':
        return this.shareWhatsApp(content.message);
      case 'telegram':
        return this.shareTelegram(content.message);
      case 'twitter':
        return this.shareTwitter(content.message);
      case 'copy':
        return this.copyToClipboard(content.message, content.url);
      case 'instagram':
        return this.shareInstagram(content);
      case 'facebook':
        return this.shareFacebook(content);
      default:
        return this.shareNative(content);
    }
  }

  private async shareNative(content: any): Promise<boolean> {
    try {
      const result = await Share.share({
        title: content.title,
        message: content.message,
        url: content.url,
      });
      
      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Native share error:', error);
      return false;
    }
  }

  private async shareWhatsApp(message: string): Promise<boolean> {
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        Alert.alert(
          'WhatsApp not installed',
          'Please install WhatsApp to share deals with friends!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Copy Message', onPress: () => Clipboard.setStringAsync(message) }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('WhatsApp share error:', error);
      return false;
    }
  }

  private async shareTelegram(message: string): Promise<boolean> {
    try {
      const url = `tg://msg?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web version
        const webUrl = `https://t.me/share/url?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      console.error('Telegram share error:', error);
      return false;
    }
  }

  private async shareTwitter(message: string): Promise<boolean> {
    try {
      const url = `twitter://post?message=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web version
        const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      console.error('Twitter share error:', error);
      return false;
    }
  }

  private async shareInstagram(content: any): Promise<boolean> {
    try {
      // Instagram doesn't support direct text sharing, so we copy to clipboard
      await Clipboard.setStringAsync(content.message);
      
      const url = 'instagram://app';
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        Alert.alert(
          'Content Copied!',
          'Your deal message has been copied to clipboard. Paste it in your Instagram story or post!',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert(
          'Instagram not installed',
          'Please install Instagram to share deals!',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Instagram share error:', error);
      return false;
    }
  }

  private async shareFacebook(content: any): Promise<boolean> {
    try {
      const url = `fb://facewebmodal/f?href=${encodeURIComponent('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(content.url) + '&quote=' + encodeURIComponent(content.message))}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web version
        const webUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}&quote=${encodeURIComponent(content.message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      console.error('Facebook share error:', error);
      return false;
    }
  }

  private async copyToClipboard(message: string, url: string): Promise<boolean> {
    try {
      const fullContent = `${message}\n\n🔗 ${url}`;
      await Clipboard.setStringAsync(fullContent);
      
      Alert.alert(
        '📋 Copied to Clipboard!',
        'Deal information copied. You can now paste it anywhere!',
        [{ text: 'Great!' }]
      );
      
      return true;
    } catch (error) {
      console.error('Clipboard error:', error);
      return false;
    }
  }

  private async trackShare(dealData: DealShareData, platform: string): Promise<void> {
    const shareRecord = {
      productId: dealData.productId,
      platform,
      timestamp: new Date().toISOString(),
      productName: dealData.productName,
      retailer: dealData.retailer,
      price: dealData.currentPrice,
      discount: dealData.originalPrice ? 
        Math.round(((dealData.originalPrice - dealData.currentPrice) / dealData.originalPrice) * 100) : 0
    };
    
    this.shareHistory.push(shareRecord);
    
    // Keep only last 100 shares
    if (this.shareHistory.length > 100) {
      this.shareHistory = this.shareHistory.slice(-100);
    }
    
    await AsyncStorage.setItem('share_history', JSON.stringify(this.shareHistory));
  }

  private async updateSocialProof(dealData: DealShareData, platform: string): Promise<void> {
    const productId = dealData.productId;
    let proof = this.socialProofCache.get(productId) || {
      sharedBy: [],
      totalShares: 0,
      recentShares: [],
      trending: false,
      viralScore: 0
    };
    
    proof.totalShares++;
    proof.recentShares.push({
      userName: 'Anonymous User', // In real app, use actual user name
      platform,
      timestamp: new Date(),
      savings: dealData.originalPrice ? dealData.originalPrice - dealData.currentPrice : 0
    });
    
    // Keep only last 10 recent shares
    proof.recentShares = proof.recentShares.slice(-10);
    
    // Calculate viral score
    proof.viralScore = this.calculateViralScore(proof);
    proof.trending = proof.viralScore > 70;
    
    this.socialProofCache.set(productId, proof);
  }

  private calculateViralScore(proof: SocialProof): number {
    const recentShares = proof.recentShares.filter(
      share => Date.now() - share.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    const baseScore = Math.min(recentShares.length * 10, 50); // Max 50 points for shares
    const diversityBonus = new Set(recentShares.map(s => s.platform)).size * 5; // Platform diversity
    const savingsBonus = Math.min(
      recentShares.reduce((sum, s) => sum + s.savings, 0) / 100, 30
    ); // Savings amount bonus
    
    return Math.min(baseScore + diversityBonus + savingsBonus, 100);
  }

  private async checkViralAchievements(dealData: DealShareData): Promise<void> {
    const userShares = this.shareHistory.filter(
      share => share.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );
    
    // Check for achievements
    if (userShares.length === 1) {
      // First share achievement
      await smartNotificationService.sendSmartNotification(
        'achievement_first_share',
        {
          type: 'achievement',
          priority: 'normal',
          timing: 'immediate',
          context: {},
          personalization: { show_social_proof: true }
        },
        {
          title: '🎉 First Share Achievement!',
          body: 'You just shared your first deal! Earn points by sharing great deals with friends.',
          data: { type: 'first_share', points: 10 }
        }
      );
    } else if (userShares.length === 5) {
      // Social butterfly achievement
      await smartNotificationService.sendSmartNotification(
        'achievement_social_butterfly',
        {
          type: 'achievement',
          priority: 'normal',
          timing: 'immediate',
          context: {},
          personalization: { show_social_proof: true }
        },
        {
          title: '🦋 Social Butterfly!',
          body: 'You shared 5 deals this week! You\'re helping friends save money.',
          data: { type: 'social_butterfly', points: 50 }
        }
      );
    }
  }

  private formatTimeLeft(expiryDate: Date): string {
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'EXPIRED';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  }

  private getDefaultMessage(dealData: DealShareData, platform: string): string {
    const discount = dealData.originalPrice ? 
      Math.round(((dealData.originalPrice - dealData.currentPrice) / dealData.originalPrice) * 100) : 0;
    
    return `Check out this ${discount}% off deal on ${dealData.productName} at ${dealData.retailer}!`;
  }

  async getSupportedPlatforms(): Promise<SharePlatform[]> {
    const platforms: SharePlatform[] = [
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: '📱',
        color: '#25D366',
        isAvailable: await Linking.canOpenURL('whatsapp://send'),
      },
      {
        id: 'telegram',
        name: 'Telegram',
        icon: '✈️',
        color: '#0088CC',
        isAvailable: true, // Always available via web fallback
      },
      {
        id: 'twitter',
        name: 'Twitter',
        icon: '🐦',
        color: '#1DA1F2',
        isAvailable: true, // Always available via web fallback
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: '📷',
        color: '#E4405F',
        isAvailable: await Linking.canOpenURL('instagram://app'),
      },
      {
        id: 'facebook',
        name: 'Facebook',
        icon: '👤',
        color: '#1877F2',
        isAvailable: true, // Always available via web fallback
      },
      {
        id: 'copy',
        name: 'Copy Link',
        icon: '📋',
        color: '#666666',
        isAvailable: true,
      },
      {
        id: 'native',
        name: 'More Options',
        icon: '📤',
        color: '#007AFF',
        isAvailable: true,
      }
    ];
    
    return platforms;
  }

  async getShareStats(): Promise<ShareStats> {
    const platformBreakdown: Record<string, number> = {};
    let totalShares = 0;
    let topProducts: Record<string, number> = {};
    
    this.shareHistory.forEach(share => {
      totalShares++;
      platformBreakdown[share.platform] = (platformBreakdown[share.platform] || 0) + 1;
      topProducts[share.productName] = (topProducts[share.productName] || 0) + 1;
    });
    
    const topSharedProducts = Object.entries(topProducts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);
    
    return {
      totalShares,
      platformBreakdown,
      clicksGenerated: Math.floor(totalShares * 2.3), // Estimated
      conversions: Math.floor(totalShares * 0.15), // Estimated
      revenue: Math.floor(totalShares * 12.5), // Estimated
      topSharedProducts,
      referralEarnings: Math.floor(totalShares * 1.25) // Estimated
    };
  }

  async getSocialProof(productId: string): Promise<SocialProof | null> {
    return this.socialProofCache.get(productId) || null;
  }

  private async loadShareHistory(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('share_history');
      if (saved) {
        this.shareHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading share history:', error);
    }
  }

  async clearShareHistory(): Promise<void> {
    this.shareHistory = [];
    await AsyncStorage.removeItem('share_history');
  }
}

export const dealSharingService = new DealSharingService();