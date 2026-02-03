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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { IconMic, IconBook, IconDocument, AnimatedButton } from '../components';
import haptics from '../utils/haptics';

interface Memory {
  id: number;
  promptText: string;
  answer: string;
  audioUrl?: string;
  createdAt: string;
  collection?: string;
}

// Animated memory card component
function MemoryCard({
  item,
  index,
  onPress,
  formatDate,
  truncateText,
}: {
  item: Memory;
  index: number;
  onPress: () => void;
  formatDate: (date: string) => string;
  truncateText: (text: string, maxLength: number) => string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered entrance animation
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
    onPress();
  };

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
      }}
    >
      <Pressable
        style={styles.memoryCard}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.memoryHeader}>
          <Text style={styles.memoryDate}>{formatDate(item.createdAt)}</Text>
          {item.audioUrl && (
            <View style={styles.audioIndicator}>
              <IconMic size={14} color={colors.primary} />
            </View>
          )}
        </View>
        <Text style={styles.promptText}>{item.promptText}</Text>
        <Text style={styles.answerText}>{truncateText(item.answer, 150)}</Text>
        {item.collection && (
          <View style={styles.collectionBadge}>
            <Text style={styles.collectionText}>{item.collection}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function HistoryScreen({ navigation }: any) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const response = await api.getMemories();
      setMemories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMemories();
  }, []);

  const handleMemoryPress = (memory: Memory) => {
    navigation.navigate('MemoryDetail', { memory });
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

  const renderMemory = ({ item, index }: { item: Memory; index: number }) => (
    <MemoryCard
      item={item}
      index={index}
      onPress={() => handleMemoryPress(item)}
      formatDate={formatDate}
      truncateText={truncateText}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <IconBook size={48} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No memories yet</Text>
      <Text style={styles.emptyText}>
        Start recording your first memory to see it here
      </Text>
      <AnimatedButton
        title="Record a Memory"
        onPress={() => navigation.navigate('HomeTab')}
        variant="primary"
        size="lg"
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.sepia} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Memories</Text>
        <Text style={styles.headerSubtitle}>
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'} captured
        </Text>
      </View>

      <FlatList
        data={memories}
        renderItem={renderMemory}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          memories.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.sepia}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
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
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.displaySemiBold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.sepia,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  memoryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  memoryDate: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: colors.sepia,
  },
  audioIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 16,
    fontFamily: fonts.displaySemiBold,
    color: colors.ink,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  answerText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.sepia,
    lineHeight: 20,
  },
  collectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  collectionText: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: colors.sepia,
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
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.sepia,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
});
