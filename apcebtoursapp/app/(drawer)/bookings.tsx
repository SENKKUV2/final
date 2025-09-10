import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Define the Booking type to match your Supabase table schema
type Booking = {
  id: string;
  created_at: string;
  user_id: string;
  tour_id: string;
  booking_date: string;
  number_of_people: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  contact_phone?: string;
  contact_email?: string;
};

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  // New state variables for the edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    numberOfPeople: '',
    specialRequests: '',
    contactPhone: '',
  });

  // New state for the view details modal
  const [viewModalVisible, setViewModalVisible] = useState(false);

  // Define the async function to fetch data from Supabase
  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error.message);
      Alert.alert('Error', 'Failed to fetch bookings.');
    } else {
      setBookings(data as Booking[]);
    }
    setLoading(false);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Handler for updating booking status
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed') => {
    setLoading(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      console.error('Error updating booking status:', error.message);
      Alert.alert('Error', 'Failed to update booking status.');
    } else {
      // Optimistically update the local state to reflect the change immediately
      setBookings(prevBookings => prevBookings.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));
      console.log(`Successfully changed booking ${bookingId} status to ${newStatus}`);
    }
    setLoading(false);
  };
  
  // Handler for opening the edit modal
  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      numberOfPeople: booking.number_of_people.toString(),
      specialRequests: booking.special_requests || '',
      contactPhone: booking.contact_phone || '',
    });
    setEditModalVisible(true);
  };

  // Handler for opening the view details modal
  const handleViewDetails = (booking: Booking) => {
    setEditingBooking(booking);
    setViewModalVisible(true);
  };
  
  // Handler for saving edits
  const handleSaveEdit = async () => {
    if (!editingBooking) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          number_of_people: parseInt(formData.numberOfPeople),
          special_requests: formData.specialRequests,
          contact_phone: formData.contactPhone,
        })
        .eq('id', editingBooking.id);

      if (error) {
        throw error;
      }

      // Optimistically update the local state
      setBookings(prevBookings => prevBookings.map(booking => 
        booking.id === editingBooking.id 
          ? { ...booking, 
              number_of_people: parseInt(formData.numberOfPeople),
              special_requests: formData.specialRequests,
              contact_phone: formData.contactPhone
            } 
          : booking
      ));

      Alert.alert('Success', 'Booking updated successfully!');
      setEditModalVisible(false);
      setEditingBooking(null);
    } catch (error) {
      console.error('Error updating booking:', error.message);
      Alert.alert('Error', 'Failed to update booking.');
    }
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingBooking(null);
  };

  const filterOptions = ['All', 'Pending', 'Confirmed', 'Completed'];

  // Filter bookings based on search query and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          booking.tour_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = activeFilter === 'All' || booking.status === activeFilter.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'confirmed': return 'check-circle';
      case 'completed': return 'done-all';
      default: return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Render function for the edit modal
  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={closeEditModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Booking</Text>
            <TouchableOpacity onPress={closeEditModal}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Number of People</Text>
            <TextInput
              style={styles.input}
              value={formData.numberOfPeople}
              onChangeText={(text) => setFormData(prev => ({ ...prev, numberOfPeople: text }))}
              keyboardType="numeric"
            />
            
            <Text style={styles.label}>Special Requests</Text>
            <TextInput
              style={styles.input}
              value={formData.specialRequests}
              onChangeText={(text) => setFormData(prev => ({ ...prev, specialRequests: text }))}
              multiline
            />
            
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.contactPhone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contactPhone: text }))}
              keyboardType="phone-pad"
            />
          </ScrollView>
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render function for the view details modal
  const renderViewModal = () => {
    if (!editingBooking) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booking ID:</Text>
                <Text style={styles.detailValue}>{editingBooking.id}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tour ID:</Text>
                <Text style={styles.detailValue}>{editingBooking.tour_id}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: getStatusColor(editingBooking.status) }]}>
                  {editingBooking.status.charAt(0).toUpperCase() + editingBooking.status.slice(1)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Number of People:</Text>
                <Text style={styles.detailValue}>{editingBooking.number_of_people}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Total Price:</Text>
                <Text style={styles.detailValue}>₱{editingBooking.total_price.toLocaleString()}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booking Date:</Text>
                <Text style={styles.detailValue}>{formatDate(editingBooking.booking_date)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booked On:</Text>
                <Text style={styles.detailValue}>{formatDate(editingBooking.created_at)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Contact Email:</Text>
                <Text style={styles.detailValue}>{editingBooking.contact_email || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Contact Phone:</Text>
                <Text style={styles.detailValue}>{editingBooking.contact_phone || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Special Requests:</Text>
                <Text style={styles.detailValue}>{editingBooking.special_requests || 'None'}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bookings Management</Text>
        <Text style={styles.subtitle}>
          Manage all customer bookings and reservations
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email, booking ID, or tour ID..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.activeFilterTab
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter && styles.activeFilterText
              ]}>
                {filter}
              </Text>
              {filter !== 'All' && (
                <View style={[
                  styles.filterBadge,
                  { backgroundColor: filter === activeFilter ? '#fff' : getStatusColor(filter.toLowerCase()) }
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    { color: filter === activeFilter ? getStatusColor(filter.toLowerCase()) : '#fff' }
                  ]}>
                    {bookings.filter(b => b.status === filter.toLowerCase()).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Info */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f57c00" />
          <Text style={styles.loadingText}>Fetching bookings...</Text>
        </View>
      ) : (
        <ScrollView style={styles.bookingsList} showsVerticalScrollIndicator={false}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search terms' : 'No bookings match the selected filter'}
              </Text>
            </View>
          ) : (
            filteredBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                {/* Booking Header */}
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingIdContainer}>
                    <Text style={styles.bookingId}>#{booking.id.substring(0, 8)}...</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                      <MaterialIcons 
                        name={getStatusIcon(booking.status) as any} 
                        size={14} 
                        color={getStatusColor(booking.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingAmount}>₱{booking.total_price.toLocaleString()}</Text>
                </View>

                {/* Customer Info */}
                <View style={styles.customerInfo}>
                  <MaterialIcons name="person" size={18} color="#666" />
                  <Text style={styles.customerName}>{booking.contact_email || 'N/A'}</Text>
                  <MaterialIcons name="group" size={18} color="#666" style={styles.participantIcon} />
                  <Text style={styles.participantCount}>{booking.number_of_people} pax</Text>
                </View>

                {/* Tour Info */}
                <View style={styles.tourInfo}>
                  <MaterialIcons name="map" size={18} color="#f57c00" />
                  <Text style={styles.tourName}>Tour ID: {booking.tour_id}</Text>
                </View>

                {/* Date Info */}
                <View style={styles.dateInfo}>
                  <View style={styles.dateItem}>
                    <MaterialIcons name="event" size={16} color="#666" />
                    <Text style={styles.dateLabel}>Tour Date: </Text>
                    <Text style={styles.dateValue}>{formatDate(booking.booking_date)}</Text>
                  </View>
                  <View style={styles.dateItem}>
                    <MaterialIcons name="schedule" size={16} color="#666" />
                    <Text style={styles.dateLabel}>Booked: </Text>
                    <Text style={styles.dateValue}>{formatDate(booking.created_at)}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {booking.status === 'pending' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => handleStatusChange(booking.id, 'confirmed')}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditBooking(booking)}
                      >
                        <MaterialIcons name="edit" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleStatusChange(booking.id, 'completed')}
                      >
                        <MaterialIcons name="done" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Complete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditBooking(booking)}
                      >
                        <MaterialIcons name="edit" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {booking.status === 'completed' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => handleViewDetails(booking)}
                    >
                      <MaterialIcons name="visibility" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Render the modals */}
      {renderEditModal()}
      {renderViewModal()}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollView: {
    paddingRight: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterTab: {
    backgroundColor: '#f57c00',
    borderColor: '#f57c00',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  filterBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultsInfo: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  bookingsList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f57c00',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  participantIcon: {
    marginLeft: 12,
  },
  participantCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  tourInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tourName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  dateInfo: {
    marginBottom: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  dateValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#FF9800',
  },
  viewButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New styles for the view details modal
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    flexShrink: 1,
  },
});