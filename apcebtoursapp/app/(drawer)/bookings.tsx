import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

// Raw database response type
type DatabaseBooking = {
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
  profiles: Array<{ full_name: string; first_name: string; last_name: string }>;
  tours: Array<{ title: string }>;
};

// Normalized booking type for use in the app
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

type MaterialIconName = "search" | "clear" | "close" | "edit" | "visibility" | "schedule" | "check-circle" | "done-all" | "cancel" | "warning" | "inbox" | "check" | "done" | "help";

const statusIconMap: Record<string, MaterialIconName> = {
  pending: 'schedule', confirmed: 'check-circle', completed: 'done-all', cancelled: 'cancel', 'cancel-requested': 'warning',
};

const statusColors: Record<string, string> = {
  pending: '#EEC218',
  confirmed: '#00355F',
  completed: '#4CAF50',
  cancelled: '#666',
  'cancel-requested': '#F44336',
};

const filters = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancel-Requested', 'Cancelled'];

// Helper function to normalize database response
const normalizeBooking = (dbBooking: DatabaseBooking): Booking => ({
  ...dbBooking,
  profiles: dbBooking.profiles?.[0],
  tours: dbBooking.tours?.[0],
});

export default function BookingsScreen() {
  const { bookingId } = useLocalSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [modal, setModal] = useState<{ visible: boolean; type: 'edit' | 'view'; booking: Booking | null }>({ visible: false, type: 'view', booking: null });
  const [messageModal, setMessageModal] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' }>({ visible: false, title: '', message: '', type: 'success' });
  const [formData, setFormData] = useState({ numberOfPeople: '', specialRequests: '', contactPhone: '' });

  const getDisplayName = useCallback((booking: Booking) =>
    booking.profiles?.full_name || `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim() || 'N/A',
    []
  );

  const fetchBookings = useCallback(async (id?: string) => {
    setLoading(true);
    try {
      const query = supabase
        .from('bookings')
        .select('id, created_at, user_id, tour_id, booking_date, number_of_people, total_price, status, special_requests, contact_phone, contact_email, profiles!inner(full_name, first_name, last_name), tours!inner(title)')
        .order('created_at', { ascending: false });
      
      if (id) {
        const { data, error } = await query.eq('id', id).single();
        if (error) throw error;
        return normalizeBooking(data as DatabaseBooking);
      } else {
        const { data, error } = await query;
        if (error) throw error;
        const normalizedBookings = (data as DatabaseBooking[]).map(normalizeBooking);
        setBookings(normalizedBookings);
        return normalizedBookings;
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error.message);
      setMessageModal({ visible: true, title: 'Error', message: `Failed to fetch ${id ? 'booking details' : 'bookings'}.`, type: 'error' });
      return id ? null : [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      await fetchBookings();
      if (bookingId && typeof bookingId === 'string') {
        const booking = await fetchBookings(bookingId);
        if (booking) {
          setSearchQuery(getDisplayName(booking) !== 'N/A' ? getDisplayName(booking) : booking.contact_email || booking.tours?.title || '');
          setActiveFilter('All');
        }
      }
    };
    initialize();

    // Real-time subscription
    const subscription = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          fetchBookings();
        } else if (payload.eventType === 'UPDATE') {
          setBookings(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b));
        } else if (payload.eventType === 'DELETE') {
          setBookings(prev => prev.filter(b => b.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [bookingId, fetchBookings, getDisplayName]);

  const handleStatusChange = useCallback(async (bookingId: string, newStatus: Booking['status'], emailStatus: string = newStatus) => {
    try {
      const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
      if (error) throw new Error(`Failed to update booking status: ${error.message}`);

      setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b)));

      if (["confirmed", "completed", "cancelled", "cancel-rejected"].includes(emailStatus)) {
        fetch("https://zxzpvrpjavucfrzxkgfo.supabase.co/functions/v1/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ bookingId, status: emailStatus }),
        }).catch(err => console.error("Email error:", err));
      }

      setMessageModal({ visible: true, title: "Success", message: `Booking status changed to ${newStatus}`, type: "success" });
    } catch (error: any) {
      console.error("Error:", error.message);
      setMessageModal({ visible: true, title: "Error", message: error.message || "Failed to update booking status.", type: "error" });
    }
  }, []);

  const openModal = useCallback((type: 'edit' | 'view', booking: Booking) => {
    setModal({ visible: true, type, booking });
    if (type === 'edit') {
      setFormData({ numberOfPeople: booking.number_of_people.toString(), specialRequests: booking.special_requests || '', contactPhone: booking.contact_phone || '' });
    }
  }, []);

  const closeModal = useCallback(() => setModal({ visible: false, type: 'view', booking: null }), []);
  const closeMessageModal = useCallback(() => setMessageModal({ visible: false, title: '', message: '', type: 'success' }), []);

  const handleSaveEdit = useCallback(async () => {
    if (!modal.booking) return;
    try {
      const { error } = await supabase.from('bookings').update({
        number_of_people: parseInt(formData.numberOfPeople),
        special_requests: formData.specialRequests,
        contact_phone: formData.contactPhone,
      }).eq('id', modal.booking.id);

      if (error) throw error;

      setBookings(prev => prev.map(b => b.id === modal.booking?.id ? { ...b, number_of_people: parseInt(formData.numberOfPeople), special_requests: formData.specialRequests, contact_phone: formData.contactPhone } : b));
      setMessageModal({ visible: true, title: 'Success', message: 'Booking updated successfully!', type: 'success' });
      closeModal();
    } catch (error: any) {
      console.error(error.message);
      setMessageModal({ visible: true, title: 'Error', message: 'Failed to update booking.', type: 'error' });
    }
  }, [modal.booking, formData, closeModal]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return bookings.filter(b => {
      const matchesSearch = !query || b.contact_email?.toLowerCase().includes(query) || getDisplayName(b).toLowerCase().includes(query) || b.tours?.title?.toLowerCase().includes(query);
      const matchesFilter = activeFilter === 'All' || b.status === activeFilter.toLowerCase() || (activeFilter === 'Cancel-Requested' && b.status === 'cancel-requested');
      return matchesSearch && matchesFilter;
    });
  }, [bookings, searchQuery, activeFilter, getDisplayName]);

  const statusCounts = useMemo(() => {
    return filters.slice(1).reduce((acc, filter) => {
      const status = filter.toLowerCase().replace('-', '-');
      acc[filter] = bookings.filter(b => b.status === status).length;
      return acc;
    }, {} as Record<string, number>);
  }, [bookings]);

  const getStatusColor = useCallback((status: string) => statusColors[status] || '#666', []);
  const getStatusIcon = useCallback((status: string): MaterialIconName => statusIconMap[status] || 'help', []);
  const formatDate = useCallback((dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), []);

  const renderModal = () => {
    if (!modal.visible || !modal.booking) return null;
    const isEdit = modal.type === 'edit';
    const detailFields = [
      { label: 'Full Name', value: getDisplayName(modal.booking) },
      { label: 'Gmail', value: modal.booking.contact_email || 'N/A' },
      { label: 'Booked Tour', value: modal.booking.tours?.title || 'N/A' },
      { label: 'Date', value: formatDate(modal.booking.booking_date) },
      { label: 'Booked Date', value: formatDate(modal.booking.created_at) },
      { label: 'Status', value: modal.booking.status.charAt(0).toUpperCase() + modal.booking.status.slice(1), style: { color: getStatusColor(modal.booking.status) } },
      { label: 'Number of People', value: modal.booking.number_of_people.toString() },
      { label: 'Total Price', value: `₱${modal.booking.total_price.toLocaleString()}` },
      { label: 'Contact Phone', value: modal.booking.contact_phone || 'N/A' },
      { label: 'Special Requests', value: modal.booking.special_requests || 'None' },
    ];

    return (
      <Modal animationType="slide" transparent visible={modal.visible} onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEdit ? 'Edit Booking' : 'Booking Details'}</Text>
              <TouchableOpacity onPress={closeModal}><MaterialIcons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {isEdit ? (
                <>
                  <Text style={styles.label}>Number of People</Text>
                  <TextInput style={styles.input} value={formData.numberOfPeople} onChangeText={text => setFormData(prev => ({ ...prev, numberOfPeople: text }))} keyboardType="numeric" />
                  <Text style={styles.label}>Special Requests</Text>
                  <TextInput style={styles.input} value={formData.specialRequests} onChangeText={text => setFormData(prev => ({ ...prev, specialRequests: text }))} multiline />
                  <Text style={styles.label}>Contact Phone</Text>
                  <TextInput style={styles.input} value={formData.contactPhone} onChangeText={text => setFormData(prev => ({ ...prev, contactPhone: text }))} keyboardType="phone-pad" />
                </>
              ) : (
                detailFields.map(({ label, value, style }) => (
                  <View key={label} style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{label}:</Text>
                    <Text style={[styles.detailValue, style]}>{value}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            {isEdit ? (
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}><Text style={styles.saveButtonText}>Save Changes</Text></TouchableOpacity>
            ) : modal.booking.status === 'cancel-requested' ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={() => handleStatusChange(modal.booking!.id, 'cancelled')}>
                  <MaterialIcons name="check" size={16} color="#fff" /><Text style={styles.actionButtonText}>Approve Cancellation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleStatusChange(modal.booking!.id, 'pending', 'cancel-rejected')}>
                  <MaterialIcons name="close" size={16} color="#fff" /><Text style={styles.actionButtonText}>Reject Cancellation</Text>
                </TouchableOpacity>
              </View>
            ) : modal.booking.status === 'pending' ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={() => handleStatusChange(modal.booking!.id, 'confirmed')}>
                  <MaterialIcons name="check" size={16} color="#fff" /><Text style={styles.actionButtonText}>Confirm Booking</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  };

  const renderBookingCard = useCallback((booking: Booking) => {
    const cardDetails = [
      { label: 'Gmail', value: booking.contact_email || 'N/A' },
      { label: 'Booked Tour', value: booking.tours?.title || 'N/A' },
      { label: 'Date', value: formatDate(booking.booking_date) },
      { label: 'Booked Date', value: formatDate(booking.created_at) },
    ];

    return (
      <View key={booking.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingIdContainer}>
            <Text style={styles.bookingId}>#{booking.tour_id.substring(0, 8)}...</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
              <MaterialIcons name={getStatusIcon(booking.status)} size={14} color={getStatusColor(booking.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Text>
            </View>
          </View>
          <Text style={styles.bookingAmount}>₱{booking.total_price.toLocaleString()}</Text>
        </View>
        <View style={styles.bookingInfo}>
          {cardDetails.map(({ label, value }) => (
            <View key={label} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{label}:</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actionButtons}>
          {booking.status === 'pending' && (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={() => handleStatusChange(booking.id, 'confirmed')}>
                <MaterialIcons name="check" size={16} color="#fff" /><Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => openModal('edit', booking)}>
                <MaterialIcons name="edit" size={16} color="#fff" /><Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
          {booking.status === 'confirmed' && (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={() => handleStatusChange(booking.id, 'completed')}>
                <MaterialIcons name="done" size={16} color="#fff" /><Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => openModal('edit', booking)}>
                <MaterialIcons name="edit" size={16} color="#fff" /><Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
          {booking.status === 'cancel-requested' && (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={() => handleStatusChange(booking.id, 'cancelled')}>
                <MaterialIcons name="check" size={16} color="#fff" /><Text style={styles.actionButtonText}>Approve Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleStatusChange(booking.id, 'pending', 'cancel-rejected')}>
                <MaterialIcons name="close" size={16} color="#fff" /><Text style={styles.actionButtonText}>Reject Cancel</Text>
              </TouchableOpacity>
            </>
          )}
          {(booking.status === 'completed' || booking.status === 'cancelled') && (
            <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={() => openModal('view', booking)}>
              <MaterialIcons name="visibility" size={16} color="#fff" /><Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [formatDate, getStatusColor, getStatusIcon, handleStatusChange, openModal]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings Management</Text>
        <Text style={styles.subtitle}>Manage all customer bookings and reservations</Text>
      </View>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Search by name, email, or tour..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}><MaterialIcons name="clear" size={20} color="#666" /></TouchableOpacity>
        )}
      </View>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
          {filters.map(filter => (
            <TouchableOpacity key={filter} style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]} onPress={() => setActiveFilter(filter)}>
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
              {filter !== 'All' && (
                <View style={[styles.filterBadge, { backgroundColor: filter === activeFilter ? '#fff' : getStatusColor(filter.toLowerCase()) }]}>
                  <Text style={[styles.filterBadgeText, { color: filter === activeFilter ? getStatusColor(filter.toLowerCase()) : '#fff' }]}>{statusCounts[filter] || 0}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found</Text>
      </View>
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
              <Text style={styles.emptySubtitle}>{searchQuery ? 'Try adjusting your search terms' : 'No bookings match the selected filter'}</Text>
            </View>
          ) : filteredBookings.map(renderBookingCard)}
        </ScrollView>
      )}
      {renderModal()}
      {messageModal.visible && (
        <Modal animationType="fade" transparent visible={messageModal.visible} onRequestClose={closeMessageModal}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{messageModal.title}</Text>
                <TouchableOpacity onPress={closeMessageModal}><MaterialIcons name="close" size={24} color="#666" /></TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={[styles.messageText, { color: messageModal.type === 'success' ? '#4CAF50' : '#F44336' }]}>{messageModal.message}</Text>
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={closeMessageModal}><Text style={styles.saveButtonText}>OK</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9f7', padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', lineHeight: 22 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 12 },
  clearButton: { padding: 4 },
  filterContainer: { marginBottom: 16 },
  filterScrollView: { paddingRight: 16 },
  filterTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  activeFilterTab: { backgroundColor: '#00355F', borderColor: '#00355F' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeFilterText: { color: '#FFFFFF' },
  filterBadge: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  filterBadgeText: { fontSize: 12, fontWeight: 'bold' },
  resultsInfo: { marginBottom: 16 },
  resultsText: { fontSize: 14, color: '#666', fontWeight: '500' },
  bookingsList: { flex: 1 },
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bookingIdContainer: { flexDirection: 'row', alignItems: 'center' },
  bookingId: { fontSize: 14, fontWeight: '600', color: '#333', marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { marginLeft: 4, fontSize: 12, fontWeight: '600' },
  bookingAmount: { fontSize: 16, fontWeight: 'bold', color: '#EEC218' },
  bookingInfo: { marginBottom: 12 },
  detailItem: { marginBottom: 8 },
  detailLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  confirmButton: { backgroundColor: '#00355F' },
  editButton: { backgroundColor: '#2196F3' },
  completeButton: { backgroundColor: '#4CAF50' },
  rejectButton: { backgroundColor: '#F44336' },
  viewButton: { backgroundColor: '#666' },
  actionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666', marginTop: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 400, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalBody: { maxHeight: 400 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', marginBottom: 16 },
  saveButton: { backgroundColor: '#00355F', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  messageText: { fontSize: 16, textAlign: 'center' },
});