import { View, Text, StyleSheet, TouchableOpacity, Animated, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';

export default function BookingSuccess() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Celebratory animation sequence
    const animationSequence = Animated.sequence([
      // Icon animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 4,
        useNativeDriver: true,
      }),
      // Content fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationSequence.start();
  }, []);

  const bookingDetails = {
    reference: 'APT-2024-091456',
    tour: 'Island Hopping Adventure',
    date: 'September 20, 2024',
    guests: '4 guests',
    total: '₱14,000'
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon with Animation */}
        <Animated.View style={[
          styles.iconContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <LinearGradient
            colors={['#eec218', '#f5d142']}
            style={styles.iconGradient}
          >
            <MaterialIcons name="check" size={60} color="#ffffff" />
          </LinearGradient>
          <View style={styles.iconRing} />
        </Animated.View>

        {/* Success Content */}
        <Animated.View style={[
          styles.textContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your adventure awaits! We've sent a confirmation email with all the details.
          </Text>
        </Animated.View>

        {/* Booking Summary Card */}
        <Animated.View style={[
          styles.summaryCard,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="receipt-outline" size={24} color="#eec218" />
            <Text style={styles.summaryTitle}>Booking Summary</Text>
          </View>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reference</Text>
              <View style={styles.referenceContainer}>
                <Text style={styles.referenceText}>{bookingDetails.reference}</Text>
                <TouchableOpacity style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tour</Text>
              <Text style={styles.summaryValue}>{bookingDetails.tour}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{bookingDetails.date}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Guests</Text>
              <Text style={styles.summaryValue}>{bookingDetails.guests}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Paid</Text>
              <Text style={styles.totalValue}>{bookingDetails.total}</Text>
            </View>
          </View>
        </Animated.View>

        {/* What's Next Section */}
        <Animated.View style={[
          styles.nextStepsCard,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          <View style={styles.nextStepsList}>
            <View style={styles.nextStepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="mail" size={16} color="#eec218" />
              </View>
              <Text style={styles.stepText}>Check your email for confirmation details</Text>
            </View>
            <View style={styles.nextStepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="calendar" size={16} color="#eec218" />
              </View>
              <Text style={styles.stepText}>We'll contact you 24hrs before your tour</Text>
            </View>
            <View style={styles.nextStepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="location" size={16} color="#eec218" />
              </View>
              <Text style={styles.stepText}>Pick-up details will be shared via SMS</Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[
          styles.buttonContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/tours')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#00355f', '#004873']}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="home" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Back to Tours</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {/* Handle download/share */}}
          >
            <Ionicons name="download-outline" size={20} color="#6b7280" />
            <Text style={styles.secondaryButtonText}>Download Receipt</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Support Contact */}
        <Animated.View style={[
          styles.supportContainer,
          { opacity: fadeAnim }
        ]}>
          <Ionicons name="help-circle-outline" size={18} color="#6b7280" />
          <Text style={styles.supportText}>
            Need help? Contact us at support@apcebutoūrs.com
          </Text>
        </Animated.View>

        {/* Decorative Elements */}
        <View style={styles.decorativeElement1} />
        <View style={styles.decorativeElement2} />
        <View style={styles.decorativeElement3} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#eec218',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  iconRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#eec218',
    opacity: 0.3,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00355f',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontWeight: '400',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00355f',
    marginLeft: 8,
  },
  summaryContent: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  referenceText: {
    fontSize: 16,
    color: '#00355f',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 18,
    color: '#00355f',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    color: '#eec218',
    fontWeight: '700',
  },
  nextStepsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00355f',
    marginBottom: 16,
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  stepText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    maxWidth: 350,
  },
  supportText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  decorativeElement1: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eec218',
    opacity: 0.2,
  },
  decorativeElement2: {
    position: 'absolute',
    top: 120,
    left: 40,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00355f',
    opacity: 0.15,
  },
  decorativeElement3: {
    position: 'absolute',
    bottom: 100,
    right: 50,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#eec218',
    opacity: 0.25,
  },
});