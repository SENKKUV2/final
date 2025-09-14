import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function TourDetails() {
  const router = useRouter();

  const inclusions = [
    { icon: 'boat', text: 'Boat Transfers', type: 'FontAwesome5' },
    { icon: 'restaurant', text: 'Lunch Included', type: 'MaterialIcons' },
    { icon: 'person', text: 'Professional Tour Guide', type: 'MaterialIcons' },
    { icon: 'camera', text: 'Photo Opportunities', type: 'MaterialIcons' },
    { icon: 'swimming', text: 'Swimming & Snorkeling', type: 'FontAwesome5' },
    { icon: 'umbrella-beach', text: 'Beach Activities', type: 'FontAwesome5' }
  ];

  const highlights = [
    'Visit 3 pristine islands',
    'Crystal clear turquoise waters',
    'White sand beaches',
    'Local cuisine experience',
    'Professional photography'
  ];

  const renderIcon = (item) => {
    if (item.type === 'FontAwesome5') {
      return <FontAwesome5 name={item.icon} size={20} color="#eec218" />;
    }
    return <MaterialIcons name={item.icon} size={20} color="#eec218" />;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Image with Gradient Overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: 'https://picsum.photos/800/400' }}
          style={styles.tourImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.imageOverlay}
        />
        
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Favorite Button */}
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Island Hopping Adventure</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#eec218" />
            <Text style={styles.location}>Cebu, Philippines</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₱3,500</Text>
            <Text style={styles.priceSubtext}>per person</Text>
          </View>
        </View>

        {/* Rating and Duration Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="star" size={18} color="#eec218" />
            </View>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="time" size={18} color="#eec218" />
            </View>
            <Text style={styles.statValue}>8 hrs</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="people" size={18} color="#eec218" />
            </View>
            <Text style={styles.statValue}>2-15</Text>
            <Text style={styles.statLabel}>Group Size</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#00355f" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.text}>
              Experience the beauty of Cebu's pristine islands with our comprehensive island hopping adventure. 
              Discover hidden lagoons, swim in crystal-clear waters, and relax on white sand beaches while enjoying 
              authentic Filipino hospitality and cuisine. This full-day tour includes everything you need for an 
              unforgettable tropical experience.
            </Text>
          </View>
        </View>

        {/* Tour Highlights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#00355f" />
            <Text style={styles.sectionTitle}>Tour Highlights</Text>
          </View>
          <View style={styles.card}>
            {highlights.map((highlight, index) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.highlightDot} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Inclusions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="gift" size={20} color="#00355f" />
            <Text style={styles.sectionTitle}>What's Included</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.inclusionsGrid}>
              {inclusions.map((item, index) => (
                <View key={index} style={styles.inclusionItem}>
                  <View style={styles.inclusionIcon}>
                    {renderIcon(item)}
                  </View>
                  <Text style={styles.inclusionText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={20} color="#00355f" />
            <Text style={styles.sectionTitle}>Important Notes</Text>
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              • Bring swimwear, sunscreen, and a towel{'\n'}
              • Weather dependent - may be rescheduled{'\n'}
              • Pick-up available from major hotels{'\n'}
              • Not recommended for non-swimmers
            </Text>
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => router.push('/booking')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#00355f', '#004873']}
            style={styles.bookButtonGradient}
          >
            <Text style={styles.bookButtonText}>Book This Tour</Text>
            <Ionicons name="arrow-forward" size={22} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Contact Support */}
        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#6b7280" />
          <Text style={styles.supportText}>Need help? Contact support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    position: 'relative',
    height: 280,
  },
  tourImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00355f',
    lineHeight: 34,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#eec218',
  },
  priceSubtext: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00355f',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00355f',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '400',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#eec218',
    marginRight: 12,
  },
  highlightText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  inclusionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inclusionItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inclusionIcon: {
    marginRight: 12,
  },
  inclusionText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#eec218',
  },
  noteText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#92400e',
    fontWeight: '500',
  },
  bookButton: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
    marginRight: 12,
  },
  supportButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  supportText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
});