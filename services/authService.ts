import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
  plan: 'free' | 'premium' | 'pro';
}

export interface UserPreferences {
  currency: 'USD' | 'BRL' | 'EUR';
  language: 'en' | 'pt';
  notifications: {
    priceAlerts: boolean;
    dealAlerts: boolean;
    weeklyDigest: boolean;
    marketing: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    personalizedAds: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SocialAuthProvider {
  provider: 'google' | 'apple' | 'facebook';
  token: string;
  userData: any;
}

class AuthService {
  private currentUser: User | null = null;
  private isAuthenticated: boolean = false;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (token) {
        const isValid = await this.verifyToken(token);
        if (isValid) {
          const user = await this.getCurrentUser();
          if (user) {
            this.setUser(user);
          }
        } else {
          // Try to refresh token
          try {
            await this.refreshAccessToken();
            const user = await this.getCurrentUser();
            if (user) {
              this.setUser(user);
            }
          } catch (error) {
            await this.clearTokens();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          deviceInfo: await this.getDeviceInfo()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      await this.storeTokens(data.tokens);
      
      // Store user data
      this.setUser(data.user);
      
      // Update last login
      await this.updateLastLogin();
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async signup(signupData: SignupData): Promise<User> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...signupData,
          deviceInfo: await this.getDeviceInfo()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();
      
      // Store tokens
      await this.storeTokens(data.tokens);
      
      // Store user data
      this.setUser(data.user);
      
      return data.user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async socialLogin(authData: SocialAuthProvider): Promise<User> {
    try {
      const response = await fetch('/api/auth/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...authData,
          deviceInfo: await this.getDeviceInfo()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Social login failed');
      }

      const data = await response.json();
      
      // Store tokens
      await this.storeTokens(data.tokens);
      
      // Store user data
      this.setUser(data.user);
      
      return data.user;
    } catch (error) {
      console.error('Social login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Notify backend about logout
      try {
        const refreshToken = await this.getRefreshToken();
        if (refreshToken) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await this.getAccessToken()}`
            },
            body: JSON.stringify({ refreshToken })
          });
        }
      } catch (apiError) {
        console.warn('Failed to notify backend about logout:', apiError);
      }

      // Clear all stored data
      await this.clearAllUserData();
      
      // Reset user state
      this.currentUser = null;
      this.isAuthenticated = false;
      
      // Clear any cached data
      await this.clearUserCache();
      
      // Reset push notification token
      await this.clearPushNotificationToken();
      
      // Notify listeners
      this.notifyAuthListeners(null);
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async logoutAndClearAll(): Promise<void> {
    await this.logout();
    
    // Additional cleanup for complete logout
    try {
      // Clear bug reports
      await AsyncStorage.removeItem('bug_report_queue');
      
      // Clear gamification data
      await AsyncStorage.removeItem('gamification_user_profile');
      
      // Clear notification history
      await AsyncStorage.removeItem('notification_history');
      
      console.log('Complete logout and cleanup finished');
    } catch (error) {
      console.error('Error during complete logout:', error);
    }
  }

  private async clearAllUserData(): Promise<void> {
    try {
      // Clear authentication tokens
      await this.clearTokens();
      
      // Clear user preferences
      await AsyncStorage.multiRemove([
        'user_preferences',
        'saved_searches',
        'price_alerts',
        'tracked_products',
        'search_history',
        'gamification_data',
        'notification_settings',
        'theme_settings',
        'language_settings'
      ]);
      
      console.log('All user data cleared');
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  private async clearUserCache(): Promise<void> {
    try {
      // Clear any cached API responses
      await AsyncStorage.multiRemove([
        'cached_products',
        'cached_retailers',
        'cached_categories',
        'recent_searches',
        'popular_products'
      ]);
      
      console.log('User cache cleared');
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  private async clearPushNotificationToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('push_notification_token');
      
      // Optionally notify backend to remove token from their database
      try {
        await fetch('/api/push-notifications/remove-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: this.currentUser?.id,
            deviceId: await this.getDeviceId()
          })
        });
      } catch (apiError) {
        console.warn('Failed to remove push token from backend:', apiError);
      }
      
      console.log('Push notification token cleared');
    } catch (error) {
      console.error('Error clearing push notification token:', error);
    }
  }

  // Token management
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync('access_token', tokens.accessToken);
      await SecureStore.setItemAsync('refresh_token', tokens.refreshToken);
      await AsyncStorage.setItem('token_expires_at', tokens.expiresAt.toString());
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('access_token');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('refresh_token');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  private async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await AsyncStorage.removeItem('token_expires_at');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  async refreshAccessToken(): Promise<string> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      await this.storeTokens(data.tokens);
      
      return data.tokens.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearTokens();
      throw error;
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // User management
  private setUser(user: User): void {
    this.currentUser = user;
    this.isAuthenticated = true;
    this.notifyAuthListeners(user);
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const token = await this.getAccessToken();
      if (!token) return null;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const user = await response.json();
      this.setUser(user);
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      const updatedUser = await response.json();
      this.setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password change failed');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Password reset request failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Account deletion failed');
      }

      // Clear all data after successful deletion
      await this.logoutAndClearAll();
    } catch (error) {
      console.error('Account deletion error:', error);
      throw error;
    }
  }

  // Status checks
  async isUserLoggedIn(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;
      
      // Verify token is still valid
      const isValid = await this.verifyToken(token);
      return isValid;
    } catch (error) {
      return false;
    }
  }

  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    needsReauth: boolean;
  }> {
    try {
      const token = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      if (!token) {
        return {
          isAuthenticated: false,
          user: null,
          needsReauth: false
        };
      }
      
      const isValid = await this.verifyToken(token);
      
      if (!isValid && refreshToken) {
        // Try to refresh the token
        try {
          await this.refreshAccessToken();
          return {
            isAuthenticated: true,
            user: this.currentUser,
            needsReauth: false
          };
        } catch (refreshError) {
          return {
            isAuthenticated: false,
            user: null,
            needsReauth: true
          };
        }
      }
      
      return {
        isAuthenticated: isValid,
        user: this.currentUser,
        needsReauth: !isValid
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null,
        needsReauth: true
      };
    }
  }

  // Listeners
  addAuthListener(listener: (user: User | null) => void): () => void {
    this.authListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  private notifyAuthListeners(user: User | null): void {
    this.authListeners.forEach(listener => listener(user));
  }

  // Utility methods
  private async getDeviceInfo(): Promise<any> {
    return {
      deviceId: Constants.deviceId,
      deviceName: Device.deviceName,
      platform: Device.osName,
      version: Device.osVersion,
      model: Device.modelName,
      brand: Device.brand
    };
  }

  private async getDeviceId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('device_id') || Constants.deviceId;
    } catch (error) {
      return null;
    }
  }

  private async updateLastLogin(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_login', new Date().toISOString());
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Getters
  get user(): User | null {
    return this.currentUser;
  }

  get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

export const authService = new AuthService();