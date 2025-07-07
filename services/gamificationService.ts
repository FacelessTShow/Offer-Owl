import AsyncStorage from '@react-native-async-storage/async-storage';
import { smartNotificationService } from './smartNotifications';

export interface UserLevel {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  color: string;
  benefits: string[];
  badgeUrl?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  category: 'shopping' | 'social' | 'savings' | 'streak' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  requirements?: {
    type: string;
    value: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  }[];
}

export interface UserProfile {
  userId: string;
  username: string;
  avatar?: string;
  level: UserLevel;
  totalPoints: number;
  lifetimeSavings: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  badges: string[];
  stats: {
    dealsShared: number;
    pricesTracked: number;
    moneyAlertsSaved: number;
    successfulPurchases: number;
    referralsInvited: number;
    joinedAt: Date;
    lastActive: Date;
  };
  preferences: {
    publicProfile: boolean;
    showInLeaderboard: boolean;
    achievementNotifications: boolean;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  points: number;
  level: UserLevel;
  totalSavings: number;
  trend: 'up' | 'down' | 'same';
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  target: number;
  progress: number;
  type: 'track_deals' | 'share_deals' | 'save_money' | 'use_app' | 'compare_prices';
  expiresAt: Date;
  completed: boolean;
}

export interface PointTransaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus';
  points: number;
  reason: string;
  category: string;
  timestamp: Date;
  metadata?: any;
}

class GamificationService {
  private userProfile: UserProfile | null = null;
  private pointsHistory: PointTransaction[] = [];
  private dailyChallenges: DailyChallenge[] = [];

  constructor() {
    this.loadUserProfile();
    this.generateDailyChallenges();
  }

  // User Levels Definition
  private levels: UserLevel[] = [
    {
      id: 'bronze',
      name: 'Bronze Bargain Hunter',
      minPoints: 0,
      maxPoints: 499,
      icon: '🥉',
      color: '#CD7F32',
      benefits: ['Basic price alerts', 'Deal sharing']
    },
    {
      id: 'silver',
      name: 'Silver Saver',
      minPoints: 500,
      maxPoints: 1499,
      icon: '🥈',
      color: '#C0C0C0',
      benefits: ['Advanced notifications', 'Price history', 'Early deal access']
    },
    {
      id: 'gold',
      name: 'Gold Deal Master',
      minPoints: 1500,
      maxPoints: 3999,
      icon: '🥇',
      color: '#FFD700',
      benefits: ['Premium features', 'Exclusive deals', 'Priority support']
    },
    {
      id: 'platinum',
      name: 'Platinum Price Pro',
      minPoints: 4000,
      maxPoints: 9999,
      icon: '💎',
      color: '#E5E4E2',
      benefits: ['VIP access', 'Personal deal curator', 'Cashback bonuses']
    },
    {
      id: 'diamond',
      name: 'Diamond Deal Legend',
      minPoints: 10000,
      maxPoints: 24999,
      icon: '💍',
      color: '#B9F2FF',
      benefits: ['Maximum privileges', 'Exclusive events', 'Custom features']
    },
    {
      id: 'master',
      name: 'Master Savings Guru',
      minPoints: 25000,
      maxPoints: 999999,
      icon: '👑',
      color: '#FF6B6B',
      benefits: ['Legendary status', 'Influence app features', 'Special recognition']
    }
  ];

