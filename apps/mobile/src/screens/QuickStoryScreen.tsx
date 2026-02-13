/**
 * QuickStoryScreen
 * Free-form text entry - mirrors web QuickStory.jsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fonts, shadows } from '../utils/theme';
import haptics from '../utils/haptics';
import api from '../services/api';
import { IconChevronLeft, IconCheck } from '../components';

export default function QuickStoryScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    haptics.mediumTap();

    try {
      await api.createFreeStory(content.trim(), title.trim() || undefined);
      setSaved(true);
      haptics.successNotification();
      setTimeout(() => navigation.goBack(), 1200);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <IconCheck size={32} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.successTitle}>Story saved</Text>
          <Text style={styles.successSub}>Your memory has been preserved.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <IconChevronLeft size={20} color={colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tell a Story</Text>
          <Text style={styles.subtitle}>
            Write whatever comes to mind. A memory, a moment, a feeling.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Give it a title (optional)"
            placeholderTextColor={colors.textMuted}
            maxLength={200}
          />

          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Start writing your story..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.wordCount}>
            {wordCount > 0 ? `${wordCount} words` : ''}
          </Text>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!content.trim() || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!content.trim() || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveText}>Save Story</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: spacing.lg,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
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
    marginBottom: spacing.lg,
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

  // Inputs
  titleInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontFamily: fonts.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  contentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    minHeight: 250,
    lineHeight: 26,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  wordCount: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.xl,
    ...shadows.button,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.textOnPrimary,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  successSub: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
