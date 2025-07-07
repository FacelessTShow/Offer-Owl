import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Settings, Bell, CreditCard, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, SPACING } from '../../utils/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleNotificationToggle = () => {
    setNotifications(!notifications);
    Alert.alert(
      'Notifications',
      `Notifications ${!notifications ? 'enabled' : 'disabled'}`
    );
  };

  const renderAuthSection = () => {
    if (!user) {
      return (
        <View style={styles.authSection}>
          <View style={styles.authIcon}>
            <User size={40} color={COLORS.gray[400]} />
          </View>
          <Text style={styles.authTitle}>Sign In Required</Text>
          <Text style={styles.authSubtitle}>
            Sign in to access your favorites, price alerts, and more
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitials}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </View>
    );
  };

  const renderMenuSection = (title: string, items: Array<{ icon: any; title: string; onPress: () => void; color?: string }>) => (
    <View style={styles.menuSection}>
      <Text style={styles.menuTitle}>{title}</Text>
      <View style={styles.menuItems}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index === items.length - 1 && styles.lastMenuItem]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <item.icon size={20} color={item.color || COLORS.gray[600]} />
              <Text style={[styles.menuItemText, item.color && { color: item.color }]}>
                {item.title}
              </Text>
            </View>
            <ChevronRight size={16} color={COLORS.gray[400]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const accountItems = [
    {
      icon: Settings,
      title: 'Account Settings',
      onPress: () => Alert.alert('Account Settings', 'Settings screen would open here'),
    },
    {
      icon: Bell,
      title: 'Notifications',
      onPress: handleNotificationToggle,
    },
    {
      icon: CreditCard,
      title: 'Payment Methods',
      onPress: () => Alert.alert('Payment Methods', 'Payment methods screen would open here'),
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      onPress: () => Alert.alert('Privacy & Security', 'Privacy settings would open here'),
    },
  ];

  const supportItems = [
    {
      icon: HelpCircle,
      title: 'Help & Support',
      onPress: () => Alert.alert('Help & Support', 'Support screen would open here'),
    },
  ];

  const logoutItems = [
    {
      icon: LogOut,
      title: 'Logout',
      onPress: handleLogout,
      color: COLORS.error,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {renderAuthSection()}

        {user && (
          <>
            {renderMenuSection('Account', accountItems)}
            {renderMenuSection('Support', supportItems)}
            {renderMenuSection('', logoutItems)}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>PriceCompare v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Your trusted shopping companion
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  scrollContainer: {
    paddingBottom: SPACING.xl,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.gray[900],
  },
  authSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authIcon: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 40,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  authTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.sm,
  },
  authSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userInitials: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[600],
  },
  menuSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  menuItems: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[900],
    marginLeft: SPACING.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
});