/**
 * Icon Components
 * Professional icons using @expo/vector-icons (Feather, Ionicons)
 *
 * Design: Clean, minimal, elegant - matching premium memoir aesthetic
 */

import React from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Navigation Icons
export function IconHome({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="home" size={size} color={color} />;
}

export function IconExplore({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="compass" size={size} color={color} />;
}

export function IconBook({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="book-open" size={size} color={color} />;
}

export function IconUser({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="user" size={size} color={color} />;
}

// Recording Icons
export function IconMic({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="mic" size={size} color={color} />;
}

export function IconMicOff({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="mic-off" size={size} color={color} />;
}

// Gamification Icons
export function IconFlame({ size = 24, color = colors.streak }: IconProps) {
  return <MaterialCommunityIcons name="fire" size={size} color={color} />;
}

export function IconStar({ size = 24, color = colors.gold, filled = true }: IconProps & { filled?: boolean }) {
  return <Ionicons name={filled ? "star" : "star-outline"} size={size} color={color} />;
}

export function IconGem({ size = 24, color = colors.xp }: IconProps) {
  return <MaterialCommunityIcons name="diamond-stone" size={size} color={color} />;
}

export function IconTrophy({ size = 24, color = colors.gold }: IconProps) {
  return <Ionicons name="trophy" size={size} color={color} />;
}

export function IconHeart({ size = 24, color = colors.heart, filled = true }: IconProps & { filled?: boolean }) {
  return <Ionicons name={filled ? "heart" : "heart-outline"} size={size} color={color} />;
}

// Action Icons
export function IconCheck({ size = 24, color = colors.textOnPrimary }: IconProps) {
  return <Feather name="check" size={size} color={color} />;
}

export function IconClose({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="x" size={size} color={color} />;
}

export function IconPlus({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="plus" size={size} color={color} />;
}

export function IconEdit({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="edit-2" size={size} color={color} />;
}

export function IconTrash({ size = 24, color = colors.error }: IconProps) {
  return <Feather name="trash-2" size={size} color={color} />;
}

export function IconShare({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="share" size={size} color={color} />;
}

// Navigation/UI Icons
export function IconChevronRight({ size = 24, color = colors.textMuted }: IconProps) {
  return <Feather name="chevron-right" size={size} color={color} />;
}

export function IconChevronLeft({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="chevron-left" size={size} color={color} />;
}

export function IconArrowRight({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="arrow-right" size={size} color={color} />;
}

export function IconArrowLeft({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="arrow-left" size={size} color={color} />;
}

export function IconMenu({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="menu" size={size} color={color} />;
}

export function IconSettings({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="settings" size={size} color={color} />;
}

export function IconSearch({ size = 24, color = colors.textMuted }: IconProps) {
  return <Feather name="search" size={size} color={color} />;
}

// Document/Content Icons
export function IconDocument({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="file-text" size={size} color={color} />;
}

export function IconImage({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="image" size={size} color={color} />;
}

export function IconPlay({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="play" size={size} color={color} />;
}

export function IconPause({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="pause" size={size} color={color} />;
}

// Status Icons
export function IconInfo({ size = 24, color = colors.info }: IconProps) {
  return <Feather name="info" size={size} color={color} />;
}

export function IconAlert({ size = 24, color = colors.warning }: IconProps) {
  return <Feather name="alert-circle" size={size} color={color} />;
}

export function IconSuccess({ size = 24, color = colors.success }: IconProps) {
  return <Feather name="check-circle" size={size} color={color} />;
}

export function IconError({ size = 24, color = colors.error }: IconProps) {
  return <Feather name="x-circle" size={size} color={color} />;
}

// Calendar/Time Icons
export function IconCalendar({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="calendar" size={size} color={color} />;
}

export function IconClock({ size = 24, color = colors.textMuted }: IconProps) {
  return <Feather name="clock" size={size} color={color} />;
}

// Communication Icons
export function IconMail({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="mail" size={size} color={color} />;
}

export function IconBell({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="bell" size={size} color={color} />;
}

// Social/Family Icons
export function IconUsers({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="users" size={size} color={color} />;
}

export function IconGift({ size = 24, color = colors.accent }: IconProps) {
  return <Feather name="gift" size={size} color={color} />;
}

// Misc Icons
export function IconSun({ size = 24, color = colors.secondary }: IconProps) {
  return <Feather name="sun" size={size} color={color} />;
}

export function IconMoon({ size = 24, color = colors.textSecondary }: IconProps) {
  return <Feather name="moon" size={size} color={color} />;
}

export function IconLock({ size = 24, color = colors.textMuted }: IconProps) {
  return <Feather name="lock" size={size} color={color} />;
}

export function IconUnlock({ size = 24, color = colors.success }: IconProps) {
  return <Feather name="unlock" size={size} color={color} />;
}

export function IconRefresh({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="refresh-cw" size={size} color={color} />;
}

export function IconDownload({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="download" size={size} color={color} />;
}

export function IconUpload({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="upload" size={size} color={color} />;
}

// Writing/Memoir specific
export function IconFeather({ size = 24, color = colors.primary }: IconProps) {
  return <Feather name="feather" size={size} color={color} />;
}

export function IconPenTool({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="pen-tool" size={size} color={color} />;
}

export function IconType({ size = 24, color = colors.text }: IconProps) {
  return <Feather name="type" size={size} color={color} />;
}

export function IconBookmark({ size = 24, color = colors.accent }: IconProps) {
  return <Feather name="bookmark" size={size} color={color} />;
}

export function IconArchive({ size = 24, color = colors.textSecondary }: IconProps) {
  return <Feather name="archive" size={size} color={color} />;
}

// Leaf/Nature (for memoir themes)
export function IconLeaf({ size = 24, color = colors.primary }: IconProps) {
  return <MaterialCommunityIcons name="leaf" size={size} color={color} />;
}

export function IconTree({ size = 24, color = colors.primary }: IconProps) {
  return <MaterialCommunityIcons name="tree" size={size} color={color} />;
}
