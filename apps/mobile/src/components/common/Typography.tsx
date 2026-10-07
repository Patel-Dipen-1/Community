import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme/theme';

interface TextProps extends RNTextProps {
  children: React.ReactNode;
}

export const PageTitle: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.pageTitle, style]} {...props}>
    {children}
  </RNText>
);

export const SectionTitle: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.sectionTitle, style]} {...props}>
    {children}
  </RNText>
);

export const Heading: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.heading, style]} {...props}>
    {children}
  </RNText>
);

export const BodyText: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.bodyText, style]} {...props}>
    {children}
  </RNText>
);

export const MutedText: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.mutedText, style]} {...props}>
    {children}
  </RNText>
);

export const CaptionText: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.captionText, style]} {...props}>
    {children}
  </RNText>
);

export const LabelText: React.FC<TextProps> = ({ children, style, ...props }) => (
  <RNText style={[styles.labelText, style]} {...props}>
    {children}
  </RNText>
);

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.textMain,
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.heavy,
  },
  sectionTitle: {
    color: colors.primaryLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  heading: {
    color: colors.textMain,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  bodyText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
  },
  captionText: {
    color: colors.textSubtle,
    fontSize: typography.fontSize.xs,
  },
  labelText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
