/**
 * MemosListScreen
 * Browse and manage quick voice memos
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import api, { Memo } from '../services/api';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { IconMic, IconDocument, AnimatedButton } from '../components';
import haptics from '../utils/haptics';

// Animated memo card component
function MemoCard({
  item,
  index,
  onPlay,
  onDelete,
  formatDate,
  truncateText,
  isPlaying,
}: {
  item: Memo;
  index: number;
  onPlay: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
  truncateText: (text: string, maxLength: number) => string;
  isPlaying: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 100,
        friction: 12,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    haptics.lightTap();
    onPlay();
  };

  const handleLongPress = () => {
    haptics.mediumTap();
    Alert.alert(
      'Delete Memo?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
      }}
    >
      <Pressable
        style={[styles.memoCard, isPlaying && styles.memoCardPlaying]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
      >
        <View style={styles.memoHeader}>
          <View style={styles.memoMeta}>
            <Text style={styles.memoDate}>{formatDate(item.created_at)}</Text>
            {item.duration && (
              <Text style={styles.memoDuration}>{formatDuration(item.duration)}</Text>
            )}
          </View>
          <View style={[styles.playButton, isPlaying && styles.playButtonActive]}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </View>
        </View>

        {item.title && <Text style={styles.memoTitle}>{item.title}</Text>}

        {item.transcript && (
          <Text style={styles.memoTranscript}>
            {truncateText(item.transcript, 150)}
          </Text>
        )}

        <View style={styles.memoFooter}>
          <View style={styles.audioIndicator}>
            <IconMic size={14} color={colors.primary} />
            <Text style={styles.audioLabel}>Voice Memo</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MemosListScreen({ navigation }: any) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    fetchMemos();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const fetchMemos = async () => {
    try {
      const response = await api.getMemos();
      setMemos(response.data || []);
    } catch (error) {
      console.error('Failed to fetch memos:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMemos();
  }, []);

  const handlePlay = async (memo: Memo) => {
    if (playingId === memo.id) {
      // Stop current playback
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setPlayingId(null);
      return;
    }

    // Stop any existing playback
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: memo.audio_url },
        { shouldPlay: true },
        (status: any) => {
          if (status.didJustFinish) {
            setPlayingId(null);
            newSound.unloadAsync();
          }
        }
      );
      setSound(newSound);
      setPlayingId(memo.id);
    } catch (error) {
      console.error('Failed to play audio:', error);
      Alert.alert('Playback Error', 'Could not play this memo.');
    }
  };

  const handleDelete = async (memo: Memo) => {
    try {
      await api.deleteMemo(memo.id);
      haptics.success();
      setMemos((prev) => prev.filter((m) => m.id !== memo.id));
    } catch (error) {
      console.error('Failed to delete memo:', error);
      Alert.alert('Delete Failed', 'Could not delete this memo.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const renderMemo = ({ item, index }: { item: Memo; index: number }) => (
    <MemoCard
      item={item}
      index={index}
      onPlay={() => handlePlay(item)}
      onDelete={() => handleDelete(item)}
      formatDate={formatDate}
      truncateText={truncateText}
      isPlaying={playingId === item.id}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <IconMic size={48} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No memos yet</Text>
      <Text style={styles.emptyText}>
        Record a quick voice memo to capture any thought or memory
      </Text>
      <AnimatedButton
        title="Record a Memo"
        onPress={() => navigation.navigate('QuickMemo')}
        variant="primary"
        size="lg"
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Voice Memos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('QuickMemo')}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {memos.length} {memos.length === 1 ? 'memo' : 'memos'} · Long press to delete
        </Text>
      </View>

      <FlatList
        data={memos}
        renderItem={renderMemo}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          memos.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.displaySemiBold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.background,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  memoCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memoCardPlaying: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  memoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memoDate: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  memoDuration: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.text,
  },
  playIcon: {
    fontSize: 18,
  },
  memoTitle: {
    fontSize: 18,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  memoTranscript: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  memoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  audioLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: fonts.displaySemiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
});
