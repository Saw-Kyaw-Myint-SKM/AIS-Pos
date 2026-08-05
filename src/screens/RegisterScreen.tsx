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
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { saveCustomerProfile, type CustomerProfile } from '../db';
import { t } from '../i18n';
import { font } from '../theme';

const LOGO = require('../../assets/source-mm-logo.png');

type Props = {
  onDone: (profile: CustomerProfile) => void;
};

type FieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
};

const PHONE_RE = /^\d{9,11}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onDone }: Props) {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
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
    if (!name.trim()) next.name = t.register.required;
    if (!phone.trim()) next.phone = t.register.required;
    else if (!PHONE_RE.test(phone.trim())) next.phone = t.register.invalidPhone;
    if (!email.trim()) next.email = t.register.required;
    else if (!EMAIL_RE.test(email.trim())) next.email = t.register.invalidEmail;
    if (!address.trim()) next.address = t.register.required;
    return next;
  }, [name, phone, email, address]);

  const onSubmit = useCallback(async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    try {
      await saveCustomerProfile(db, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      const saved = await db.getFirstAsync<CustomerProfile>(
        `SELECT id, name, phone, email, address,
                created_at AS createdAt, updated_at AS updatedAt
         FROM customer_profile WHERE id = 1`,
      );
      if (saved) onDone(saved);
    } finally {
      setSubmitting(false);
    }
  }, [db, name, phone, email, address, validate, onDone]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity, transform: [{ translateY: formY }] }}>
            <View style={styles.logoWrap}>
              <View style={styles.logoFrame}>
                <Image source={LOGO} style={styles.logo} resizeMode="cover" />
              </View>
            </View>

            <AppText bold style={styles.title}>
              {t.register.title}
            </AppText>

            <View style={styles.form}>
              <AppInput
                variant="underline"
                label={t.register.name}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                error={errors.name}
                autoCapitalize="words"
              />
              <AppInput
                variant="underline"
                label={t.register.phone}
                value={phone}
                onChangeText={(v) => {
                  const digits = v.replace(/[^0-9]/g, '');
                  setPhone(digits);
                  if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                }}
                error={errors.phone}
                keyboardType="number-pad"
                maxLength={11}
              />
              <AppInput
                variant="underline"
                label={t.register.email}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppInput
                variant="underline"
                label={t.register.address}
                value={address}
                onChangeText={(v) => {
                  setAddress(v);
                  if (errors.address) setErrors((e) => ({ ...e, address: undefined }));
                }}
                error={errors.address}
              />
            </View>

            <View style={styles.submitWrap}>
              <AppButton
                variant="pill"
                label={t.register.submit}
                onPress={onSubmit}
                disabled={submitting}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 24, paddingBottom: 32 },
  logoWrap: { alignItems: 'center' },
  logoFrame: {
    width: 140,
    height: 140,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 70,
  },
  logo: { width: 140, height: 140 },
  title: {
    fontFamily: font.bold,
    fontSize: 18,
    color: '#22302B',
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 10,
  },
  form: { marginTop: 4 },
  submitWrap: { marginTop: 28, alignItems: 'center' },
});
