import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tour } from '../types'; // Define this if needed

export function TourCard({
  tour,
  style,
  onPress
}: {
  tour: Tour;
  style?: any;
  onPress?: () => void;
}) {
  return (
    <Pressable 
      style={[styles.card, style]}
      onPress={onPress}
    >
      <Image source={tour.image} style={styles.image} />
      <View style={styles.details}>
        <Text style={styles.title}>{tour.title}</Text>
        <Text style={styles.price}>{tour.price}</Text>
        {tour.priceNote && (
          <Text style={styles.priceNote}>{tour.priceNote}</Text>
        )}
        <Text style={styles.description}>{tour.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
  },
  details: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  price: {
    color: '#d32f2f',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceNote: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  description: {
    color: '#666',
    fontSize: 14,
  }
});