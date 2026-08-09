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
import { router } from 'expo-router';

import { requestPasswordReset } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequestReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setErrorMessage('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const responseMessage = await requestPasswordReset(trimmedEmail);
      setMessage(responseMessage);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send the reset link. Please try again.',
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

          <Text style={styles.title}>Forgot Password?</Text>

          <Text style={styles.subtitle}>
            Enter your email address and we&apos;ll send you a password reset
            link.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#8A919F"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isSubmitting}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleRequestReset}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {message ? (
              <Text style={styles.successText}>{message}</Text>
            ) : null}

            <Pressable
              onPress={handleRequestReset}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && !isSubmitting && styles.resetButtonPressed,
                isSubmitting && styles.resetButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Link</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.back()}
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
    marginBottom: 38,
  },

  logo: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },

  brandText: {
    fontSize: 32,
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
    marginBottom: 32,
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

  input: {
    height: 58,
    borderWidth: 1,
    borderColor: '#D7DBE3',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  errorText: {
    color: '#D32F2F',
    fontSize: 14,
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
    marginTop: 26,
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