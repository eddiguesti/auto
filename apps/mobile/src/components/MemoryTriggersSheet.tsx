/**
 * MemoryTriggersSheet
 * Bottom sheet with memory trigger tips
 * Matches webapp's heritage aesthetic exactly
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { colors, spacing, fonts } from '../utils/theme';
import haptics from '../utils/haptics';
import {
  IconPhoto,
  IconMusic,
  IconLocation,
  IconUser,
  IconChevronDown,
  IconX,
  IconExternalLink,
  IconLightbulb,
} from './Icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Heritage colors from STYLE_GUIDE.md
const COLORS = {
  cream: '#FBF7F2',
  card: '#FFFCF9',
  ink: '#3D3833',
  text: '#6B6560',
  sepia: '#9C7B5C',
  sepiaLight: '#D4C4B0',
  amber50: '#FFFBEB',
  amber600: '#D97706',
};

interface MemoryTriggersSheetProps {
  visible: boolean;
  onClose: () => void;
  chapterId?: string;
}

interface Trigger {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  tip: string;
}

// Memory trigger categories with simple background colors
const TRIGGERS: Trigger[] = [
  {
    id: 'photos',
    icon: <IconPhoto size={20} color={COLORS.sepia} />,
    iconBg: 'rgba(156, 123, 92, 0.1)',
    title: 'Look at old photos',
    tip: 'Browse family albums or phone photos from that time. Images often unlock forgotten details.',
  },
  {
    id: 'music',
    icon: <IconMusic size={20} color={COLORS.sepia} />,
    iconBg: 'rgba(156, 123, 92, 0.1)',
    title: 'Play music from that era',
    tip: "Songs transport us back instantly. Search for top hits from the year you're remembering.",
  },
  {
    id: 'smells',
    icon: <SmellIcon />,
    iconBg: 'rgba(156, 123, 92, 0.1)',
    title: 'Think about smells',
    tip: "What did the kitchen smell like? Grandma's perfume? Fresh-cut grass? Smells trigger powerful memories.",
  },
  {
    id: 'location',
    icon: <IconLocation size={20} color={COLORS.sepia} />,
    iconBg: 'rgba(156, 123, 92, 0.1)',
    title: 'Revisit the place',
    tip: 'Use Google Street View to see your old house, school, or neighbourhood. Walk through it in your mind.',
  },
  {
    id: 'objects',
    icon: <ObjectIcon />,
    iconBg: 'rgba(156, 123, 92, 0.1)',
    title: 'Hold an old object',
    tip: 'A piece of jewellery, a book, a toy - holding something from that time can unlock vivid memories.',
  },
  {
    id: 'people',
    icon: <IconUser size={20} color={COLORS.sepia} />,
    iconBg: 'rgba(156, 123, 92, 0.1)',
    title: 'Call someone who was there',
    tip: "A sibling, old friend, or relative might remember details you've forgotten. Memories spark memories.",
  },
];

// Decade-specific music suggestions
const MUSIC_BY_ERA: Record<string, string[]> = {
  '1950s': ['Rock Around the Clock', 'Johnny B. Goode', 'Jailhouse Rock'],
  '1960s': ['Hey Jude', 'Respect', 'Good Vibrations'],
  '1970s': ['Bohemian Rhapsody', "Stayin' Alive", 'Hotel California'],
  '1980s': ['Billie Jean', "Sweet Child O' Mine", 'Take On Me'],
  '1990s': ['Smells Like Teen Spirit', 'Wonderwall', 'Wannabe'],
  '2000s': ['Crazy in Love', 'Mr. Brightside', 'Umbrella'],
};

// Custom icons
function SmellIcon() {
  return (
    <View style={styles.customIcon}>
      <Text style={[styles.customIconText, { color: COLORS.sepia }]}>~</Text>
    </View>
  );
}

function ObjectIcon() {
  return (
    <View style={styles.customIcon}>
      <Text style={[styles.customIconText, { color: COLORS.sepia }]}>*</Text>
    </View>
  );
}

// Animated trigger item
function TriggerItem({
  trigger,
  index,
  isExpanded,
  onPress,
  chapterId,
}: {
  trigger: Trigger;
  index: number;
  isExpanded: boolean;
  onPress: () => void;
  chapterId?: string;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 80,
      friction: 12,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: isExpanded ? 1 : 0,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const getEra = () => {
    if (chapterId === 'earliest-memories' || chapterId === 'childhood') return '1960s';
    if (chapterId === 'teenage-years') return '1970s';
    return '1980s';
  };

  const openYouTube = (song: string) => {
    haptics.lightTap();
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`);
  };

  const openMaps = () => {
    haptics.lightTap();
    Linking.openURL('https://www.google.com/maps');
  };

  const era = getEra();
  const musicSuggestions = MUSIC_BY_ERA[era] || [];

  return (
    <Animated.View
      style={[
        styles.triggerWrapper,
        {
          opacity: slideAnim,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.triggerItem, isExpanded && styles.triggerItemExpanded]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.triggerIcon, { backgroundColor: trigger.iconBg }]}>
          {trigger.icon}
        </View>

        <Text style={[styles.triggerTitle, isExpanded && styles.triggerTitleExpanded]}>
          {trigger.title}
        </Text>

        <Animated.View
          style={{
            transform: [
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <IconChevronDown size={18} color={COLORS.text} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.expandedContent,
            {
              opacity: expandAnim,
            },
          ]}
        >
          <Text style={styles.tipText}>{trigger.tip}</Text>

          {/* Music suggestions */}
          {trigger.id === 'music' && musicSuggestions.length > 0 && (
            <View style={styles.musicSection}>
              <Text style={styles.musicLabel}>Try searching for:</Text>
              <View style={styles.musicTags}>
                {musicSuggestions.map(song => (
                  <TouchableOpacity
                    key={song}
                    style={styles.musicTag}
                    onPress={() => openYouTube(song)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.musicTagText}>{song}</Text>
                    <IconExternalLink size={10} color={COLORS.sepia} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Google Maps link */}
          {trigger.id === 'location' && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={openMaps}
              activeOpacity={0.7}
            >
              <IconExternalLink size={14} color={COLORS.sepia} />
              <Text style={styles.mapButtonText}>Open Google Maps</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function MemoryTriggersSheet({
  visible,
  onClose,
  chapterId,
}: MemoryTriggersSheetProps) {
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleTriggerPress = (triggerId: string) => {
    haptics.lightTap();
    setExpandedTrigger(expandedTrigger === triggerId ? null : triggerId);
  };

  const handleClose = () => {
    haptics.lightTap();
    onClose();
  };

  const displayTriggers = showAll ? TRIGGERS : TRIGGERS.slice(0, 4);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <IconLightbulb size={22} color={COLORS.amber600} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Memory Triggers</Text>
                <Text style={styles.headerSubtitle}>Unlock hidden memories</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconX size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Struggling to remember? These techniques can help unlock vivid details:
          </Text>

          {/* Triggers List */}
          <ScrollView
            style={styles.triggersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.triggersContent}
          >
            {displayTriggers.map((trigger, index) => (
              <TriggerItem
                key={trigger.id}
                trigger={trigger}
                index={index}
                isExpanded={expandedTrigger === trigger.id}
                onPress={() => handleTriggerPress(trigger.id)}
                chapterId={chapterId}
              />
            ))}

            {/* Show More Button */}
            {!showAll && TRIGGERS.length > 4 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => {
                  haptics.lightTap();
                  setShowAll(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.showMoreText}>
                  Show {TRIGGERS.length - 4} more techniques
                </Text>
                <IconChevronDown size={16} color={COLORS.sepia} />
              </TouchableOpacity>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.75,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(156, 123, 92, 0.3)', // sepia/30
    borderRadius: 2,
  },

  // Header - matches webapp bg-sepia/5
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 123, 92, 0.15)', // sepia/15
    backgroundColor: 'rgba(156, 123, 92, 0.05)', // sepia/5
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.amber50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
    color: COLORS.ink,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: 'rgba(156, 123, 92, 0.7)', // sepia/70
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(156, 123, 92, 0.1)', // sepia/10
    justifyContent: 'center',
    alignItems: 'center',
  },

  description: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: 'rgba(156, 123, 92, 0.7)', // sepia/70
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: spacing.md,
    lineHeight: 20,
  },

  // Triggers List
  triggersList: {
    flex: 1,
  },
  triggersContent: {
    paddingHorizontal: 16,
    paddingBottom: spacing.xl,
  },
  triggerWrapper: {
    marginBottom: spacing.sm,
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // white/70
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.15)', // sepia/15
  },
  triggerItemExpanded: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(156, 123, 92, 0.25)', // sepia/25
  },
  triggerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  triggerTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.body,
    color: COLORS.ink,
  },
  triggerTitleExpanded: {
    fontFamily: fonts.bodyMedium,
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: 12,
    paddingTop: spacing.sm,
    paddingBottom: 12,
    marginTop: -4,
    marginLeft: 52,
  },
  tipText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: COLORS.text,
    lineHeight: 21,
  },

  // Music Section
  musicSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 123, 92, 0.15)', // sepia/15
  },
  musicLabel: {
    fontSize: 12,
    fontFamily: fonts.sans,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: spacing.sm,
  },
  musicTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(156, 123, 92, 0.1)', // sepia/10
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.15)', // sepia/15
  },
  musicTagText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: COLORS.sepia,
  },

  // Map Button
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(156, 123, 92, 0.1)', // sepia/10
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.15)', // sepia/15
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: COLORS.sepia,
  },

  // Show More
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    marginTop: spacing.sm,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: COLORS.sepia,
  },

  bottomSpacer: {
    height: spacing.xl,
  },

  // Custom icons
  customIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
