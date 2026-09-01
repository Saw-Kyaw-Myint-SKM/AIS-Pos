import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { createPasswordVerifier, createSessionToken } from '../auth';
import { createInitialOwner, type CustomerProfile, type LocalAccount } from '../db';
import { t } from '../i18n';
import { colors, font } from '../theme';

const LOGO = require('../../assets/source-mm-logo.png');
const PHONE_RE = /^\d{9,11}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onDone: (profile: CustomerProfile, account: LocalAccount) => void;
};

type FieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
};

export default function RegisterScreen({ onDone }: Props) {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('aisource.mm@gmail.com');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(formY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [opacity, formY]);

  const validate = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = t.auth.required;
    if (!phone.trim()) next.phone = t.auth.required;
    else if (!PHONE_RE.test(phone.trim())) next.phone = t.register.invalidPhone;
    if (!email.trim()) next.email = t.auth.required;
    else if (!EMAIL_RE.test(email.trim())) next.email = t.auth.invalidEmail;
    if (!address.trim()) next.address = t.auth.required;
    if (password.length < 8) next.password = t.auth.passwordShort;
    if (confirmPassword !== password) next.confirmPassword = t.auth.passwordMismatch;
    return next;
  }, [address, confirmPassword, email, name, password, phone]);

  const onSubmit = useCallback(async () => {
    if (submitting) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    try {
      const verifier = await createPasswordVerifier(password);
      const account = await createInitialOwner(
        db,
        { name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), address: address.trim() },
        { name: name.trim(), email: email.trim().toLowerCase(), ...verifier },
        await createSessionToken(),
      );
      const profile: CustomerProfile = {
        id: 1, name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), address: address.trim(),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      onDone(profile, account);
    } catch (error) {
      console.warn('[auth:owner-setup]', error);
      setErrors((current) => ({ ...current, submit: t.auth.setupError }));
    } finally {
      setSubmitting(false);
    }
  }, [address, db, email, name, onDone, password, phone, submitting, validate]);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity, transform: [{ translateY: formY }] }}>
            <View style={styles.logoWrap}><View style={styles.logoFrame}><Image source={LOGO} style={styles.logo} resizeMode="cover" /></View></View>
            <AppText bold style={styles.title}>{t.auth.setupTitle}</AppText>
            <AppText style={styles.hint}>{t.auth.setupHint}</AppText>
            <View style={styles.form}>
              <AppInput variant="underline" label={t.register.name} value={name} onChangeText={(value) => setName(value)} error={errors.name} autoCapitalize="words" />
              <AppInput variant="underline" label={t.register.phone} value={phone} onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, ''))} error={errors.phone} keyboardType="number-pad" maxLength={11} />
              <AppInput variant="underline" label={t.auth.email} value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
              <AppInput variant="underline" label={t.register.address} value={address} onChangeText={setAddress} error={errors.address} autoCapitalize="words" />
              <AppInput variant="underline" label={t.auth.password} value={password} onChangeText={setPassword} error={errors.password} secureTextEntry autoCapitalize="none" autoCorrect={false} />
              <AppInput variant="underline" label={t.auth.confirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />
              {errors.submit ? <AppText style={styles.submitError}>{errors.submit}</AppText> : null}
            </View>
            <View style={styles.submitWrap}><AppButton variant="primary" label={t.auth.createOwner} onPress={() => { void onSubmit(); }} disabled={submitting} fullWidth /></View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface }, flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 36 },
  logoWrap: { alignItems: 'center' }, logoFrame: { width: 112, height: 112, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 56 }, logo: { width: 112, height: 112 },
  title: { fontFamily: font.bold, fontSize: 21, color: colors.text, textAlign: 'center', marginTop: 16 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 21, marginTop: 8 }, form: { marginTop: 24 },
  submitWrap: { marginTop: 16 }, submitError: { color: colors.danger, fontSize: 13, textAlign: 'center', marginTop: 2 },
});
