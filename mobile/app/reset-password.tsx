import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { resetPassword } from '@/services/auth';

export default function ResetPasswordScreen() {
  const { uid, token } = useLocalSearchParams<{
    uid?: string;
    token?: string;
  }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleResetPassword = async () => {
    if (!uid || !token) {
      setErrorMessage('This password reset link is invalid or incomplete.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The password confirmation does not match.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const message = await resetPassword(
        uid,
        token,
        newPassword,
        confirmPassword,
      );

      setSuccessMessage(message);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reset your password. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>11</Text>
            </View>

            <Text style={styles.brandText}>
              <Text style={styles.elevenText}>ELEVEN</Text>
              <Text style={styles.crmText}> CRM</Text>
            </Text>
          </View>

          <Text style={styles.title}>Reset Password</Text>

          <Text style={styles.subtitle}>
            Enter a new password for your ELEVEN CRM account.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>

            <View style={styles.passwordContainer}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter your new password"
                placeholderTextColor="#8A919F"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                style={styles.passwordInput}
              />

              <Pressable
                onPress={() => setShowNewPassword((value) => !value)}
                disabled={isSubmitting}
              >
                <Text style={styles.showText}>
                  {showNewPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.label, styles.confirmLabel]}>
              Confirm Password
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                placeholderTextColor="#8A919F"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                style={styles.passwordInput}
              />

              <Pressable
                onPress={() => setShowConfirmPassword((value) => !value)}
                disabled={isSubmitting}
              >
                <Text style={styles.showText}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : null}

            <Pressable
              onPress={handleResetPassword}
              disabled={isSubmitting || Boolean(successMessage)}
              style={({ pressed }) => [
                styles.resetButton,
                pressed &&
                  !isSubmitting &&
                  !successMessage &&
                  styles.resetButtonPressed,
                (isSubmitting || Boolean(successMessage)) &&
                  styles.resetButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.replace('/login')}
              disabled={isSubmitting}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>
          Copyright 2026 ELEVEN CRM. All rights reserved.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
  },

  brandText: {
    fontSize: 30,
    fontWeight: '800',
  },

  elevenText: {
    color: '#1557E8',
  },

  crmText: {
    color: '#111827',
  },

  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 28,
  },

  form: {
    width: '100%',
  },

  label: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 9,
  },

  confirmLabel: {
    marginTop: 20,
  },

  passwordContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: '#D7DBE3',
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  passwordInput: {
    flex: 1,
    fontSize: 17,
    color: '#111827',
  },

  showText: {
    color: '#1557E8',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },

  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  successText: {
    color: '#16803C',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  resetButton: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  resetButtonPressed: {
    opacity: 0.8,
  },

  resetButtonDisabled: {
    opacity: 0.6,
  },

  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  backButton: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },

  backButtonText: {
    color: '#1557E8',
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    paddingBottom: 12,
  },
});
