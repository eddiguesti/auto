/**
 * CallMeScreen
 * Phone call request - mirrors web CallMe.jsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fonts, shadows } from '../utils/theme';
import haptics from '../utils/haptics';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IconChevronLeft, IconPhone, IconCheck } from '../components';

export default function CallMeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [calling, setCalling] = useState(false);
  const [called, setCalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCall = async () => {
    if (!phone.trim()) return;

    // Basic validation
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    // Ensure E.164 format
    let formatted = cleaned;
    if (!formatted.startsWith('+')) {
      if (formatted.startsWith('0')) {
        formatted = '+44' + formatted.slice(1); // UK default
      } else {
        formatted = '+' + formatted;
      }
    }

    setCalling(true);
    setError(null);
    haptics.mediumTap();

    try {
      await api.requestCall(formatted);
      setCalled(true);
      haptics.successNotification();
    } catch (err: any) {
      console.error('Call error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setCalling(false);
    }
  };

  if (called) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <IconPhone size={32} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.successTitle}>Calling you now!</Text>
          <Text style={styles.successSub}>
            Pick up the phone when it rings. Our AI interviewer will guide you through sharing your memories.
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <IconChevronLeft size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Call Me</Text>
        <Text style={styles.subtitle}>
          Enter your phone number and we'll call you right now. Our AI interviewer will have a friendly conversation to help you capture your memories.
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="+44 7700 900000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>

        <View style={styles.consentNote}>
          <Text style={styles.consentText}>
            By tapping "Call Me Now", you consent to receiving a phone call at this number. Standard rates may apply.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.callButton,
            (!phone.trim() || calling) && styles.callButtonDisabled,
          ]}
          onPress={handleCall}
          disabled={!phone.trim() || calling}
          activeOpacity={0.8}
        >
          {calling ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <IconPhone size={20} color={colors.textOnPrimary} />
              <Text style={styles.callText}>Call Me Now</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>We call your phone within seconds</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>Our AI interviewer asks thoughtful questions</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>Your stories are transcribed and added to your memoir</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>Calls are typically 10–20 minutes</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Header
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  backText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Content
  title: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },

  // Error
  errorBanner: {
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#DC2626',
  },

  // Input
  inputSection: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  phoneInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontFamily: fonts.body,
    color: colors.text,
  },

  // Consent
  consentNote: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  consentText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    lineHeight: 20,
  },

  // Call button
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#16A34A',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  callButtonDisabled: {
    opacity: 0.4,
  },
  callText: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: colors.textOnPrimary,
  },

  // Info section
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    flex: 1,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSub: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.button,
  },
  doneText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.textOnPrimary,
  },
});
