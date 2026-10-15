import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme';
import { useStore } from '../store';

export function LoginScreen() {
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('admin@ashletrato.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const ok = await login(email, password);
    if (!ok) {
      setError('Invalid credentials — owner password or staff email + PIN.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Text style={styles.title}>ASH LETRATO POS</Text>
        <Text style={styles.sub}>Sign in to your register</Text>

        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.stone[400]}
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
          onPress={submit}
        >
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pine[950],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 28,
  },
  logoImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 14, color: colors.stone[500], marginTop: 2, marginBottom: 22 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.stone[500],
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.stone[300],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 14,
  },
  error: {
    backgroundColor: '#FBE9E0',
    color: colors.clay,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.pine[800],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
