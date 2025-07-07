import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  gamificationService, 
  UserProfile, 
  Achievement, 
  DailyChallenge, 
  LeaderboardEntry,
  PointTransaction 
} from '../services/gamificationService';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export const GamificationDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'challenges' | 'leaderboard'>('overview');
  
  // Animations
  const progressAnim = useState(new Animated.Value(0))[0];
  const achievementAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (userProfile) {
      animateProgress();
    }
  }, [userProfile]);

  const loadData = async () => {
    try {
      const [profile, challenges, leaderboardData, history] = await Promise.all([
        gamificationService.getUserProfile(),
        gamificationService.getDailyChallenges(),
        gamificationService.getLeaderboard(10),
        gamificationService.getPointsHistory(20)
      ]);
      
      setUserProfile(profile);
      setAchievements(profile.achievements);
      setDailyChallenges(challenges);
      setLeaderboard(leaderboardData);
      setPointsHistory(history);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  };

  const animateProgress = () => {
    const progressPercentage = userProfile ? 
      ((userProfile.totalPoints - userProfile.level.minPoints) / 
       (userProfile.level.maxPoints - userProfile.level.minPoints)) : 0;
    
    Animated.timing(progressAnim, {
      toValue: Math.min(progressPercentage, 1),
      duration: 1000,
      useNativeDriver: false
    }).start();
    
    // Animate achievements
    Animated.staggered(100, 
      achievements.filter(a => a.unlocked).map((_, index) =>
        Animated.timing(achievementAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      )
    ).start();
  };

  const formatPoints = (points: number): string => {
    if (points < 1000) return points.toString();
    if (points < 1000000) return `${(points / 1000).toFixed(1)}K`;
    return `${(points / 1000000).toFixed(1)}M`;
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return '#95A5A6';
      case 'rare': return '#3498DB';
      case 'epic': return '#9B59B6';
      case 'legendary': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* User Level Card */}
      <LinearGradient
        colors={[userProfile?.level.color || '#007AFF', '#005BB5']}
        style={styles.levelCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.levelHeader}>
          <Text style={styles.levelIcon}>{userProfile?.level.icon}</Text>
          <View style={styles.levelInfo}>
            <Text style={styles.levelName}>{userProfile?.level.name}</Text>
            <Text style={styles.levelPoints}>
              {formatPoints(userProfile?.totalPoints || 0)} pts
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {userProfile?.totalPoints || 0} / {userProfile?.level.maxPoints || 0}
          </Text>
        </View>
        
        <ScrollView horizontal style={styles.benefitsContainer} showsHorizontalScrollIndicator={false}>
          {userProfile?.level.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitBadge}>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userProfile?.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>{t('gamification.currentStreak')}</Text>
          <Text style={styles.statIcon}>🔥</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${userProfile?.lifetimeSavings.toFixed(0) || 0}</Text>
          <Text style={styles.statLabel}>{t('gamification.totalSaved')}</Text>
          <Text style={styles.statIcon}>💰</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userProfile?.stats.dealsShared || 0}</Text>
          <Text style={styles.statLabel}>{t('gamification.dealsShared')}</Text>
          <Text style={styles.statIcon}>📤</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {achievements.filter(a => a.unlocked).length}/{achievements.length}
          </Text>
          <Text style={styles.statLabel}>{t('gamification.achievements')}</Text>
          <Text style={styles.statIcon}>🏆</Text>
        </View>
      </View>

      {/* Recent Points History */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t('gamification.recentActivity')}</Text>
        {pointsHistory.slice(0, 5).map((transaction, index) => (
          <View key={transaction.id} style={styles.historyItem}>
            <View style={styles.historyIcon}>
              <Text style={styles.historyIconText}>
                {transaction.type === 'earned' ? '+' : '-'}
              </Text>
            </View>
            <View style={styles.historyContent}>
              <Text style={styles.historyReason}>{transaction.reason}</Text>
              <Text style={styles.historyTime}>
                {new Date(transaction.timestamp).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[
              styles.historyPoints,
              { color: transaction.type === 'earned' ? '#4CAF50' : '#FF5722' }
            ]}>
              {transaction.type === 'earned' ? '+' : '-'}{transaction.points}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAchievementsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.achievementsContainer}>
        {achievements.map((achievement, index) => (
          <Animated.View
            key={achievement.id}
            style={[
              styles.achievementCard,
              {
                opacity: achievement.unlocked ? 1 : 0.6,
                transform: achievement.unlocked ? [{ scale: achievementAnim }] : [{ scale: 1 }]
              }
            ]}
          >
            <View style={[
              styles.achievementRarity,
              { backgroundColor: getRarityColor(achievement.rarity) }
            ]}>
              <Text style={styles.achievementRarityText}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            
            <View style={styles.achievementFooter}>
              <Text style={styles.achievementPoints}>+{achievement.points} pts</Text>
              {achievement.unlocked && achievement.unlockedAt && (
                <Text style={styles.achievementDate}>
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            
            {achievement.unlocked && (
              <View style={styles.achievementUnlockedBadge}>
                <Text style={styles.achievementUnlockedText}>✓</Text>
              </View>
            )}
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );

  const renderChallengesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('gamification.dailyChallenges')}</Text>
      <Text style={styles.sectionSubtitle}>
        {t('gamification.challengesResetDaily')}
      </Text>
      
      {dailyChallenges.map((challenge, index) => {
        const progressPercentage = Math.min(challenge.progress / challenge.target, 1);
        const timeLeft = Math.max(0, challenge.expiresAt.getTime() - Date.now());
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        
        return (
          <View key={challenge.id} style={[
            styles.challengeCard,
            challenge.completed && styles.challengeCardCompleted
          ]}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
              </View>
              <View style={styles.challengeReward}>
                <Text style={styles.challengePoints}>+{challenge.points}</Text>
                <Text style={styles.challengePointsLabel}>pts</Text>
              </View>
            </View>
            
            <View style={styles.challengeProgress}>
              <View style={styles.challengeProgressBar}>
                <View
                  style={[
                    styles.challengeProgressFill,
                    { width: `${progressPercentage * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.challengeProgressText}>
                {challenge.progress}/{challenge.target}
              </Text>
            </View>
            
            <View style={styles.challengeFooter}>
              {challenge.completed ? (
                <Text style={styles.challengeCompletedText}>
                  ✅ {t('gamification.completed')}
                </Text>
              ) : (
                <Text style={styles.challengeTimeLeft}>
                  ⏰ {hoursLeft}h {t('gamification.remaining')}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderLeaderboardTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('gamification.leaderboard')}</Text>
      <Text style={styles.sectionSubtitle}>
        {t('gamification.topSavers')}
      </Text>
      
      {leaderboard.map((entry, index) => (
        <View key={entry.userId} style={[
          styles.leaderboardItem,
          index < 3 && styles.leaderboardTopThree
        ]}>
          <View style={styles.leaderboardRank}>
            <Text style={[
              styles.leaderboardRankText,
              index < 3 && { color: '#FFD700' }
            ]}>
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
            </Text>
          </View>
          
          <View style={styles.leaderboardUser}>
            <Text style={styles.leaderboardUsername}>{entry.username}</Text>
            <View style={styles.leaderboardLevel}>
              <Text style={styles.leaderboardLevelIcon}>{entry.level.icon}</Text>
              <Text style={styles.leaderboardLevelName}>{entry.level.name}</Text>
            </View>
          </View>
          
          <View style={styles.leaderboardStats}>
            <Text style={styles.leaderboardPoints}>
              {formatPoints(entry.points)} pts
            </Text>
            <Text style={styles.leaderboardSavings}>
              ${entry.totalSavings.toFixed(0)} saved
            </Text>
          </View>
          
          <View style={styles.leaderboardTrend}>
            <Text style={styles.leaderboardTrendIcon}>
              {entry.trend === 'up' ? '📈' : entry.trend === 'down' ? '📉' : '➡️'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'overview', label: t('gamification.overview'), icon: '📊' },
        { key: 'achievements', label: t('gamification.achievements'), icon: '🏆' },
        { key: 'challenges', label: t('gamification.challenges'), icon: '🎯' },
        { key: 'leaderboard', label: t('gamification.leaderboard'), icon: '👑' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabItem,
            activeTab === tab.key && styles.tabItemActive
          ]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={[
            styles.tabIcon,
            activeTab === tab.key && styles.tabIconActive
          ]}>
            {tab.icon}
          </Text>
          <Text style={[
            styles.tabLabel,
            activeTab === tab.key && styles.tabLabelActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabBar()}
      
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'achievements' && renderAchievementsTab()}
      {activeTab === 'challenges' && renderChallengesTab()}
      {activeTab === 'leaderboard' && renderLeaderboardTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  levelCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  levelPoints: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  benefitsContainer: {
    flexDirection: 'row',
  },
  benefitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  benefitText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  historyContent: {
    flex: 1,
  },
  historyReason: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  achievementRarity: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  achievementRarityText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '600',
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  achievementFooter: {
    alignItems: 'center',
  },
  achievementPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  achievementDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  achievementUnlockedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementUnlockedText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  challengeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  challengeCardCompleted: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
  },
  challengeReward: {
    alignItems: 'center',
  },
  challengePoints: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  challengePointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  challengeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginRight: 12,
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  challengeProgressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  challengeFooter: {
    alignItems: 'flex-end',
  },
  challengeCompletedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  challengeTimeLeft: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leaderboardTopThree: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardRankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  leaderboardUser: {
    flex: 1,
  },
  leaderboardUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  leaderboardLevel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardLevelIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  leaderboardLevelName: {
    fontSize: 12,
    color: '#666',
  },
  leaderboardStats: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  leaderboardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  leaderboardSavings: {
    fontSize: 12,
    color: '#4CAF50',
  },
  leaderboardTrend: {
    width: 24,
    alignItems: 'center',
  },
  leaderboardTrendIcon: {
    fontSize: 16,
  },
});

export default GamificationDashboard;