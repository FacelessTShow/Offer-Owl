import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Voice from '@react-native-voice/voice';
import { 
  Search, 
  Mic, 
  Camera as CameraIcon, 
  QrCode, 
  X,
  Image as ImageIcon 
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../utils/constants';

interface EnhancedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onVoiceSearch?: (text: string) => void;
  onImageSearch?: (imageUri: string) => void;
  onBarcodeSearch?: (barcode: string) => void;
  placeholder?: string;
  style?: any;
}

export const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChangeText,
  onVoiceSearch,
  onImageSearch,
  onBarcodeSearch,
  placeholder,
  style,
}) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraType, setCameraType] = useState<'photo' | 'barcode'>('photo');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setupVoice();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const setupVoice = () => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
  };

  const onSpeechStart = () => {
    setIsListening(true);
    startPulseAnimation();
  };

  const onSpeechEnd = () => {
    setIsListening(false);
    stopPulseAnimation();
  };

  const onSpeechError = (error: any) => {
    console.error('Speech error:', error);
    setIsListening(false);
    stopPulseAnimation();
    Alert.alert(t('error'), t('voiceSearchError'));
  };

  const onSpeechResults = (event: any) => {
    const result = event.value[0];
    if (result && onVoiceSearch) {
      onVoiceSearch(result);
      onChangeText(result);
    }
  };

  const onSpeechPartialResults = (event: any) => {
    const partial = event.value[0];
    if (partial) {
      onChangeText(partial);
    }
  };

  const startVoiceSearch = async () => {
    try {
      await Voice.start('en-US');
    } catch (error) {
      console.error('Voice start error:', error);
      Alert.alert(t('error'), t('voiceSearchError'));
    }
  };

  const stopVoiceSearch = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Voice stop error:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const requestCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  const openImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('error'), 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && onImageSearch) {
      onImageSearch(result.assets[0].uri);
    }
  };

  const openCamera = async (type: 'photo' | 'barcode') => {
    const hasPermission = await requestCameraPermissions();
    if (hasPermission) {
      setCameraType(type);
      setShowCameraModal(true);
    } else {
      Alert.alert(t('error'), 'Camera permission is required!');
    }
  };

  const onBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setShowCameraModal(false);
    if (onBarcodeSearch) {
      onBarcodeSearch(data);
    }
    Alert.alert('Barcode Scanned', `Type: ${type}\nData: ${data}`);
  };

  const takePicture = async (camera: any) => {
    if (camera) {
      const photo = await camera.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      setShowCameraModal(false);
      if (onImageSearch) {
        onImageSearch(photo.uri);
      }
    }
  };

  const renderCameraModal = () => (
    <Modal
      visible={showCameraModal}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          onBarCodeScanned={cameraType === 'barcode' ? onBarCodeScanned : undefined}
          ref={(ref) => {
            if (ref && cameraType === 'photo') {
              // Store camera ref for taking pictures
            }
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCameraModal(false)}
              >
                <X size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraFooter}>
              <Text style={styles.cameraInstructions}>
                {cameraType === 'barcode' 
                  ? t('scanProduct')
                  : t('imageSearchPrompt')
                }
              </Text>
              
              {cameraType === 'photo' && (
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => {
                    // Implement camera capture
                  }}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Camera>
      </View>
    </Modal>
  );

  const microphoneScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const microphoneOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.gray[500]} style={styles.searchIcon} />
        
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || t('searchProducts')}
          placeholderTextColor={COLORS.gray[500]}
          returnKeyType="search"
        />

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={isListening ? stopVoiceSearch : startVoiceSearch}
          >
            <Animated.View
              style={[
                styles.microphoneContainer,
                {
                  transform: [{ scale: microphoneScale }],
                  opacity: microphoneOpacity,
                },
              ]}
            >
              <Mic 
                size={18} 
                color={isListening ? COLORS.accent : COLORS.gray[600]} 
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openCamera('photo')}
          >
            <CameraIcon size={18} color={COLORS.gray[600]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openImagePicker}
          >
            <ImageIcon size={18} color={COLORS.gray[600]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openCamera('barcode')}
          >
            <QrCode size={18} color={COLORS.gray[600]} />
          </TouchableOpacity>
        </View>
      </View>

      {isListening && (
        <View style={styles.listeningIndicator}>
          <Text style={styles.listeningText}>{t('listeningPrompt')}</Text>
        </View>
      )}

      {renderCameraModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[900],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  microphoneContainer: {
    borderRadius: 12,
    padding: 4,
  },
  listeningIndicator: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  listeningText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.lg,
    paddingTop: 60,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: SPACING.sm,
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  cameraInstructions: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.md,
    borderRadius: 8,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.gray[300],
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
  },
});