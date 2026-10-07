import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { colors, typography, borderRadius, spacing } from '../../theme/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  style,
  isPassword,
  secureTextEntry,
  ...props
}) => {
  const isPasswordField = Boolean(isPassword || secureTextEntry);
  const [passwordHidden, setPasswordHidden] = useState(true);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : undefined]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textSubtle}
          secureTextEntry={isPasswordField ? passwordHidden : false}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setPasswordHidden(!passwordHidden)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.eyeIcon}>{passwordHidden ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg - 2,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textMain,
    fontSize: typography.fontSize.md,
  },
  eyeBtn: {
    paddingLeft: spacing.sm + 2,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: typography.fontSize.xl,
  },
  inputError: {
    borderColor: colors.errorLight,
  },
  errorText: {
    color: colors.errorLight,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
