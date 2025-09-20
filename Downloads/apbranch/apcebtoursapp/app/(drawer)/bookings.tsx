import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'cancel-requested';
  special_requests?: string;
  contact_phone?: string;
  contact_email?: string;
  profiles?: { full_name: string; first_name: string; last_name: string };
  tours?: { title: string };
};

export default function BookingsScreen() {
  const { bookingId } = useLocalSearchParams();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [emailConfirmationVisible, setEmailConfirmationVisible] = useState(false); // New state for email confirmation modal
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    numberOfPeople: '',
    specialRequests: '',
    contactPhone: '',
  });

  // Helper function to get display name
  const getDisplayName = (booking: Booking) => {
    if (booking.profiles?.full_name) return booking.profiles.full_name;
    if (booking.profiles?.first_name || booking.profiles?.last_name) {
      return `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim();
    }
    return 'N/A';
  };

  // Fetch bookings with additional profile and tour information
  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles ( full_name, first_name, last_name ),
        tours ( title )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error.message);
      Alert.alert('Error', 'Failed to fetch bookings.');
    } else {
      setBookings(data as Booking[]);
      data.forEach((booking: Booking) => {
        if (!booking.profiles?.full_name && !booking.profiles?.first_name && !booking.profiles?.last_name) {
          console.warn(`Booking ${booking.id} has no associated profile or name data`);
        }
      });
    }
    setLoading(false);
  };

  // Fetch booking details if bookingId is provided
  const fetchBookingById = async (id: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles ( full_name, first_name, last_name ),
        tours ( title )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching booking by ID:', error.message);
      Alert.alert('Error', 'Failed to fetch booking details.');
      return null;
    }

    return data as Booking;
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchBookings();
      if (bookingId && typeof bookingId === 'string') {
        const booking = await fetchBookingById(bookingId);
        if (booking) {
          const displayName = getDisplayName(booking);
          // Prioritize display name, then email, then tour title for search query
          const initialQuery = displayName !== 'N/A' ? displayName : booking.contact_email || booking.tours?.title || '';
          setSearchQuery(initialQuery);
          setActiveFilter('All'); // Reset filter to show all bookings with the search query
        }
      }
    };
    initialize();
  }, [bookingId]);

  // Handler for updating booking status
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'cancel-requested') => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (updateError) {
        throw new Error(`Failed to update booking status: ${updateError.message}`);
      }

      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        )
      );

      if (newStatus === 'cancelled') {
        try {
          const response = await fetch(
            'https://zxzpvrpjavucfrzxkgfo.supabase.co/functions/v1/send-email',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ bookingId }),
            }
          );

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to send cancellation email');
          }
          console.log('Email response:', result);
          setEmailConfirmationVisible(true); // Show confirmation modal on success
        } catch (emailError: any) {
          console.error('Error sending email:', emailError.message);
          Alert.alert('Warning', 'Booking status updated, but failed to send cancellation email.');
        }
      }

      Alert.alert('Success', `Booking status changed to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating booking status:', error.message);
      Alert.alert('Error', error.message || 'Failed to update booking status.');
    } finally {
      setLoading(false);
    }
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
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingBooking(null);
  };

  const closeEmailConfirmationModal = () => {
    setEmailConfirmationVisible(false); // Close the email confirmation modal
  };

  const filterOptions = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancel-Requested', 'Cancelled'];

  // Filter bookings based on search query and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getDisplayName(booking).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.tours?.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = activeFilter === 'All' || 
                         booking.status === activeFilter.toLowerCase() ||
                         (activeFilter === 'Cancel-Requested' && booking.status === 'cancel-requested');
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#eec218';
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#00355f';
      case 'cancelled': return '#F44336';
      case 'cancel-requested': return '#FF5722';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'confirmed': return 'check-circle';
      case 'completed': return 'done-all';
      case 'cancelled': return 'cancel';
      case 'cancel-requested': return 'warning';
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
              <MaterialIcons name="close" size={24} color="#6b7280" />
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
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Full Name:</Text>
                <Text style={styles.detailValue}>{getDisplayName(editingBooking)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Gmail:</Text>
                <Text style={styles.detailValue}>{editingBooking.contact_email || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booked Tour:</Text>
                <Text style={styles.detailValue}>{editingBooking.tours?.title || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatDate(editingBooking.booking_date)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booked Date:</Text>
                <Text style={styles.detailValue}>{formatDate(editingBooking.created_at)}</Text>
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
                <Text style={styles.detailLabel}>Contact Phone:</Text>
                <Text style={styles.detailValue}>{editingBooking.contact_phone || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Special Requests:</Text>
                <Text style={styles.detailValue}>{editingBooking.special_requests || 'None'}</Text>
              </View>
            </ScrollView>
            
            {editingBooking.status === 'cancel-requested' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => handleStatusChange(editingBooking.id, 'cancelled')}
                >
                  <MaterialIcons name="check" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve Cancellation</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleStatusChange(editingBooking.id, 'confirmed')}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject Cancellation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Render function for the email confirmation modal
  const renderEmailConfirmationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={emailConfirmationVisible}
      onRequestClose={closeEmailConfirmationModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Email Confirmation</Text>
            <TouchableOpacity onPress={closeEmailConfirmationModal}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <MaterialIcons name="check-circle" size={64} color="#4CAF50" style={styles.confirmIcon} />
            <Text style={styles.confirmText}>
              Your cancellation email has been successfully sent to the customer!
            </Text>
            <Text style={styles.subConfirmText}>
              The customer will receive a confirmation shortly. Thank you for your action.
            </Text>
          </View>
          
          <TouchableOpacity style={styles.saveButton} onPress={closeEmailConfirmationModal}>
            <Text style={styles.saveButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        <MaterialIcons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or tour..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#6b7280" />
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
                  { backgroundColor: filter === activeFilter ? '#ffffff' : getStatusColor(filter.toLowerCase()) }
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    { color: filter === activeFilter ? getStatusColor(filter.toLowerCase()) : '#ffffff' }
                  ]}>
                    {filter === 'Cancel-Requested' 
                      ? bookings.filter(b => b.status === 'cancel-requested').length
                      : bookings.filter(b => b.status === filter.toLowerCase()).length}
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
          <ActivityIndicator size="large" color="#eec218" />
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
                    <Text style={styles.bookingId}>#{booking.tour_id.substring(0, 8)}...</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                      <MaterialIcons 
                        name={getStatusIcon(booking.status)} 
                        size={14} 
                        color={getStatusColor(booking.status)}
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingAmount}>₱{booking.total_price.toLocaleString()}</Text>
                </View>

                {/* Booking Info */}
                <View style={styles.bookingInfo}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Gmail:</Text>
                    <Text style={styles.detailValue}>{booking.contact_email || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Booked Tour:</Text>
                    <Text style={styles.detailValue}>{booking.tours?.title || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(booking.booking_date)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Booked Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(booking.created_at)}</Text>
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
                  {booking.status === 'cancel-requested' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => handleStatusChange(booking.id, 'cancelled')}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleStatusChange(booking.id, 'confirmed')}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Reject Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {(booking.status === 'completed' || booking.status === 'cancelled') && (
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
      {renderEmailConfirmationModal()} {/* Add the new email confirmation modal */}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#00355f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 95, 0.1)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#00355f',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 95, 0.1)',
  },
  activeFilterTab: {
    backgroundColor: '#eec218',
    borderColor: '#eec218',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#ffffff',
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
    color: '#6b7280',
    fontWeight: '500',
  },
  bookingsList: {
    flex: 1,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 95, 0.1)',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#00355f',
    marginRight: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#eec218',
  },
  bookingInfo: {
    marginBottom: 12,
  },
  detailItem: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#00355f',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  editButton: {
    backgroundColor: '#00355f',
  },
  completeButton: {
    backgroundColor: '#1976D2',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  viewButton: {
    backgroundColor: '#6b7280',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00355f',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00355f',
  },
  modalBody: {
    maxHeight: 400,
    alignItems: 'center',
    paddingVertical: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00355f',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 95, 0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#00355f',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#eec218',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#00355f',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmIcon: {
    marginBottom: 16,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00355f',
    textAlign: 'center',
    marginBottom: 8,
  },
  subConfirmText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});