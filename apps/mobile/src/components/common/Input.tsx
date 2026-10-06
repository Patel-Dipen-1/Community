import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';

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
          placeholderTextColor="#64748b"
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
    marginBottom: 16,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  eyeBtn: {
    paddingLeft: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  inputError: {
    borderColor: '#f43f5e',
  },
  errorText: {
    color: '#fb7185',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
