import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { registerPushToken } from '../notifications';
import { colors } from '../theme';

export default function Login() {
  const navigation = useNavigation();
  const { login, orderType } = useAuth();
  const [step, setStep] = useState('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!name.trim()) return setError('Name is required');
    if (phone.length < 10) return setError('Enter a valid phone number');
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await api.sendOtp(phone);
      setNotice(res.otp ? `Your OTP is ${res.otp}` : 'OTP sent');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) return setError('Enter a valid OTP');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp, name);
      login(res.user);
      registerPushToken();
      navigation.replace(orderType ? 'Menu' : 'Landing');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>
            Flavours <Text style={styles.logoAccent}>BOB</Text>
          </Text>

          <Text style={styles.heading}>{step === 'phone' ? 'Welcome' : 'Verify OTP'}</Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Enter your details to get started'
              : `Check the in-app notification for ${phone}`}
          </Text>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>🔔 {notice}</Text>}

          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghost}
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                  setNotice('');
                }}
              >
                <Text style={styles.ghostText}>Change Number</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: { padding: 24, paddingTop: 48 },
  logo: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 26, color: colors.textPrimary, marginBottom: 40 },
  logoAccent: { color: colors.accent },
  heading: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 36, color: colors.textPrimary, marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginBottom: 28 },
  error: {
    backgroundColor: colors.danger,
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 13,
  },
  notice: {
    backgroundColor: colors.accentBg,
    color: colors.accent,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  ghost: { alignItems: 'center', padding: 14, marginTop: 8 },
  ghostText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
});
