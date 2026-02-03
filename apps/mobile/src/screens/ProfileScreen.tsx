import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import {
  IconFlame,
  IconDocument,
  IconStar,
  IconTrophy,
  IconBell,
  IconUsers,
  IconShare,
  IconSettings,
  IconHeart,
  IconChevronRight,
} from '../components';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const gameState = useGame();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const levelProgress = gameState.totalXp % 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Memory Keeper'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconFlame size={24} color={colors.streak} />
            <Text style={styles.statValue}>{gameState.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <IconDocument size={24} color={colors.primary} />
            <Text style={styles.statValue}>{gameState.totalMemories}</Text>
            <Text style={styles.statLabel}>Memories</Text>
          </View>
          <View style={styles.statCard}>
            <IconStar size={24} color={colors.gold} />
            <Text style={styles.statValue}>{gameState.totalXp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <IconTrophy size={24} color={colors.gold} />
            <Text style={styles.statValue}>{gameState.currentLevel}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>

        {/* Level Progress */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelTitle}>Level {gameState.currentLevel}</Text>
            <Text style={styles.levelXp}>{levelProgress}/100 XP</Text>
          </View>
          <View style={styles.levelBar}>
            <View style={[styles.levelFill, { width: `${levelProgress}%` }]} />
          </View>
          <Text style={styles.levelHint}>
            {100 - levelProgress} XP until level {gameState.currentLevel + 1}
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          <MenuItem
            icon={<IconBell size={20} color={colors.text} />}
            label="Notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <MenuItem
            icon={<IconUsers size={20} color={colors.text} />}
            label="Family Circle"
            onPress={() => navigation.navigate('FamilyCircle')}
          />
          <MenuItem
            icon={<IconShare size={20} color={colors.text} />}
            label="Export Memories"
            onPress={() => navigation.navigate('Export')}
          />
          <MenuItem
            icon={<IconSettings size={20} color={colors.text} />}
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
          <MenuItem
            icon={<IconHeart size={20} color={colors.accent} filled={false} />}
            label="Help & Support"
            onPress={() => navigation.navigate('Support')}
            isLast
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Memory Quest v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconWrapper}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <IconChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.textOnPrimary,
  },
  name: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  levelCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  levelTitle: {
    fontSize: 18,
    fontFamily: fonts.displayMedium,
    color: colors.text,
  },
  levelXp: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
  levelBar: {
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  levelFill: {
    height: '100%',
    backgroundColor: colors.xp,
    borderRadius: 5,
  },
  levelHint: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
