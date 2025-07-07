import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
  Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { dealSharingService, DealShareData, SharePlatform, SocialProof } from '../services/dealSharingService';
import { gamificationService } from '../services/gamificationService';
import { useTranslation } from 'react-i18next';

interface DealSharingButtonProps {
  deal: DealShareData;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'minimal';
  showSocialProof?: boolean;
  onShareSuccess?: (platform: string) => void;
}

const { width, height } = Dimensions.get('window');

export const DealSharingButton: React.FC<DealSharingButtonProps> = ({
  deal,
  style,
  size = 'medium',
  variant = 'primary',
  showSocialProof = true,
  onShareSuccess
}) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [platforms, setPlatforms] = useState<SharePlatform[]>([]);
  const [socialProof, setSocialProof] = useState<SocialProof | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);
  
  // Animations
  const scaleAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const modalAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadData();
  }, [deal.productId]);

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [modalVisible]);

  const loadData = async () => {
    try {
      const [platformsData, proofData] = await Promise.all([
        dealSharingService.getSupportedPlatforms(),
        dealSharingService.getSocialProof(deal.productId)
      ]);
      
      setPlatforms(platformsData);
      setSocialProof(proofData);
      setShareCount(proofData?.totalShares || 0);
    } catch (error) {
      console.error('Error loading sharing data:', error);
    }
  };

  const handleSharePress = () => {
    // Haptic feedback
    Vibration.vibrate(50);
    
    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    setModalVisible(true);
  };

  const handlePlatformShare = async (platform: SharePlatform) => {
    if (!platform.isAvailable) {
      Alert.alert(
        t('sharing.platformUnavailable'),
        t('sharing.installRequired', { platform: platform.name })
      );
      return;
    }

    setSharing(platform.id);
    
    try {
      const success = await dealSharingService.shareDeal(deal, platform.id);
      
      if (success) {
        // Update social proof
        setShareCount(prev => prev + 1);
        
        // Trigger gamification
        await gamificationService.onDealShared(platform.id, deal.productId);
        
        // Success animation
        startSuccessAnimation();
        
        // Close modal after delay
        setTimeout(() => {
          setModalVisible(false);
          onShareSuccess?.(platform.id);
        }, 1500);
        
      } else {
        Alert.alert(t('sharing.error'), t('sharing.tryAgain'));
      }
    } catch (error) {
      Alert.alert(t('sharing.error'), t('sharing.tryAgain'));
    } finally {
      setSharing(null);
    }
  };

  const startSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return { width: 80, height: 36 };
      case 'large': return { width: 200, height: 56 };
      default: return { width: 120, height: 44 };
    }
  };

  const getButtonStyle = () => {
    const baseSize = getButtonSize();
    
    switch (variant) {
      case 'secondary':
        return {
          ...baseSize,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: '#007AFF'
        };
      case 'minimal':
        return {
          ...baseSize,
          backgroundColor: 'transparent'
        };
      default:
        return baseSize;
    }
  };

  const formatShareCount = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const renderSocialProof = () => {
    if (!showSocialProof || !socialProof || socialProof.totalShares === 0) return null;

    return (
      <View style={styles.socialProofContainer}>
        <Text style={styles.socialProofText}>
          {socialProof.trending ? '🔥 ' : ''}
          {t('sharing.sharedBy', { count: formatShareCount(socialProof.totalShares) })}
        </Text>
        {socialProof.recentShares.slice(0, 3).map((share, index) => (
          <View key={index} style={styles.recentShareBadge}>
            <Text style={styles.recentShareText}>
              {share.platform} • ${share.savings.toFixed(0)} saved
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderPlatformButton = (platform: SharePlatform) => {
    const isSharing = sharing === platform.id;
    
    return (
      <TouchableOpacity
        key={platform.id}
        style={[
          styles.platformButton,
          { borderColor: platform.color },
          !platform.isAvailable && styles.platformButtonDisabled,
          isSharing && styles.platformButtonSharing
        ]}
        onPress={() => handlePlatformShare(platform)}
        disabled={isSharing || !platform.isAvailable}
      >
        <View style={styles.platformContent}>
          <Text style={styles.platformIcon}>{platform.icon}</Text>
          <Text style={[
            styles.platformName,
            { color: platform.isAvailable ? platform.color : '#999' }
          ]}>
            {platform.name}
          </Text>
          {isSharing && (
            <View style={styles.loadingIndicator}>
              <Animated.View
                style={[
                  styles.loadingDot,
                  {
                    transform: [{
                      rotate: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }
                ]}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={style}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.shareButton, getButtonStyle()]}
          onPress={handleSharePress}
        >
          {variant === 'primary' ? (
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.shareButtonText}>
                📤 {t('sharing.share')}
              </Text>
              {shareCount > 0 && (
                <View style={styles.shareCountBadge}>
                  <Text style={styles.shareCountText}>
                    {formatShareCount(shareCount)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.buttonContent}>
              <Text style={[
                styles.shareButtonText,
                variant !== 'primary' && { color: '#007AFF' }
              ]}>
                📤 {t('sharing.share')}
              </Text>
              {shareCount > 0 && (
                <View style={styles.shareCountBadge}>
                  <Text style={styles.shareCountText}>
                    {formatShareCount(shareCount)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {renderSocialProof()}

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  },
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ],
                opacity: modalAnim
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('sharing.shareThisDeal')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dealPreview}>
              <Text style={styles.dealTitle}>{deal.productName}</Text>
              <View style={styles.dealPriceRow}>
                <Text style={styles.dealPrice}>
                  {deal.currency === 'BRL' ? 'R$' : '$'}{deal.currentPrice}
                </Text>
                {deal.originalPrice && (
                  <View style={styles.dealDiscount}>
                    <Text style={styles.dealOriginalPrice}>
                      {deal.currency === 'BRL' ? 'R$' : '$'}{deal.originalPrice}
                    </Text>
                    <Text style={styles.dealDiscountPercent}>
                      {Math.round(((deal.originalPrice - deal.currentPrice) / deal.originalPrice) * 100)}% OFF
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.dealRetailer}>at {deal.retailer}</Text>
            </View>

            <ScrollView
              style={styles.platformsContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.platformsGrid}>
                {platforms.map(renderPlatformButton)}
              </View>
            </ScrollView>

            {socialProof && socialProof.totalShares > 0 && (
              <View style={styles.modalSocialProof}>
                <Text style={styles.modalSocialProofText}>
                  🔥 {t('sharing.viralScore')}: {socialProof.viralScore}/100
                </Text>
                <Text style={styles.modalSocialProofSubtext}>
                  {t('sharing.peopleShared', { count: socialProof.totalShares })}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradientBackground: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  shareCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  shareCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  socialProofContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  socialProofText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  recentShareBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginVertical: 1,
  },
  recentShareText: {
    fontSize: 10,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  dealPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dealPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  dealDiscount: {
    marginLeft: 12,
    alignItems: 'flex-start',
  },
  dealOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  dealDiscountPercent: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  dealRetailer: {
    fontSize: 14,
    color: '#666',
  },
  platformsContainer: {
    maxHeight: 300,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformButton: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  platformButtonDisabled: {
    opacity: 0.5,
  },
  platformButtonSharing: {
    backgroundColor: '#f0f8ff',
  },
  platformContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    opacity: 0.7,
  },
  modalSocialProof: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  modalSocialProofText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  modalSocialProofSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default DealSharingButton;