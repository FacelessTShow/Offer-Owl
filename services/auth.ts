import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from 'react-native-google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  provider: 'email' | 'google' | 'apple';
  preferences: {
    language: 'en' | 'pt';
    currency: 'USD' | 'BRL';
    notifications: {
      priceAlerts: boolean;
      newDeals: boolean;
      weeklyDigest: boolean;
    };
  };
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

class AuthService {
  private apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

  constructor() {
    this.configureGoogleSignIn();
  }

  private configureGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await this.storeTokens(data.token, data.refreshToken);
        await this.storeUser(data.user);
        return {
          success: true,
          user: data.user,
          token: data.token,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Login failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  async signUpWithEmail(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        await this.storeTokens(data.token, data.refreshToken);
        await this.storeUser(data.user);
        return {
          success: true,
          user: data.user,
          token: data.token,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Registration failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.user) {
        const response = await fetch(`${this.apiUrl}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleId: userInfo.user.id,
            email: userInfo.user.email,
            name: userInfo.user.name,
            profilePicture: userInfo.user.photo,
            accessToken: userInfo.idToken,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await this.storeTokens(data.token, data.refreshToken);
          await this.storeUser(data.user);
          return {
            success: true,
            user: data.user,
            token: data.token,
          };
        } else {
          return {
            success: false,
            error: data.message || 'Google sign-in failed',
          };
        }
      } else {
        return {
          success: false,
          error: 'Google sign-in cancelled',
        };
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          error: 'Google sign-in cancelled',
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: 'Google sign-in already in progress',
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: 'Google Play Services not available',
        };
      } else {
        return {
          success: false,
          error: 'Google sign-in failed',
        };
      }
    }
  }

  async signInWithApple(): Promise<AuthResponse> {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || 'com.pricecompare.mobile',
        scopes: [AuthSession.AppleAuthenticationScope.FULL_NAME, AuthSession.AppleAuthenticationScope.EMAIL],
        requestUri: AuthSession.makeRedirectUri({ useProxy: true }),
        state: AuthSession.AuthSession.makeStateFromParams({ platform: 'ios' }),
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      });

      if (result.type === 'success') {
        const response = await fetch(`${this.apiUrl}/auth/apple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorizationCode: result.params.code,
            identityToken: result.params.id_token,
            user: result.params.user,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await this.storeTokens(data.token, data.refreshToken);
          await this.storeUser(data.user);
          return {
            success: true,
            user: data.user,
            token: data.token,
          };
        } else {
          return {
            success: false,
            error: data.message || 'Apple sign-in failed',
          };
        }
      } else {
        return {
          success: false,
          error: 'Apple sign-in cancelled',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Apple sign-in failed',
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      // Sign out from Google if signed in
      if (await GoogleSignin.isSignedIn()) {
        await GoogleSignin.signOut();
      }

      // Clear stored tokens and user data
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await AsyncStorage.removeItem('user');

      // Clear any other cached data
      await AsyncStorage.removeItem('favorites');
      await AsyncStorage.removeItem('recentSearches');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        return JSON.parse(userString);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('accessToken');
    } catch (error) {
      return null;
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        await this.storeTokens(data.token, data.refreshToken);
        return data.token;
      } else {
        // Refresh token is invalid, user needs to log in again
        await this.signOut();
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      return {
        success: response.ok,
        error: response.ok ? undefined : data.message || 'Failed to send reset email',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  async updateUserPreferences(preferences: Partial<User['preferences']>): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${this.apiUrl}/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        // Update stored user data
        const user = await this.getCurrentUser();
        if (user) {
          user.preferences = { ...user.preferences, ...preferences };
          await this.storeUser(user);
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to update preferences',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  }

  private async storeUser(user: User): Promise<void> {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }
}

export const authService = new AuthService();