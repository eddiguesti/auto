import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import api from '../services/api';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';

interface Collection {
  id: number;
  name: string;
  description: string;
  icon: string;
  promptCount: number;
  completedCount: number;
}

// Icon component mapping for collections
const getCollectionIcon = (name: string, size: number = 28, color: string = colors.primary) => {
  const iconProps = { size, color };

  switch (name) {
    case 'Childhood Memories':
      return <Ionicons name="happy-outline" {...iconProps} />;
    case 'Family Traditions':
      return <Ionicons name="people-outline" {...iconProps} />;
    case 'Life Lessons':
      return <Ionicons name="book-outline" {...iconProps} />;
    case 'Career Journey':
      return <Ionicons name="briefcase-outline" {...iconProps} />;
    case 'Travel Adventures':
      return <Ionicons name="airplane-outline" {...iconProps} />;
    case 'Love & Relationships':
      return <Ionicons name="heart-outline" {...iconProps} />;
    case 'Achievements':
      return <Ionicons name="trophy-outline" {...iconProps} />;
    case 'Daily Life':
      return <Feather name="sun" {...iconProps} />;
    default:
      return <Feather name="edit-3" {...iconProps} />;
  }
};

export default function CollectionsScreen({ navigation }: any) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.getCollections();
      setCollections(response.data || []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      // Use default collections as fallback
      setCollections([
        { id: 1, name: 'Childhood Memories', description: 'Your earliest memories and formative years', icon: '', promptCount: 15, completedCount: 3 },
        { id: 2, name: 'Family Traditions', description: 'Customs and rituals passed down through generations', icon: '', promptCount: 12, completedCount: 0 },
        { id: 3, name: 'Life Lessons', description: 'Wisdom gained through experience', icon: '', promptCount: 20, completedCount: 5 },
        { id: 4, name: 'Career Journey', description: 'Your professional path and achievements', icon: '', promptCount: 10, completedCount: 2 },
        { id: 5, name: 'Travel Adventures', description: 'Places you\'ve been and adventures you\'ve had', icon: '', promptCount: 18, completedCount: 0 },
        { id: 6, name: 'Love & Relationships', description: 'Stories of connection and companionship', icon: '', promptCount: 14, completedCount: 1 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionPress = (collection: Collection) => {
    navigation.navigate('CollectionDetail', { collection });
  };

  const renderCollection = ({ item }: { item: Collection }) => {
    const progress = item.promptCount > 0
      ? (item.completedCount / item.promptCount) * 100
      : 0;

    return (
      <TouchableOpacity
        style={styles.collectionCard}
        onPress={() => handleCollectionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.collectionHeader}>
          <View style={styles.iconContainer}>
            {getCollectionIcon(item.name)}
          </View>
          <View style={styles.collectionInfo}>
            <Text style={styles.collectionName}>{item.name}</Text>
            <Text style={styles.collectionDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {item.completedCount}/{item.promptCount} prompts
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>Collections</Text>
        <Text style={styles.headerSubtitle}>
          Explore themed memory prompts
        </Text>
      </View>

      <FlatList
        data={collections}
        renderItem={renderCollection}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  collectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  collectionHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 18,
    fontFamily: fonts.displaySemiBold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  collectionDescription: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.sepia,
    lineHeight: 20,
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.cream,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: colors.sepia,
    textAlign: 'right',
  },
});
