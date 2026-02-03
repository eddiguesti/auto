/**
 * AnimatedButton
 * Ultra-premium button with sophisticated spring physics and visual effects
 *
 * Inspired by: Apple iOS buttons, Stripe, Linear
 *
 * Features:
 * - Sophisticated spring physics
 * - Gradient overlays
 * - 3D depth effect
 * - Haptic feedback
 * - Loading & disabled states
 * - Multiple variants
 */

import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { springs } from '../utils/animations';
import haptics from '../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticType?: 'light' | 'medium' | 'heavy' | 'none';
}

export default function AnimatedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  hapticType = 'medium',
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shadowOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    const hasDepth = variant === 'primary' || variant === 'secondary' || variant === 'accent';

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 400,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: hasDepth ? 3 : 1,
        tension: 400,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [variant]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;

    switch (hapticType) {
      case 'light':
        haptics.lightTap();
        break;
      case 'medium':
        haptics.mediumTap();
        break;
      case 'heavy':
        haptics.heavyTap();
        break;
    }

    onPress();
  }, [disabled, loading, hapticType, onPress]);

  const sizeConfig = {
    sm: {
      paddingVertical: 11,
      paddingHorizontal: 18,
      borderRadius: borderRadius.lg,
      fontSize: 14,
      iconSize: 16,
      gap: 6,
    },
    md: {
      paddingVertical: 15,
      paddingHorizontal: 24,
      borderRadius: borderRadius.xl,
      fontSize: 16,
      iconSize: 18,
      gap: 8,
    },
    lg: {
      paddingVertical: 18,
      paddingHorizontal: 32,
      borderRadius: borderRadius.xl,
      fontSize: 18,
      iconSize: 20,
      gap: 10,
    },
  };

  const variantConfig = {
    primary: {
      gradient: [colors.primaryLight, colors.primary] as const,
      bottomColor: colors.primaryDark,
      textColor: colors.textOnPrimary,
      borderWidth: 0,
      borderColor: 'transparent',
      shadowColor: colors.primary,
    },
    secondary: {
      gradient: [colors.secondaryLight, colors.secondary] as const,
      bottomColor: '#A8863A',
      textColor: colors.textOnPrimary,
      borderWidth: 0,
      borderColor: 'transparent',
      shadowColor: colors.secondary,
    },
    accent: {
      gradient: [colors.accentLight, colors.accent] as const,
      bottomColor: '#6B3342',
      textColor: colors.textOnPrimary,
      borderWidth: 0,
      borderColor: 'transparent',
      shadowColor: colors.accent,
    },
    outline: {
      gradient: ['transparent', 'transparent'] as const,
      bottomColor: 'transparent',
      textColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: 'transparent',
    },
    ghost: {
      gradient: ['transparent', 'transparent'] as const,
      bottomColor: 'transparent',
      textColor: colors.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      shadowColor: 'transparent',
    },
  };

  const config = sizeConfig[size];
  const vConfig = variantConfig[variant];
  const hasDepth = variant === 'primary' || variant === 'secondary' || variant === 'accent';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        fullWidth && styles.fullWidth,
        {
          transform: [{ scale: scaleAnim }, { translateY }],
        },
        style,
      ]}
    >
      {/* Shadow layer */}
      {hasDepth && (
        <Animated.View
          style={[
            styles.shadowLayer,
            {
              backgroundColor: vConfig.shadowColor,
              borderRadius: config.borderRadius,
              opacity: shadowOpacity.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.1, 0.25],
              }),
            },
          ]}
        />
      )}

      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          {
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            borderRadius: config.borderRadius,
            borderWidth: vConfig.borderWidth,
            borderColor: vConfig.borderColor,
            borderBottomWidth: hasDepth && !pressed ? 4 : vConfig.borderWidth,
            borderBottomColor: hasDepth ? vConfig.bottomColor : vConfig.borderColor,
          },
          disabled && styles.disabled,
          fullWidth && styles.fullWidth,
        ]}
      >
        {/* Gradient background for solid variants */}
        {hasDepth && (
          <LinearGradient
            colors={vConfig.gradient}
            style={[styles.gradient, { borderRadius: config.borderRadius }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        {/* Top highlight for 3D effect */}
        {hasDepth && (
          <View
            style={[
              styles.topHighlight,
              { borderTopLeftRadius: config.borderRadius, borderTopRightRadius: config.borderRadius },
            ]}
          />
        )}

        {/* Content */}
        {loading ? (
          <ActivityIndicator
            color={vConfig.textColor}
            size="small"
          />
        ) : (
          <View style={[styles.content, { gap: config.gap }]}>
            {icon && iconPosition === 'left' && icon}
            <Text
              style={[
                styles.text,
                {
                  fontSize: config.fontSize,
                  color: vConfig.textColor,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && icon}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  shadowLayer: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: -4,
    height: '100%',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.3,
    zIndex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});
