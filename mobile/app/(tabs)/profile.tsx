import React, { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, colors, setTheme } = useAppTheme();

  const [settingsVisible, setSettingsVisible] =
    useState(false);

  const fullName =
    `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
    user?.username ||
    'User';

  const role =
    user?.role_display ||
    user?.role ||
    'User';

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of ELEVEN CRM?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch {
              Alert.alert(
                'Logout Failed',
                'Unable to log out. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const handleMyInformation = () => {
    Alert.alert(
      'My Information',
      `Username: ${
        user?.username || 'Not available'
      }\n\nEmail: ${
        user?.email || 'Not available'
      }\n\nPhone: ${
        user?.phone_number || 'Not available'
      }\n\nRole: ${role}`,
    );
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  const handleNotifications = () => {
    Alert.alert(
      'Notifications',
      'Notification preferences will be available here for lead assignments, follow-up reminders and important CRM updates.',
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About ELEVEN CRM',
      'ELEVEN CRM\n\nVersion 1.0.0\n\nCustomer Relationship Management system developed for Altrium.',
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text },
            ]}
          >
            Profile
          </Text>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() =>
              setSettingsVisible(true)
            }
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="settings"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >
            <MaterialIcons
              name="person"
              size={58}
              color={colors.primary}
            />
          </View>

          <View style={styles.profileDetails}>
            <Text
              style={[
                styles.name,
                { color: colors.text },
              ]}
              numberOfLines={1}
            >
              {fullName}
            </Text>

            <Text
              style={[
                styles.role,
                { color: colors.secondaryText },
              ]}
              numberOfLines={1}
            >
              {role}
            </Text>

            <View style={styles.contactRow}>
              <MaterialIcons
                name="email"
                size={18}
                color={colors.secondaryText}
              />

              <Text
                style={[
                  styles.contactText,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {user?.email ||
                  'Email not available'}
              </Text>
            </View>

            <View style={styles.contactRow}>
              <MaterialIcons
                name="phone"
                size={18}
                color={colors.secondaryText}
              />

              <Text
                style={[
                  styles.contactText,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
                numberOfLines={1}
              >
                {user?.phone_number ||
                  'Phone not available'}
              </Text>
            </View>
          </View>
        </View>

        {/* Account */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Account
        </Text>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ProfileRow
            icon="person"
            title="My Information"
            subtitle="View your personal information"
            onPress={handleMyInformation}
            colors={colors}
          />

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.divider,
              },
            ]}
          />

          <ProfileRow
            icon="lock"
            title="Change Password"
            subtitle="Reset your account password"
            onPress={handleChangePassword}
            colors={colors}
          />

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.divider,
              },
            ]}
          />

          <ProfileRow
            icon="notifications-none"
            title="Notifications"
            subtitle="Manage your notification settings"
            onPress={handleNotifications}
            colors={colors}
          />
        </View>

        {/* About */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          About
        </Text>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ProfileRow
            icon="info-outline"
            title="About ELEVEN CRM"
            subtitle="Version 1.0.0"
            onPress={handleAbout}
            colors={colors}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="logout"
            size={25}
            color={colors.danger}
          />

          <Text
            style={[
              styles.logoutText,
              { color: colors.danger },
            ]}
          >
            Log Out
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.footer,
            { color: colors.mutedText },
          ]}
        >
          ELEVEN CRM • 2026
        </Text>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSettingsVisible(false)
        }
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor:
                colors.modalOverlay,
            },
          ]}
        >
          <View
            style={[
              styles.settingsModal,
              {
                backgroundColor:
                  colors.card,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text },
                ]}
              >
                Settings
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setSettingsVisible(false)
                }
                style={styles.closeButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.appearanceTitle,
                { color: colors.text },
              ]}
            >
              Appearance
            </Text>

            <Text
              style={[
                styles.appearanceSubtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Choose how ELEVEN CRM should look.
            </Text>

            <ThemeOption
              icon="light-mode"
              title="Light"
              selected={theme === 'light'}
              onPress={() => setTheme('light')}
              colors={colors}
            />

            <ThemeOption
              icon="dark-mode"
              title="Dark"
              selected={theme === 'dark'}
              onPress={() => setTheme('dark')}
              colors={colors}
            />

            <TouchableOpacity
              style={[
                styles.closeModalButton,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
              onPress={() =>
                setSettingsVisible(false)
              }
            >
              <Text style={styles.closeModalText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type ThemeColors = {
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  secondaryText: string;
  mutedText: string;
  border: string;
  divider: string;
  primary: string;
  primarySoft: string;
  iconBackground: string;
  danger: string;
  modalOverlay: string;
};

type ProfileRowProps = {
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: ThemeColors;
};

function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
  colors,
}: ProfileRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={24}
          color={colors.primary}
        />
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.rowSubtitle,
            {
              color:
                colors.secondaryText,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={25}
        color={colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

type ThemeOptionProps = {
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  title: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
};

function ThemeOption({
  icon,
  title,
  selected,
  onPress,
  colors,
}: ThemeOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.themeOption,
        {
          borderColor: colors.border,
          backgroundColor:
            colors.cardSecondary,
        },
        selected && {
          borderColor: colors.primary,
          backgroundColor:
            colors.primarySoft,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.themeIcon,
          {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={23}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.themeTitle,
          { color: colors.text },
        ]}
      >
        {title}
      </Text>

      <View
        style={[
          styles.radio,
          {
            borderColor:
              colors.secondaryText,
          },
          selected && {
            borderColor:
              colors.primary,
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.radioDot,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
  },

  header: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },

  settingsButton: {
    position: 'absolute',
    right: 2,
    top: 10,
    padding: 4,
  },

  profileCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 18,
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  profileDetails: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },

  role: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 9,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  contactText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 13,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 2,
  },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.025,
    shadowRadius: 6,
    elevation: 2,
  },

  row: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  rowContent: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },

  rowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    marginHorizontal: 14,
  },

  logoutButton: {
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.025,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 13,
  },

  logoutText: {
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },

  settingsModal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    padding: 22,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '800',
  },

  closeButton: {
    padding: 4,
  },

  appearanceTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },

  appearanceSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },

  themeOption: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 10,
  },

  themeIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  themeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },

  closeModalButton: {
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  closeModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});