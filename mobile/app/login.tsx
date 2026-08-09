import { Link } from 'expo-router';
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

import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setErrorMessage('Please enter your username and password.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(trimmedUsername, password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please try again.',
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
            <BrandLogo
              variant="horizontal"
              tone="dark"
              width={260}
              style={styles.brandLogo}
            />

            <Text style={styles.title}>Welcome Back!</Text>

            <Text style={styles.subtitle}>
              Sign in to access your account
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>

            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor="#8A919F"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              editable={!isSubmitting}
              style={styles.input}
              returnKeyType="next"
            />

            <Text style={[styles.label, styles.passwordLabel]}>
              Password
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#8A919F"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                style={styles.passwordInput}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                disabled={isSubmitting}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <Link href="/forgot-password" asChild>
              <Pressable
                disabled={isSubmitting}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot Password?
                </Text>
              </Pressable>
            </Link>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
              onPress={handleLogin}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.loginButton,
                pressed &&
                  !isSubmitting &&
                  styles.loginButtonPressed,
                isSubmitting && styles.loginButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
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
    marginBottom: 42,
  },

  brandLogo: {
    alignSelf: 'center',
    marginBottom: 42,
  },

  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 18,
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

  passwordLabel: {
    marginTop: 22,
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

  passwordContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: '#D7DBE3',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111827',
  },

  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  passwordToggleText: {
    color: '#1557E8',
    fontWeight: '600',
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 4,
  },

  forgotPasswordText: {
    color: '#1557E8',
    fontSize: 15,
    fontWeight: '600',
  },

  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginTop: 10,
  },

  loginButton: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  loginButtonPressed: {
    opacity: 0.8,
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    paddingBottom: 12,
  },
});