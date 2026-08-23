import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { useAppTheme } from '@/context/ThemeContext';
import {
  getDashboardStats,
  type DashboardStats,
} from '@/services/dashboard';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [stats, setStats] =
    useState<DashboardStats>({
      customers: 0,
      leads: 0,
      opportunities: 0,
      projects: 0,
    });

  const [isLoadingStats, setIsLoadingStats] =
    useState(true);

  const [statsError, setStatsError] =
    useState('');

  const loadDashboardStats = useCallback(
    async () => {
      try {
        setStatsError('');

        const data =
          await getDashboardStats();

        setStats(data);
      } catch (error) {
        console.error(
          'DASHBOARD STATS ERROR:',
          error,
        );

        setStatsError(
          error instanceof Error
            ? error.message
            : 'Unable to load dashboard statistics.',
        );
      } finally {
        setIsLoadingStats(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboardStats();
    }, [loadDashboardStats]),
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error(
        'LOGOUT ERROR:',
        error,
      );
    } finally {
      setIsLoggingOut(false);
      router.replace('/login');
    }
  };

  const renderStatValue = (
    value: number,
  ) => {
    if (isLoadingStats) {
      return (
        <ActivityIndicator
          size="small"
          color={colors.primary}
        />
      );
    }

    return (
      <Text
        style={[
          styles.cardNumber,
          { color: colors.primary },
        ]}
      >
        {value}
      </Text>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              <Text
                style={[
                  styles.eleven,
                  { color: colors.primary },
                ]}
              >
                ELEVEN
              </Text>

              <Text
                style={[
                  styles.crm,
                  { color: colors.text },
                ]}
              >
                {' '}
                CRM
              </Text>
            </Text>

            <Text
              style={[
                styles.welcome,
                { color: colors.text },
              ]}
            >
              Welcome back! 👋
            </Text>
          </View>

          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {user?.username
                ?.charAt(0)
                .toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        {/* Welcome Card */}
        <View
          style={[
            styles.welcomeCard,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.welcomeCardTitle}>
            Good to see you!
          </Text>

          <Text style={styles.welcomeCardText}>
            Manage your customers, leads and
            sales activities from one place.
          </Text>
        </View>

        {/* Overview */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Overview
        </Text>

        {statsError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor:
                  colors.dangerBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.errorText,
                { color: colors.danger },
              ]}
            >
              {statsError}
            </Text>

            <Pressable
              onPress={() => {
                setIsLoadingStats(true);
                void loadDashboardStats();
              }}
              style={[
                styles.retryButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.retryText,
                  { color: colors.danger },
                ]}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.cardsRow}>
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {renderStatValue(stats.customers)}

            <Text
              style={[
                styles.cardLabel,
                { color: colors.secondaryText },
              ]}
            >
              Customers
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {renderStatValue(stats.leads)}

            <Text
              style={[
                styles.cardLabel,
                { color: colors.secondaryText },
              ]}
            >
              Leads
            </Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {renderStatValue(
              stats.opportunities,
            )}

            <Text
              style={[
                styles.cardLabel,
                { color: colors.secondaryText },
              ]}
            >
              Opportunities
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {renderStatValue(stats.projects)}

            <Text
              style={[
                styles.cardLabel,
                { color: colors.secondaryText },
              ]}
            >
              Projects
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Quick Actions
        </Text>

        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.actionTitle,
              { color: colors.text },
            ]}
          >
            Customer Management
          </Text>

          <Text
            style={[
              styles.actionText,
              { color: colors.secondaryText },
            ]}
          >
            View and manage your customers.
          </Text>
        </View>

        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.actionTitle,
              { color: colors.text },
            ]}
          >
            Lead Management
          </Text>

          <Text
            style={[
              styles.actionText,
              { color: colors.secondaryText },
            ]}
          >
            Track and manage your sales leads.
          </Text>
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              borderColor: colors.primary,
            },
            pressed &&
              !isLoggingOut &&
              styles.logoutPressed,
            isLoggingOut &&
              styles.logoutDisabled,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator
              color={colors.primary}
            />
          ) : (
            <Text
              style={[
                styles.logoutText,
                { color: colors.primary },
              ]}
            >
              Log Out
            </Text>
          )}
        </Pressable>

        <Text
          style={[
            styles.footer,
            { color: colors.mutedText },
          ]}
        >
          ELEVEN CRM • 2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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

  eleven: {},

  crm: {},

  welcome: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '700',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  welcomeCard: {
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
    minHeight: 96,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },

  cardNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },

  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  errorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },

  actionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  actionText: {
    fontSize: 14,
  },

  logoutButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});