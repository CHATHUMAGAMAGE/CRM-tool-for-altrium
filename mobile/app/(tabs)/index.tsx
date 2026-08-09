import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
  console.log('LOGOUT BUTTON PRESSED');

  setIsLoggingOut(true);

  try {
    await logout();
  } catch (error) {
    console.error('LOGOUT ERROR:', error);
  } finally {
    setIsLoggingOut(false);
    router.replace('/login');
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              <Text style={styles.eleven}>ELEVEN</Text>
              <Text style={styles.crm}> CRM</Text>
            </Text>

            <Text style={styles.welcome}>Welcome back! 👋</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeCardTitle}>Good to see you!</Text>
          <Text style={styles.welcomeCardText}>
            Manage your customers, leads and sales activities from one place.
          </Text>
        </View>

        {/* Overview */}
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardNumber}>0</Text>
            <Text style={styles.cardLabel}>Customers</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardNumber}>0</Text>
            <Text style={styles.cardLabel}>Leads</Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardNumber}>0</Text>
            <Text style={styles.cardLabel}>Opportunities</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardNumber}>0</Text>
            <Text style={styles.cardLabel}>Projects</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Customer Management</Text>
          <Text style={styles.actionText}>
            View and manage your customers.
          </Text>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Lead Management</Text>
          <Text style={styles.actionText}>
            Track and manage your sales leads.
          </Text>
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && !isLoggingOut && styles.logoutPressed,
            isLoggingOut && styles.logoutDisabled,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#1557E8" />
          ) : (
            <Text style={styles.logoutText}>Log Out</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>ELEVEN CRM • 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  brand: {
    fontSize: 24,
    fontWeight: '800',
  },

  eleven: {
    color: '#1557E8',
  },

  crm: {
    color: '#111827',
  },

  welcome: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  welcomeCard: {
    backgroundColor: '#1557E8',
    borderRadius: 18,
    padding: 22,
    marginBottom: 28,
  },

  welcomeCardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },

  welcomeCardText: {
    color: '#E8EEFF',
    fontSize: 15,
    lineHeight: 22,
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  card: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cardNumber: {
    color: '#1557E8',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },

  cardLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  actionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  actionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  actionText: {
    color: '#6B7280',
    fontSize: 14,
  },

  logoutButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  logoutPressed: {
    opacity: 0.7,
  },

  logoutDisabled: {
    opacity: 0.6,
  },

  logoutText: {
    color: '#1557E8',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 24,
  },
});