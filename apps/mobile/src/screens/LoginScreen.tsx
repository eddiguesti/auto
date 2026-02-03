/**
 * LoginScreen
 * Premium onboarding and authentication experience
 *
 * Design principles:
 * - Welcoming, friendly first impression
 * - Smooth entrance animations
 * - Clear value proposition
 * - Haptic feedback for interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { springs, easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';
import { AnimatedButton, IconBook, IconMic, IconFlame, IconFeather } from '../components';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Entrance animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;

  // Logo breathing animation
  const logoBreath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    runEntranceAnimations();
    startBreathingAnimation();
  }, []);

  const runEntranceAnimations = () => {
    Animated.stagger(150, [
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          ...springs.bouncy,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: durations.fast,
          useNativeDriver: true,
        }),
      ]),
      // Title fades up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]),
      // Form slides up
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(formTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]),
      // Features fade in
      Animated.timing(featuresOpacity, {
        toValue: 1,
        duration: durations.slow,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startBreathingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoBreath, {
          toValue: 1.05,
          duration: 2000,
          easing: easings.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(logoBreath, {
          toValue: 1,
          duration: 2000,
          easing: easings.easeInOut,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      haptics.error();
      Alert.alert('Missing Information', 'Please fill in all fields to continue.');
      return;
    }

    haptics.mediumTap();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      haptics.success();
    } catch (error: any) {
      haptics.error();
      Alert.alert(
        'Something went wrong',
        error.message || 'Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    haptics.lightTap();
    setIsLogin(!isLogin);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Animated.View
              style={[
                styles.logoCircle,
                {
                  opacity: logoOpacity,
                  transform: [
                    { scale: Animated.multiply(logoScale, logoBreath) },
                  ],
                },
              ]}
            >
              <IconBook size={44} color={colors.primary} />
            </Animated.View>

            <Animated.View
              style={{
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              }}
            >
              <Text style={styles.title}>Memory Quest</Text>
              <Text style={styles.subtitle}>
                Capture your life story, one memory at a time
              </Text>
            </Animated.View>
          </View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <Text style={styles.formTitle}>
              {isLogin ? 'Welcome back!' : 'Start your journey'}
            </Text>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="How should we call you?"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Primary Button */}
            <AnimatedButton
              title={isLogin ? 'Sign In' : 'Get Started'}
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              style={{ marginTop: spacing.md }}
            />

            {/* Toggle */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleLink}>
                  {isLogin ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Features */}
          <Animated.View style={[styles.features, { opacity: featuresOpacity }]}>
            <FeatureItem
              icon={<IconMic size={24} color={colors.primary} />}
              title="Voice-first"
              description="Just speak your memories"
            />
            <FeatureItem
              icon={<IconFlame size={24} color={colors.streak} />}
              title="Stay motivated"
              description="Build daily streaks"
            />
            <FeatureItem
              icon={<IconFeather size={24} color={colors.primary} />}
              title="Beautiful stories"
              description="Create your legacy"
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        {icon}
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.lg,
  },

  // Form Card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Toggle
  toggleButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleLink: {
    fontWeight: '600',
    color: colors.primary,
  },

  // Features
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
});