  async earnPoints(
    amount: number,
    reason: string,
    category: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      const oldLevel = profile.level;
      
      // Add points
      profile.totalPoints += amount;
      
      // Update level if needed
      const newLevel = this.calculateLevel(profile.totalPoints);
      const leveledUp = newLevel.id !== oldLevel.id;
      
      if (leveledUp) {
        profile.level = newLevel;
        await this.handleLevelUp(oldLevel, newLevel);
      }
      
      // Record transaction
      const transaction: PointTransaction = {
        id: Date.now().toString(),
        type: 'earned',
        points: amount,
        reason,
        category,
        timestamp: new Date(),
        metadata
      };
      
      this.pointsHistory.push(transaction);
      
      // Check for achievements
      await this.checkAchievements(transaction);
      
      // Update daily challenges
      await this.updateChallengeProgress(category, amount);
      
      // Save data
      await this.saveUserProfile(profile);
      await this.savePointsHistory();
      
      return true;
    } catch (error) {
      console.error('Error earning points:', error);
      return false;
    }
  }

  private calculateLevel(points: number): UserLevel {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (points >= this.levels[i].minPoints) {
        return this.levels[i];
      }
    }
    return this.levels[0]; // Default to first level
  }

  private async handleLevelUp(oldLevel: UserLevel, newLevel: UserLevel): Promise<void> {
    // Award bonus points for leveling up
    const bonusPoints = newLevel.minPoints * 0.1;
    
    // Send achievement notification
    await smartNotificationService.sendSmartNotification(
      'level_up',
      {
        type: 'achievement',
        priority: 'high',
        timing: 'immediate',
        context: {},
        personalization: { show_social_proof: true, add_urgency: false }
      },
      {
        title: `🎉 Level Up! ${newLevel.icon}`,
        body: `Congratulations! You're now a ${newLevel.name}! You earned ${bonusPoints} bonus points.`,
        data: {
          type: 'level_up',
          oldLevel: oldLevel.name,
          newLevel: newLevel.name,
          bonusPoints
        }
      }
    );
    
    // Record bonus points transaction
    this.pointsHistory.push({
      id: Date.now().toString() + '_bonus',
      type: 'bonus',
      points: bonusPoints,
      reason: `Level up bonus - ${newLevel.name}`,
      category: 'level_up',
      timestamp: new Date()
    });
  }

  async checkAchievements(transaction?: PointTransaction): Promise<Achievement[]> {
    const profile = await this.getUserProfile();
    const newlyUnlocked: Achievement[] = [];
    
    const achievements = this.getAllAchievements();
    
    for (const achievement of achievements) {
      if (achievement.unlocked) continue;
      
      let shouldUnlock = false;
      
      switch (achievement.id) {
        case 'first_deal':
          shouldUnlock = profile.stats.pricesTracked >= 1;
          break;
        case 'deal_sharer':
          shouldUnlock = profile.stats.dealsShared >= 1;
          break;
        case 'social_butterfly':
          shouldUnlock = profile.stats.dealsShared >= 5;
          break;
        case 'savings_master':
          shouldUnlock = profile.lifetimeSavings >= 100;
          break;
        case 'streak_starter':
          shouldUnlock = profile.currentStreak >= 3;
          break;
        case 'week_warrior':
          shouldUnlock = profile.currentStreak >= 7;
          break;
        case 'month_master':
          shouldUnlock = profile.currentStreak >= 30;
          break;
        case 'big_saver':
          shouldUnlock = profile.lifetimeSavings >= 1000;
          break;
        case 'deal_hunter':
          shouldUnlock = profile.stats.pricesTracked >= 50;
          break;
        case 'influencer':
          shouldUnlock = profile.stats.referralsInvited >= 3;
          break;
        case 'early_bird':
          const joinedDays = Math.floor(
            (Date.now() - profile.stats.joinedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          shouldUnlock = joinedDays <= 7 && profile.totalPoints >= 100;
          break;
        case 'point_collector':
          shouldUnlock = profile.totalPoints >= 1000;
          break;
        case 'legendary':
          shouldUnlock = profile.totalPoints >= 10000;
          break;
      }
      
      if (shouldUnlock) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        
        // Award achievement points
        await this.earnPoints(
          achievement.points,
          `Achievement unlocked: ${achievement.title}`,
          'achievement',
          { achievementId: achievement.id }
        );
        
        newlyUnlocked.push(achievement);
        
        // Send notification
        await smartNotificationService.sendSmartNotification(
          achievement.id,
          {
            type: 'achievement',
            priority: achievement.rarity === 'legendary' ? 'high' : 'normal',
            timing: 'immediate',
            context: {},
            personalization: { show_social_proof: true }
          },
          {
            title: `🏆 Achievement Unlocked!`,
            body: `${achievement.title} - ${achievement.description} (+${achievement.points} points)`,
            data: {
              type: 'achievement',
              achievementId: achievement.id,
              points: achievement.points,
              rarity: achievement.rarity
            }
          }
        );
      }
    }
    
    if (newlyUnlocked.length > 0) {
      profile.achievements = achievements;
      await this.saveUserProfile(profile);
    }
    
    return newlyUnlocked;
  }

  private getAllAchievements(): Achievement[] {
    return [
      {
        id: 'first_deal',
        title: 'First Steps',
        description: 'Track your first product price',
        icon: '🎯',
        points: 10,
        category: 'shopping',
        rarity: 'common',
        unlocked: false
      },
      {
        id: 'deal_sharer',
        title: 'Deal Sharer',
        description: 'Share your first deal with friends',
        icon: '📤',
        points: 15,
        category: 'social',
        rarity: 'common',
        unlocked: false
      },
      {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Share 5 deals in one week',
        icon: '🦋',
        points: 50,
        category: 'social',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'savings_master',
        title: 'Savings Master',
        description: 'Save $100 through price tracking',
        icon: '💰',
        points: 100,
        category: 'savings',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'streak_starter',
        title: 'Streak Starter',
        description: 'Use the app for 3 consecutive days',
        icon: '🔥',
        points: 25,
        category: 'streak',
        rarity: 'common',
        unlocked: false
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '⚡',
        points: 75,
        category: 'streak',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'month_master',
        title: 'Month Master',
        description: 'Maintain a 30-day streak',
        icon: '🏆',
        points: 300,
        category: 'streak',
        rarity: 'epic',
        unlocked: false
      },
      {
        id: 'big_saver',
        title: 'Big Saver',
        description: 'Save $1,000 through smart shopping',
        icon: '💎',
        points: 500,
        category: 'savings',
        rarity: 'epic',
        unlocked: false
      },
      {
        id: 'deal_hunter',
        title: 'Deal Hunter',
        description: 'Track prices for 50 different products',
        icon: '🎯',
        points: 200,
        category: 'shopping',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'influencer',
        title: 'Influencer',
        description: 'Invite 3 friends to the app',
        icon: '👥',
        points: 150,
        category: 'social',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Earn 100 points in your first week',
        icon: '🐦',
        points: 50,
        category: 'special',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'point_collector',
        title: 'Point Collector',
        description: 'Accumulate 1,000 total points',
        icon: '🎈',
        points: 100,
        category: 'special',
        rarity: 'rare',
        unlocked: false
      },
      {
        id: 'legendary',
        title: 'Legendary Status',
        description: 'Reach 10,000 total points',
        icon: '👑',
        points: 1000,
        category: 'special',
        rarity: 'legendary',
        unlocked: false
      }
    ];
  }

  async generateDailyChallenges(): Promise<void> {
    const today = new Date();
    const existingChallenges = this.dailyChallenges.filter(
      challenge => challenge.expiresAt > today
    );
    
    if (existingChallenges.length >= 3) {
      this.dailyChallenges = existingChallenges;
      return;
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const challengeTemplates = [
      {
        type: 'track_deals',
        title: 'Deal Tracker',
        description: 'Track prices for 3 new products',
        icon: '🎯',
        points: 30,
        target: 3
      },
      {
        type: 'share_deals',
        title: 'Share the Love',
        description: 'Share 2 great deals with friends',
        icon: '📤',
        points: 40,
        target: 2
      },
      {
        type: 'use_app',
        title: 'Daily Visitor',
        description: 'Open the app and browse for 5 minutes',
        icon: '📱',
        points: 20,
        target: 1
      },
      {
        type: 'compare_prices',
        title: 'Price Detective',
        description: 'Compare prices across 5 retailers',
        icon: '🔍',
        points: 35,
        target: 5
      },
      {
        type: 'save_money',
        title: 'Smart Shopper',
        description: 'Find deals that save $50 or more',
        icon: '💰',
        points: 50,
        target: 50
      }
    ];
    
    // Generate 3 random challenges
    const shuffled = challengeTemplates.sort(() => 0.5 - Math.random());
    const selectedChallenges = shuffled.slice(0, 3);
    
    this.dailyChallenges = selectedChallenges.map((template, index) => ({
      id: `${today.getTime()}_${index}`,
      title: template.title,
      description: template.description,
      icon: template.icon,
      points: template.points,
      target: template.target,
      progress: 0,
      type: template.type as any,
      expiresAt: tomorrow,
      completed: false
    }));
    
    await this.saveDailyChallenges();
  }

  async updateChallengeProgress(action: string, value: number = 1): Promise<void> {
    let updated = false;
    
    for (const challenge of this.dailyChallenges) {
      if (challenge.completed || challenge.expiresAt < new Date()) continue;
      
      let shouldUpdate = false;
      
      switch (challenge.type) {
        case 'track_deals':
          shouldUpdate = action === 'track_product';
          break;
        case 'share_deals':
          shouldUpdate = action === 'share_deal';
          break;
        case 'use_app':
          shouldUpdate = action === 'app_session';
          break;
        case 'compare_prices':
          shouldUpdate = action === 'price_comparison';
          break;
        case 'save_money':
          shouldUpdate = action === 'money_saved';
          break;
      }
      
      if (shouldUpdate) {
        challenge.progress += value;
        updated = true;
        
        if (challenge.progress >= challenge.target && !challenge.completed) {
          challenge.completed = true;
          
          // Award points
          await this.earnPoints(
            challenge.points,
            `Daily challenge completed: ${challenge.title}`,
            'daily_challenge',
            { challengeId: challenge.id }
          );
          
          // Send notification
          await smartNotificationService.sendSmartNotification(
            challenge.id,
            {
              type: 'achievement',
              priority: 'normal',
              timing: 'immediate',
              context: {},
              personalization: { show_social_proof: false }
            },
            {
              title: '🎯 Challenge Complete!',
              body: `${challenge.title} completed! You earned ${challenge.points} points.`,
              data: {
                type: 'daily_challenge',
                challengeId: challenge.id,
                points: challenge.points
              }
            }
          );
        }
      }
    }
    
    if (updated) {
      await this.saveDailyChallenges();
    }
  }

  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    // In a real app, this would fetch from server
    // For now, generate mock leaderboard data
    const mockUsers: LeaderboardEntry[] = [
      {
        rank: 1,
        userId: 'user1',
        username: 'DealHunter2024',
        points: 15420,
        level: this.calculateLevel(15420),
        totalSavings: 2850.75,
        trend: 'up'
      },
      {
        rank: 2,
        userId: 'user2',
        username: 'SavingsPro',
        points: 12890,
        level: this.calculateLevel(12890),
        totalSavings: 2340.25,
        trend: 'same'
      },
      {
        rank: 3,
        userId: 'user3',
        username: 'BargainMaster',
        points: 11560,
        level: this.calculateLevel(11560),
        totalSavings: 2100.50,
        trend: 'up'
      }
    ];
    
    return mockUsers.slice(0, limit);
  }

  async getUserProfile(): Promise<UserProfile> {
    if (this.userProfile) {
      return this.userProfile;
    }
    
    const saved = await AsyncStorage.getItem('user_profile');
    if (saved) {
      this.userProfile = JSON.parse(saved);
      return this.userProfile;
    }
    
    // Create default profile
    this.userProfile = {
      userId: 'user_' + Date.now(),
      username: 'User' + Math.floor(Math.random() * 10000),
      level: this.levels[0],
      totalPoints: 0,
      lifetimeSavings: 0,
      currentStreak: 0,
      longestStreak: 0,
      achievements: this.getAllAchievements(),
      badges: [],
      stats: {
        dealsShared: 0,
        pricesTracked: 0,
        moneyAlertsSaved: 0,
        successfulPurchases: 0,
        referralsInvited: 0,
        joinedAt: new Date(),
        lastActive: new Date()
      },
      preferences: {
        publicProfile: true,
        showInLeaderboard: true,
        achievementNotifications: true
      }
    };
    
    return this.userProfile;
  }

  async updateUserStats(statType: keyof UserProfile['stats'], increment: number = 1): Promise<void> {
    const profile = await this.getUserProfile();
    
    if (typeof profile.stats[statType] === 'number') {
      (profile.stats[statType] as number) += increment;
    }
    
    profile.stats.lastActive = new Date();
    
    await this.saveUserProfile(profile);
  }

  async getDailyChallenges(): Promise<DailyChallenge[]> {
    return this.dailyChallenges;
  }

  async getPointsHistory(limit: number = 50): Promise<PointTransaction[]> {
    return this.pointsHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private async saveUserProfile(profile: UserProfile): Promise<void> {
    this.userProfile = profile;
    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
  }

  private async savePointsHistory(): Promise<void> {
    await AsyncStorage.setItem('points_history', JSON.stringify(this.pointsHistory));
  }

  private async saveDailyChallenges(): Promise<void> {
    await AsyncStorage.setItem('daily_challenges', JSON.stringify(this.dailyChallenges));
  }

  private async loadUserProfile(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('points_history');
      if (saved) {
        this.pointsHistory = JSON.parse(saved);
      }
      
      const savedChallenges = await AsyncStorage.getItem('daily_challenges');
      if (savedChallenges) {
        this.dailyChallenges = JSON.parse(savedChallenges);
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  }

  // Quick actions for common point earning scenarios
  async onProductTracked(productId: string, savings?: number): Promise<void> {
    await this.earnPoints(5, 'Product price tracked', 'tracking', { productId });
    await this.updateUserStats('pricesTracked');
    await this.updateChallengeProgress('track_product');
    
    if (savings && savings > 0) {
      const profile = await this.getUserProfile();
      profile.lifetimeSavings += savings;
      await this.saveUserProfile(profile);
      await this.updateChallengeProgress('money_saved', savings);
    }
  }

  async onDealShared(platform: string, productId: string): Promise<void> {
    await this.earnPoints(10, `Deal shared on ${platform}`, 'sharing', { platform, productId });
    await this.updateUserStats('dealsShared');
    await this.updateChallengeProgress('share_deal');
  }

  async onAppSessionStart(): Promise<void> {
    const profile = await this.getUserProfile();
    
    // Update streak
    const today = new Date().toDateString();
    const lastActive = profile.stats.lastActive.toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActive === yesterday.toDateString()) {
      profile.currentStreak++;
    } else if (lastActive !== today) {
      profile.currentStreak = 1;
    }
    
    if (profile.currentStreak > profile.longestStreak) {
      profile.longestStreak = profile.currentStreak;
    }
    
    await this.saveUserProfile(profile);
    await this.updateChallengeProgress('app_session');
    
    // Award daily bonus
    if (lastActive !== today) {
      await this.earnPoints(2, 'Daily app usage', 'daily_bonus');
    }
  }

  async onPriceComparison(retailers: number): Promise<void> {
    await this.earnPoints(2, 'Price comparison performed', 'comparison');
    await this.updateChallengeProgress('price_comparison', retailers);
  }

  async onSuccessfulPurchase(savings: number): Promise<void> {
    const basePoints = 20;
    const bonusPoints = Math.floor(savings / 10); // 1 point per $10 saved
    
    await this.earnPoints(
      basePoints + bonusPoints,
      `Successful purchase with $${savings.toFixed(2)} savings`,
      'purchase',
      { savings }
    );
    
    await this.updateUserStats('successfulPurchases');
    
    const profile = await this.getUserProfile();
    profile.lifetimeSavings += savings;
    await this.saveUserProfile(profile);
  }
}

export const gamificationService = new GamificationService();