import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError || profileData.role !== 'admin') {
          await supabase.auth.signOut();
          Alert.alert('Access Denied', 'This email is not registered as an administrator.');
          return;
        }

        console.log('Admin logged in:', data.user.email);
        router.replace('/(drawer)');
      }
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.backgroundDecoration} />
            <View style={styles.backgroundDecorationSmall} />

            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <MaterialIcons name="admin-panel-settings" size={52} color="#00355f" />
              </View>
              <Text style={styles.title}>Admin Panel</Text>
              <Text style={styles.subtitle}>AP Cebu Tours</Text>
              <Text style={styles.description}>
                Sign in to manage your tour business
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={22} color="#00355f" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#6b7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={22} color="#00355f" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#6b7280"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={22}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={styles.loadingIcon} />
                      <Text style={styles.loginButtonText}>Signing In...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Secure Access</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.securityBadge}>
                <MaterialIcons name="security" size={18} color="#eec218" />
                <Text style={styles.securityText}>
                  Encrypted & Secure
                </Text>
              </View>

              <View style={styles.versionContainer}>
                <MaterialIcons name="shield" size={16} color="#6b7280" />
                <Text style={styles.versionText}>Version 1.0.0</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1 },
  content: {
    flex: 1, paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40,
    justifyContent: 'space-between', position: 'relative'
  },
  backgroundDecoration: {
    position: 'absolute', top: -100, right: -100, width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(238, 194, 24, 0.05)',
  },
  backgroundDecorationSmall: {
    position: 'absolute', bottom: 100, left: -50, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(238, 194, 24, 0.03)',
  },
  header: { alignItems: 'center', marginBottom: 40, zIndex: 1 },
  logoContainer: {
    width: 100, height: 100, backgroundColor: '#fff', borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: '#00355f', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 3, borderColor: 'rgba(0, 53, 95, 0.1)',
  },
  title: { fontSize: 32, fontWeight: '800', color: '#00355f', marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 18, color: '#eec218', fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 },
  description: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24, fontWeight: '400' },
  form: { flex: 1, justifyContent: 'center', maxWidth: 400, alignSelf: 'center', width: '100%', zIndex: 1 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 20, paddingHorizontal: 20, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(0, 53, 95, 0.1)',
  },
  inputIcon: { marginRight: 16 },
  input: { flex: 1, fontSize: 16, color: '#00355f', paddingVertical: 18, fontWeight: '500' },
  eyeIcon: { padding: 8 },
  loginButton: {
    backgroundColor: '#00355f', paddingVertical: 20, paddingHorizontal: 32, borderRadius: 16,
    shadowColor: '#00355f', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, marginBottom: 24,
  },
  loginButtonDisabled: { opacity: 0.7, shadowOpacity: 0.2 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  loadingIcon: { marginRight: 12 },
  buttonIcon: { marginLeft: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f9fafb' },
  dividerText: { marginHorizontal: 16, fontSize: 12, color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  footer: { alignItems: 'center', marginTop: 20, zIndex: 1 },
  securityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(238, 194, 24, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  securityText: { fontSize: 14, color: '#eec218', fontWeight: '600', marginLeft: 8 },
  versionContainer: { flexDirection: 'row', alignItems: 'center', opacity: 0.7 },
  versionText: { fontSize: 12, color: '#6b7280', marginLeft: 6, fontWeight: '500' },
});
