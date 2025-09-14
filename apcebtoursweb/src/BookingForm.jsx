import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    guests: '',
    date: '',
    specialRequests: ''
  });
  
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.guests.trim()) newErrors.guests = 'Number of guests is required';
    else if (isNaN(formData.guests) || parseInt(formData.guests) < 1) newErrors.guests = 'Please enter a valid number';
    if (!formData.date.trim()) newErrors.date = 'Preferred date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      router.push('/booking-success');
    } else {
      Alert.alert('Please fix the errors', 'Some fields need your attention');
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const InputField = ({ 
    label, 
    field, 
    placeholder, 
    keyboardType = 'default', 
    icon, 
    iconType = 'MaterialIcons',
    multiline = false,
    maxLength
  }) => {
    const IconComponent = iconType === 'Ionicons' ? Ionicons : 
                         iconType === 'FontAwesome5' ? FontAwesome5 : MaterialIcons;
    
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={[
          styles.inputWrapper,
          focusedField === field && styles.inputWrapperFocused,
          errors[field] && styles.inputWrapperError
        ]}>
          <View style={styles.inputIconContainer}>
            <IconComponent 
              name={icon} 
              size={20} 
              color={focusedField === field ? '#eec218' : '#6b7280'} 
            />
          </View>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={formData[field]}
            onChangeText={(value) => updateField(field, value)}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            keyboardType={keyboardType}
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField(null)}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            maxLength={maxLength}
          />
        </View>
        {errors[field] && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{errors[field]}</Text>
          </View>
        )}
      </View>
    );
  };

  const tourDetails = {
    title: "Island Hopping Adventure",
    price: "₱3,500",
    duration: "8 hours"
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#00355f" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tour Summary Card */}
          <View style={styles.tourSummaryCard}>
            <View style={styles.tourSummaryHeader}>
              <Ionicons name="calendar" size={20} color="#eec218" />
              <Text style={styles.tourSummaryTitle}>Tour Summary</Text>
            </View>
            <View style={styles.tourDetails}>
              <Text style={styles.tourName}>{tourDetails.title}</Text>
              <View style={styles.tourMetaRow}>
                <View style={styles.tourMeta}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.tourMetaText}>{tourDetails.duration}</Text>
                </View>
                <View style={styles.tourMeta}>
                  <Ionicons name="cash" size={16} color="#6b7280" />
                  <Text style={styles.tourMetaText}>{tourDetails.price}/person</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#00355f" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.sectionContent}>
              <InputField
                label="Full Name"
                field="name"
                placeholder="Enter your full name"
                icon="person"
                iconType="Ionicons"
              />
              
              <InputField
                label="Email Address"
                field="email"
                placeholder="your.email@example.com"
                keyboardType="email-address"
                icon="mail"
                iconType="Ionicons"
              />
              
              <InputField
                label="Phone Number"
                field="phone"
                placeholder="+63 9XX XXX XXXX"
                keyboardType="phone-pad"
                icon="call"
                iconType="Ionicons"
              />
            </View>
          </View>

          {/* Booking Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#00355f" />
              <Text style={styles.sectionTitle}>Booking Details</Text>
            </View>
            
            <View style={styles.sectionContent}>
              <InputField
                label="Number of Guests"
                field="guests"
                placeholder="How many people?"
                keyboardType="numeric"
                icon="people"
                iconType="Ionicons"
              />
              
              <InputField
                label="Preferred Date"
                field="date"
                placeholder="YYYY-MM-DD"
                icon="calendar-today"
              />
              
              <InputField
                label="Special Requests (Optional)"
                field="specialRequests"
                placeholder="Any dietary restrictions, accessibility needs, or special occasions..."
                icon="note"
                iconType="Ionicons"
                multiline={true}
                maxLength={200}
              />
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <Ionicons name="receipt" size={20} color="#eec218" />
              <Text style={styles.priceTitle}>Price Breakdown</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base price per person</Text>
              <Text style={styles.priceValue}>₱3,500</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Number of guests</Text>
              <Text style={styles.priceValue}>
                {formData.guests && !isNaN(formData.guests) ? `× ${formData.guests}` : '× 0'}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceTotalLabel}>Total Amount</Text>
              <Text style={styles.priceTotalValue}>
                ₱{formData.guests && !isNaN(formData.guests) 
                  ? (3500 * parseInt(formData.guests)).toLocaleString() 
                  : '0'}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#eec218', '#d4a017']}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>Proceed to Payment</Text>
              <Ionicons name="arrow-forward" size={20} color="#00355f" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Terms Notice */}
          <View style={styles.termsContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#6b7280" />
            <Text style={styles.termsText}>
              By proceeding, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00355f',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tourSummaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tourSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tourSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00355f',
    marginLeft: 8,
  },
  tourDetails: {
    marginTop: 8,
  },
  tourName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00355f',
    marginBottom: 8,
  },
  tourMetaRow: {
    flexDirection: 'row',
    gap: 20,
  },
  tourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourMetaText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00355f',
    marginLeft: 8,
  },
  sectionContent: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: '#eec218',
    backgroundColor: '#fffbeb',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    padding: 0,
    fontWeight: '500',
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00355f',
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  priceTotalLabel: {
    fontSize: 18,
    color: '#00355f',
    fontWeight: '700',
  },
  priceTotalValue: {
    fontSize: 20,
    color: '#eec218',
    fontWeight: '700',
  },
  submitButton: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#eec218',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#00355f',
    fontWeight: '700',
    fontSize: 18,
    marginRight: 12,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 16,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
});