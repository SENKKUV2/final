import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

// Define chart data interfaces
interface LineChartData {
  labels: string[];
  datasets: { data: number[]; color: () => string; strokeWidth: number }[];
}

interface PieChartDataItem {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

type PieChartData = PieChartDataItem[];

interface ProgressChartData {
  data: number[];
}

const { width } = Dimensions.get('window');
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: () => '#000',
  labelColor: () => '#666',
  style: { borderRadius: 12 },
  propsForDots: { r: '3', strokeWidth: '1', stroke: '#fff' },
  propsForBackgroundLines: { strokeWidth: 1, stroke: '#e0e0e0', strokeDasharray: '3, 3' },
  propsForLabels: { fontSize: 8, fontWeight: '500' }
};

type Booking = {
  id: string;
  customer: string;
  date: string;
  status: string;
  tourType: string;
  amount: string;
  contact_phone?: string;
  contact_email?: string;
  number_of_people: number;
  special_requests?: string;
  notificationType: 'New Booking' | 'Cancel Request';
  read_status: boolean;
};

type Tour = {
  id: string;
  title: string;
  price: string;
  duration: string;
  image: string;
  bookings: number;
  rating: number;
  type: string;
  location: string;
  available: boolean;
  max_capacity: number;
  features?: { text: string; available: boolean }[];
};

type DashboardStats = {
  totalBookings: number;
  totalRevenue: number;
  upcomingTours: number;
  activeCustomers: number;
  bookingsTrend: string;
  revenueTrend: string;
  monthlyBookings: number[];
  monthlyRevenue: number[];
  statusDistribution: { confirmed: number; pending: number; cancelled: number; completed: number };
  tourTypeDistribution: { regular: number; combo: number };
  topLocations: { name: string; count: number; color: string }[];
};

// Define valid MaterialIcons names
type IconName =
  | 'notifications-none'
  | 'trending-up'
  | 'trending-down'
  | 'calendar-today'
  | 'attach-money'
  | 'people'
  | 'close'
  | 'check'
  | 'book-online'
  | 'tour'
  | 'add-circle-outline'
  | 'assessment'
  | 'settings'
  | 'camera-alt'
  | 'restaurant'
  | 'directions-boat'
  | 'pool'
  | 'local-taxi'
  | 'hotel'
  | 'security'
  | 'headset-mic'
  | 'category'
  | 'schedule'
  | 'location-on'
  | 'star'
  | 'check-circle'
  | 'cancel'
  | 'access-time'
  | 'star-rate'
  | 'event-available'
  | 'event-busy';

// Define Supabase response types
type ProfileResponse = { email: string };
type TourResponse = { title: string; type: string };
type BookingResponse = {
  id: string;
  total_price: number;
  booking_date: string;
  status: string;
  number_of_people: number;
  contact_phone?: string;
  contact_email?: string;
  special_requests?: string;
  read_status: boolean;
  profiles: ProfileResponse;
  tours: TourResponse;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [comboPackages, setComboPackages] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState({ details: false, notifications: false });
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time changes in the bookings table
    const subscription = supabase
      .channel('bookings-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: "status=in.(pending,cancel-requested)",
        },
        (payload) => {
          console.log('Real-time booking change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchPendingBookings();
          } else if (payload.eventType === 'DELETE') {
            setPendingBookings((prev) =>
              prev.filter((booking) => booking.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      await Promise.all([fetchStats(), fetchPendingBookings(), fetchTours('regular', setTours), fetchTours('combo', setComboPackages)]);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      const [
        { data: completedBookings, error: completedBookingsError },
        { data: allBookings, error: allBookingsError },
        { data: toursData, error: toursError },
        { data: users, error: usersError }
      ] = await Promise.all([
        supabase.from('bookings').select('id,total_price,created_at,booking_date').eq('status', 'completed'),
        supabase.from('bookings').select('status'),
        supabase.from('tours').select('id,available,type,location'),
        supabase.from('profiles').select('id').ilike('role', 'user')
      ]);

      if (completedBookingsError) throw new Error(`Failed to fetch completed bookings: ${completedBookingsError.message}`);
      if (allBookingsError) throw new Error(`Failed to fetch all bookings: ${allBookingsError.message}`);
      if (toursError) throw new Error(`Failed to fetch tours: ${toursError.message}`);
      if (usersError) throw new Error(`Failed to fetch profiles: ${usersError.message}`);

      console.log('Raw users data:', users);
      const activeCustomers = users?.length || 0;
      console.log('activeCustomers:', activeCustomers);

      const totalBookings = completedBookings?.length || 0;
      const totalRevenue = completedBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      const upcomingTours = toursData?.filter(t => t.available).length || 0;

      const monthlyBookings = Array(6).fill(0), monthlyRevenue = Array(6).fill(0);
      const now = new Date();
      completedBookings?.forEach(b => {
        const diff = (now.getFullYear() - new Date(b.created_at).getFullYear()) * 12 + (now.getMonth() - new Date(b.created_at).getMonth());
        if (diff >= 0 && diff < 6) {
          monthlyBookings[5 - diff]++;
          monthlyRevenue[5 - diff] += b.total_price || 0;
        }
      });

      const statusDistribution = {
        confirmed: allBookings?.filter(b => b.status === 'confirmed').length || 0,
        pending: allBookings?.filter(b => b.status === 'pending').length || 0,
        cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
        completed: allBookings?.filter(b => b.status === 'completed').length || 0
      };

      const tourTypeDistribution = {
        regular: toursData?.filter(t => t.type === 'regular').length || 0,
        combo: toursData?.filter(t => t.type === 'combo').length || 0
      };

      const locationCounts: { [key: string]: number } = {};
      toursData?.forEach(t => { locationCounts[t.location] = (locationCounts[t.location] || 0) + 1; });
      const topLocations = Object.entries(locationCounts)
        .sort(([, a], [, b]) => b - a).slice(0, 5)
        .map(([name, count], i) => ({ name, count, color: ['#f57c00', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722'][i] }));

      const currentMonthBookings = completedBookings?.filter(b => new Date(b.created_at).getMonth() === now.getMonth() && new Date(b.created_at).getFullYear() === now.getFullYear()) || [];
      const prevMonthBookings = completedBookings?.filter(b => {
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return new Date(b.created_at).getMonth() === prevMonth && new Date(b.created_at).getFullYear() === prevYear;
      }) || [];

      setStats({
        totalBookings,
        totalRevenue,
        upcomingTours,
        activeCustomers,
        bookingsTrend: calculateTrend(currentMonthBookings.length, prevMonthBookings.length),
        revenueTrend: calculateTrend(currentMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0), prevMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)),
        monthlyBookings,
        monthlyRevenue,
        statusDistribution,
        tourTypeDistribution,
        topLocations
      });
    } catch (error: any) {
      console.error('Error in fetchStats:', error);
      setError(error.message || 'Failed to fetch stats');
    }
  };

  const calculateTrend = (current: number, previous: number) => previous === 0 ? (current > 0 ? '+100%' : '0%') : `${((current - previous) / previous * 100).toFixed(0)}%`;

  const fetchPendingBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        total_price,
        booking_date,
        status,
        number_of_people,
        contact_phone,
        contact_email,
        special_requests,
        read_status,
        profiles!inner(email),
        tours!inner(title,type)
      `)
      .in('status', ['pending', 'cancel-requested'])
      .order('read_status', { ascending: true })
      .order('created_at', { ascending: false }) as { data: BookingResponse[] | null; error: any };

    if (error) throw error;
    setPendingBookings(data?.map(b => ({
      id: b.id,
      customer: b.profiles.email || 'Unknown',
      date: b.booking_date,
      status: b.status,
      tourType: b.tours.title || 'Unknown Tour',
      amount: `₱${b.total_price?.toLocaleString()}`,
      contact_phone: b.contact_phone,
      contact_email: b.contact_email,
      number_of_people: b.number_of_people,
      special_requests: b.special_requests,
      notificationType: b.status === 'pending' ? 'New Booking' : 'Cancel Request',
      read_status: b.read_status || false,
    })) || []);
  };

  const fetchTours = async (type: string, setter: React.Dispatch<React.SetStateAction<Tour[]>>) => {
    const { data, error } = await supabase
      .from('tours')
      .select('id,title,price,duration,image,rating,type,location,available,max_capacity,bookings(id),features')
      .eq('type', type)
      .eq('available', true)
      .order('created_at', { ascending: false })
      .limit(3);
    if (error) throw error;
    setter(data?.map(t => ({
      id: t.id,
      title: t.title,
      price: `₱${t.price?.toLocaleString()}`,
      duration: t.duration,
      image: t.image,
      rating: t.rating || 4.5,
      type: t.type,
      location: t.location,
      available: t.available,
      max_capacity: t.max_capacity || 20,
      bookings: t.bookings?.length || 0,
      features: t.features || []
    })) || []);
  };

  const markNotificationAsRead = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ read_status: true })
      .eq('id', bookingId);
    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }
    setPendingBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, read_status: true } : booking
      )
    );
  };

  const NotificationModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible.notifications}
        onRequestClose={() => {
          setModalVisible({ ...modalVisible, notifications: false });
          pendingBookings.forEach((b) => {
            if (!b.read_status) markNotificationAsRead(b.id);
          });
        }}
      >
        <View style={ms.centered}>
          <View style={ms.modal}>
            <View style={ms.header}>
              <Text style={ms.title}>Notifications</Text>
              <TouchableOpacity
                style={ms.close}
                onPress={() => setModalVisible({ ...modalVisible, notifications: false })}
              >
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={ms.section}>
                <Text style={ms.sectionTitle}>Pending Actions</Text>
                {pendingBookings.length > 0 ? (
                  pendingBookings.map((b) => (
                    <Animated.View
                      key={b.id}
                      entering={FadeIn.duration(200).easing(Easing.ease)}
                      exiting={FadeOut.duration(200).easing(Easing.ease)}
                    >
                      <TouchableOpacity
                        style={[
                          ms.notificationCard,
                          !b.read_status && ms.unreadNotification,
                        ]}
                        onPress={() => {
                          markNotificationAsRead(b.id);
                          setModalVisible({ ...modalVisible, notifications: false });
                          router.push(`/bookings?bookingId=${b.id}`);
                        }}
                      >
                        <View style={ms.notificationHeader}>
                          <Text style={ms.notificationId}>#{b.id.slice(0, 8)}</Text>
                          <View
                            style={[
                              ms.statusBadge,
                              { backgroundColor: b.status === 'pending' ? '#FF980015' : '#FF572215' },
                            ]}
                          >
                            <Text
                              style={[
                                ms.statusText,
                                { color: b.status === 'pending' ? '#FF9800' : '#FF5722' },
                              ]}
                            >
                              {b.notificationType}
                            </Text>
                          </View>
                        </View>
                        <View style={ms.notificationContent}>
                          <Text style={ms.notificationCustomer} numberOfLines={1}>{b.customer}</Text>
                          <Text style={ms.notificationTour} numberOfLines={1}>{b.tourType}</Text>
                          <View style={ms.notificationInfo}>
                            <MaterialIcons name="calendar-today" size={12} color="#666" />
                            <Text style={ms.notificationDate}>
                              {new Date(b.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Text>
                            <MaterialIcons name="attach-money" size={12} color="#666" style={{ marginLeft: 6 }} />
                            <Text style={ms.notificationAmount}>{b.amount}</Text>
                            <MaterialIcons name="people" size={12} color="#666" style={{ marginLeft: 6 }} />
                            <Text style={ms.notificationAmount}>{b.number_of_people}</Text>
                          </View>
                        </View>
                        {(b.status === 'pending' || b.status === 'cancel-requested') && (
                          <View style={ms.actionButtons}>
                            <TouchableOpacity
                              style={[ms.actionButton, ms.approveButton]}
                              onPress={async () => {
                                await supabase
                                  .from('bookings')
                                  .update({ status: b.status === 'pending' ? 'confirmed' : 'cancelled' })
                                  .eq('id', b.id);
                                fetchPendingBookings();
                              }}
                              accessibilityLabel={b.status === 'pending' ? 'Approve booking' : 'Approve cancellation'}
                            >
                              <MaterialIcons name="check" size={12} color="#fff" />
                              <Text style={ms.actionButtonText}>
                                {b.status === 'pending' ? 'Approve' : 'Approve Cancellation'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[ms.actionButton, ms.rejectButton]}
                              onPress={async () => {
                                await supabase
                                  .from('bookings')
                                  .update({ status: b.status === 'pending' ? 'cancelled' : 'confirmed' })
                                  .eq('id', b.id);
                                fetchPendingBookings();
                              }}
                              accessibilityLabel={b.status === 'pending' ? 'Reject booking' : 'Deny cancellation'}
                            >
                              <MaterialIcons name="close" size={12} color="#fff" />
                              <Text style={ms.actionButtonText}>
                                {b.status === 'pending' ? 'Reject' : 'Deny Cancellation'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                ) : (
                  <View style={ms.noDataCard}>
                    <MaterialIcons name="event-available" size={36} color="#ccc" />
                    <Text style={ms.noData}>No pending actions</Text>
                    <Text style={ms.noDataSub}>All bookings up to date!</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const TourDetailsModal = () => {
    if (!currentTour) return null;

    const featureIcons: { [key: string]: IconName } = {
      'Professional Photography': 'camera-alt',
      'Local Cuisine': 'restaurant',
      'Island Hopping': 'directions-boat',
      'Swimming Activities': 'pool',
      'Transportation': 'local-taxi',
      'Accommodation': 'hotel',
      'Safety Equipment': 'security',
      'Tour Guide': 'headset-mic'
    };

    const tourDetails = [
      { label: 'Tour Type', value: currentTour.type.toUpperCase(), icon: 'category' as IconName },
      { label: 'Duration', value: currentTour.duration, icon: 'schedule' as IconName },
      { label: 'Location', value: currentTour.location, icon: 'location-on' as IconName },
      { label: 'Max Capacity', value: `${currentTour.max_capacity} people`, icon: 'people' as IconName },
      { label: 'Total Bookings', value: `${currentTour.bookings} bookings`, icon: 'book-online' as IconName },
      { label: 'Rating', value: `${currentTour.rating}/5.0`, icon: 'star' as IconName },
      { label: 'Price', value: currentTour.price, icon: 'attach-money' as IconName },
      { label: 'Status', value: currentTour.available ? 'Available' : 'Unavailable', icon: 'check-circle' as IconName }
    ];

    return (
      <Modal animationType="slide" transparent visible={modalVisible.details} onRequestClose={() => setModalVisible({ ...modalVisible, details: false })}>
        <View style={ms.centered}>
          <View style={ms.modal}>
            <View style={ms.header}>
              <Text style={ms.title}>Tour Details</Text>
              <TouchableOpacity style={ms.close} onPress={() => setModalVisible({ ...modalVisible, details: false })}><MaterialIcons name="close" size={20} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={ms.imageSection}>
                <Image source={{ uri: currentTour.image }} style={ms.heroImage} />
                <View style={ms.overlay}>
                  <View style={ms.ratingBadge}><MaterialIcons name="star" size={14} color="#FFD700" /><Text style={ms.ratingText}>{currentTour.rating}</Text></View>
                  <View style={[ms.statusBadge, { backgroundColor: currentTour.available ? '#4CAF5020' : '#f4433620' }]}>
                    <MaterialIcons name={currentTour.available ? "check-circle" : "cancel"} size={12} color={currentTour.available ? '#4CAF50' : '#f44336'} />
                    <Text style={[ms.statusText, { color: currentTour.available ? '#4CAF50' : '#f44336' }]}>{currentTour.available ? 'Available' : 'Unavailable'}</Text>
                  </View>
                </View>
              </View>
              <View style={ms.titleSection}>
                <Text style={ms.tourTitle}>{currentTour.title}</Text>
                <Text style={ms.tourPrice}>{currentTour.price}</Text>
              </View>
              <View style={ms.section}>
                <Text style={ms.sectionTitle}>Tour Features</Text>
                {currentTour.features && currentTour.features.length > 0 ? (
                  <View style={ms.features}>
                    {currentTour.features.map((f, i) => (
                      <View key={`${f.text}_${i}`} style={[ms.feature, !f.available && ms.unavailable]}>
                        <MaterialIcons name={featureIcons[f.text] || 'security'} size={16} color={f.available ? '#4CAF50' : '#ccc'} />
                        <Text style={[ms.featureText, !f.available && ms.unavailableText]}>{f.text}</Text>
                        {f.available && <MaterialIcons name="check" size={12} color="#4CAF50" />}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={ms.noFeaturesText}>No features available for this tour.</Text>
                )}
              </View>
              <View style={ms.section}>
                <Text style={ms.sectionTitle}>Tour Information</Text>
                <View style={ms.details}>
                  {tourDetails.map((d, i) => (
                    <View key={i} style={ms.detail}>
                      <View style={ms.detailIcon}><MaterialIcons name={d.icon} size={16} color="#f57c00" /></View>
                      <View>
                        <Text style={ms.detailLabel}>{d.label}</Text>
                        <Text style={ms.detailValue}>{d.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View style={ms.section}>
                <Text style={ms.sectionTitle}>Performance Stats</Text>
                <View style={ms.stats}>
                  {[
                    { icon: 'trending-up' as IconName, value: currentTour.bookings, label: 'Total Bookings', color: '#4CAF50' },
                    { icon: 'star-rate' as IconName, value: currentTour.rating, label: 'Average Rating', color: '#FFD700' },
                    { icon: 'people' as IconName, value: currentTour.max_capacity, label: 'Max Capacity', color: '#2196F3' }
                  ].map((s, i) => (
                    <View key={i} style={ms.stat}>
                      <MaterialIcons name={s.icon} size={20} color={s.color} />
                      <Text style={ms.statValue}>{s.value}</Text>
                      <Text style={ms.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={ms.actions}>
              <TouchableOpacity
                style={[ms.action, ms.bookingsAction]}
                onPress={() => {
                  setModalVisible({ ...modalVisible, details: false });
                  router.push(`/manage-tours?tourId=${currentTour.id}&search=${encodeURIComponent(currentTour.title)}`);
                }}
              >
                <MaterialIcons name="book-online" size={16} color="#fff" />
                <Text style={ms.actionText}>View Tour</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const StatChart = ({ type, title, value, trend, icon, iconColor, dataKey, chartColor }: { type: 'line' | 'pie' | 'progress'; title: string; value: string; trend: string; icon: IconName; iconColor: string; dataKey: keyof DashboardStats; chartColor: string }) => {
    if (!stats || stats[dataKey] == null) return <View style={s.card}><Text style={s.noData}>No data</Text></View>;

    let chartData: LineChartData | PieChartData | ProgressChartData;
    if (type === 'line') {
      chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].slice(-(stats[dataKey] as number[]).length),
        datasets: [{ data: stats[dataKey] as number[], color: () => chartColor, strokeWidth: 2 }]
      } as LineChartData;
    } else if (type === 'pie') {
      chartData = [
        { name: 'Regular', population: stats.tourTypeDistribution.regular, color: '#2196F3', legendFontColor: '#333', legendFontSize: 8 },
        { name: 'Combo', population: stats.tourTypeDistribution.combo, color: '#9C27B0', legendFontColor: '#333', legendFontSize: 8 }
      ].filter(item => item.population > 0) as PieChartData;
    } else {
      chartData = { data: [Math.min(stats.activeCustomers / Math.max(stats.activeCustomers || 1, 10), 1)] } as ProgressChartData;
    }

    return (
      <View style={s.card}>
        <View style={s.statHeader}>
          <View style={[s.icon, { backgroundColor: `${iconColor}15` }]}><MaterialIcons name={icon} size={16} color={iconColor} /></View>
          <View style={s.trend}>
            <MaterialIcons name={trend.startsWith('+') ? 'trending-up' : 'trending-down'} size={10} color={trend.startsWith('+') ? '#4CAF50' : '#f44336'} />
            <Text style={[s.trendText, { color: trend.startsWith('+') ? '#4CAF50' : '#f44336' }]}>{trend}</Text>
          </View>
        </View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{title}</Text>
        {type === 'line' && <LineChart data={chartData as LineChartData} width={width * 0.4} height={80} chartConfig={{ ...chartConfig, color: () => chartColor }} bezier style={s.chart} />}
        {type === 'pie' && (chartData as PieChartData).length > 0 && (
          <PieChart
            data={chartData as PieChartData}
            width={width * 0.4}
            height={80}
            chartConfig={{ ...chartConfig, color: () => '#2196F3' }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="10"
            center={[10, 0]}
            style={s.chart}
          />
        )}
        {type === 'progress' && (
          <ProgressChart
            data={chartData as ProgressChartData}
            width={width * 0.4}
            height={80}
            strokeWidth={6}
            radius={20}
            chartConfig={{ ...chartConfig, color: () => chartColor }}
            hideLegend
            style={s.chart}
          />
        )}
      </View>
    );
  };

  if (loading && !refreshing) return <View style={[s.container, s.center]}><ActivityIndicator size="large" color="#f57c00" /><Text style={s.loading}>Loading...</Text></View>;
  if (error) return <View style={[s.container, s.center]}><Text style={s.error}>Error: {error}</Text><TouchableOpacity style={s.retry} onPress={fetchDashboardData}><Text style={s.retryText}>Try Again</Text></TouchableOpacity></View>;

  const unreadCount = pendingBookings.filter((b) => !b.read_status).length;

  return (
    <View style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Admin Dashboard</Text>
            <Text style={s.headerSubtitle}>Manage your tours</Text>
          </View>
          <TouchableOpacity
            style={s.notification}
            onPress={() => setModalVisible({ ...modalVisible, notifications: true })}
          >
            <MaterialIcons name="notifications-none" size={20} color="#f57c00" />
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Analytics Overview</Text>
          <View style={s.analytics}>
            {[
              { type: 'line' as const, title: 'Total Bookings', value: stats?.totalBookings.toString() || '0', trend: stats?.bookingsTrend || '0%', icon: 'book-online' as IconName, iconColor: '#4CAF50', dataKey: 'monthlyBookings' as keyof DashboardStats, chartColor: '#4CAF50' },
              { type: 'line' as const, title: 'Total Revenue', value: `₱${stats?.totalRevenue.toLocaleString() || '0'}`, trend: stats?.revenueTrend || '0%', icon: 'attach-money' as IconName, iconColor: '#f57c00', dataKey: 'monthlyRevenue' as keyof DashboardStats, chartColor: '#f57c00' },
              { type: 'pie' as const, title: 'Available Tours', value: stats?.upcomingTours.toString() || '0', trend: '+3', icon: 'tour' as IconName, iconColor: '#2196F3', dataKey: 'tourTypeDistribution' as keyof DashboardStats, chartColor: '#2196F3' },
              { type: 'progress' as const, title: 'Total Users', value: stats?.activeCustomers.toString() || '0', trend: '+15%', icon: 'people' as IconName, iconColor: '#9C27B0', dataKey: 'activeCustomers' as keyof DashboardStats, chartColor: '#9C27B0' }
            ].map((c, i) => <StatChart key={i} {...c} />)}
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.actions}>
            {[
              { icon: 'add-circle-outline' as IconName, text: 'Add Tour', route: '/manage-tours', color: '#f57c00' },
              { icon: 'book-online' as IconName, text: 'View Booking', route: '/bookings', color: '#4CAF50' },
              { icon: 'assessment' as IconName, text: 'View Reports', route: '/reports', color: '#2196F3' },
              { icon: 'settings' as IconName, text: 'Settings', route: '/settings', color: '#9C27B0' }
            ].map(({ icon, text, route, color }, i) => (
              <TouchableOpacity key={i} style={s.actionCard} onPress={() => router.push(route)}>
                <MaterialIcons name={icon} size={28} color={color} />
                <Text style={s.actionText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Pending Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/bookings')}><Text style={s.viewAll}>View All</Text></TouchableOpacity>
          </View>
          {pendingBookings.length ? pendingBookings.slice(0, 5).map(b => (
            <TouchableOpacity 
              key={b.id} 
              style={s.bookingCard}
              onPress={() => router.push(`/bookings?bookingId=${b.id}`)}
            >
              <View style={s.bookingLeft}>
                <View style={s.bookingHeader}>
                  <Text style={s.bookingId}>#{b.id.slice(0, 8)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: `${({ pending: '#FF9800', confirmed: '#4CAF50', cancelled: '#f44336', completed: '#2196F3', 'cancel-requested': '#FF5722' }[b.status.toLowerCase()] || '#666')}15` }]}>
                    <Text style={[s.statusText, { color: ({ pending: '#FF9800', confirmed: '#4CAF50', cancelled: '#f44336', completed: '#2196F3', 'cancel-requested': '#FF5722' }[b.status.toLowerCase()] || '#666') }]}>{b.notificationType}</Text>
                  </View>
                </View>
                <Text style={s.customer}>{b.customer}</Text>
                <Text style={s.tourType}>{b.tourType}</Text>
                <View style={s.bookingInfo}>
                  <MaterialIcons name="calendar-today" size={12} color="#666" />
                  <Text style={s.bookingDate}>{new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  <MaterialIcons name="attach-money" size={12} color="#666" style={{ marginLeft: 8 }} />
                  <Text style={s.bookingAmount}>{b.amount}</Text>
                  <MaterialIcons name="people" size={12} color="#666" style={{ marginLeft: 8 }} />
                  <Text style={s.bookingAmount}>{b.number_of_people}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )) : (
            <View style={s.noDataCard}>
              <MaterialIcons name="event-available" size={36} color="#ccc" />
              <Text style={s.noData}>No pending bookings</Text>
              <Text style={s.noDataSub}>All bookings up to date!</Text>
            </View>
          )}
        </View>
        {['Regular Tours', 'Combo Packages'].map((title, i) => (
          <View key={title} style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{title}</Text>
              <TouchableOpacity onPress={() => router.push('/manage-tours')}><Text style={s.viewAll}>View All</Text></TouchableOpacity>
            </View>
            {(i === 0 ? tours : comboPackages).length ? (i === 0 ? tours : comboPackages).map(t => (
              <TouchableOpacity key={t.id} style={s.manageCard} onPress={() => { setCurrentTour(t); setModalVisible({ ...modalVisible, details: true }); }}>
                <Image source={{ uri: t.image }} style={s.manageImage} />
                <View style={s.manageContent}>
                  <View style={s.manageHeader}>
                    <Text style={s.manageTitle}>{t.title}</Text>
                    <View style={s.rating}><MaterialIcons name="star" size={14} color="#FFD700" /><Text style={s.ratingText}>{t.rating}</Text></View>
                  </View>
                  <Text style={s.managePrice}>{t.price}</Text>
                  <View style={s.manageInfo}>
                    <View style={s.infoItem}><MaterialIcons name="access-time" size={12} color="#666" /><Text style={s.infoText}>{t.duration}</Text></View>
                    <View style={s.infoItem}><MaterialIcons name="people" size={12} color="#666" /><Text style={s.infoText}>{t.bookings} bookings</Text></View>
                    <View style={s.infoItem}><MaterialIcons name="location-on" size={12} color="#666" /><Text style={s.infoText}>{t.location}</Text></View>
                    <View style={s.infoItem}><Text style={s.infoText}>{t.type.toUpperCase()}</Text></View>
                  </View>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={s.noDataCard}>
                <MaterialIcons name="event-busy" size={36} color="#ccc" />
                <Text style={s.noData}>No {title.toLowerCase()} found</Text>
                <Text style={s.noDataSub}>Add new {title.toLowerCase()} to manage!</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <TourDetailsModal />
      <NotificationModal />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 16 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loading: { marginTop: 8, color: '#666', fontSize: 14 },
  error: { color: '#f44336', fontSize: 14, textAlign: 'center' },
  retry: { marginTop: 16, backgroundColor: '#f57c00', padding: 8, borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingTop: 48 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  notification: { backgroundColor: '#fff', padding: 8, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#f44336', borderRadius: 8, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  analytics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, width: '48%', marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  icon: { padding: 5, borderRadius: 6 },
  trend: { flexDirection: 'row', alignItems: 'center' },
  trendText: { marginLeft: 3, fontWeight: '600', fontSize: 10 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  chart: { borderRadius: 6, alignSelf: 'center' },
  noData: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 16, fontWeight: '500' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, width: '48%', alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  actionText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#555' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { color: '#f57c00', fontWeight: '600', fontSize: 12 },
  bookingCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  bookingLeft: { flex: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingId: { fontSize: 11, color: '#888', fontWeight: '600' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '600', textTransform: 'capitalize' },
  customer: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 4 },
  tourType: { fontSize: 12, color: '#666', marginTop: 2 },
  bookingInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  bookingDate: { fontSize: 11, color: '#666', marginLeft: 3 },
  bookingAmount: { fontSize: 11, color: '#666', fontWeight: '600', marginLeft: 3 },
  noDataCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  noDataSub: { fontSize: 11, color: '#aaa', marginTop: 3 },
  manageCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  manageImage: { width: '100%', height: 120, resizeMode: 'cover' },
  manageContent: { padding: 12 },
  manageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  manageTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD70030', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  ratingText: { fontSize: 11, color: '#333', marginLeft: 3, fontWeight: '600' },
  managePrice: { fontSize: 14, color: '#f57c00', fontWeight: '600', marginTop: 4 },
  manageInfo: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4 },
  infoText: { fontSize: 11, color: '#666', marginLeft: 3 }
});

const ms = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { width: '95%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, elevation: 5, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  close: { padding: 4 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  imageSection: { position: 'relative', marginBottom: 16 },
  heroImage: { width: '100%', height: 160, resizeMode: 'cover' },
  overlay: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#333', marginLeft: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', marginLeft: 3 },
  titleSection: { paddingHorizontal: 16, marginBottom: 20 },
  tourTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  tourPrice: { fontSize: 16, fontWeight: '600', color: '#f57c00' },
  features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  feature: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 10, padding: 6, backgroundColor: '#f9f9f9', borderRadius: 6 },
  unavailable: { opacity: 0.5 },
  featureText: { fontSize: 11, color: '#333', marginLeft: 6, flex: 1 },
  unavailableText: { color: '#999' },
  noFeaturesText: { fontSize: 12, color: '#666', marginBottom: 8 },
  details: { gap: 10 },
  detail: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 },
  detailIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f57c0020', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  detailLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: '#f9f9f9', borderRadius: 10 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 4 },
  statLabel: { fontSize: 10, color: '#666', marginTop: 2, textAlign: 'center' },
  actions: { flexDirection: 'row', padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee', gap: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  bookingsAction: { backgroundColor: '#4CAF50' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 12, marginLeft: 5 },
  notificationCard: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 10, 
    marginBottom: 6, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08 
  },
  notificationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  notificationId: { 
    fontSize: 10, 
    color: '#888', 
    fontWeight: '600' 
  },
  notificationContent: {
    flexDirection: 'column',
  },
  notificationCustomer: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 2 
  },
  notificationTour: { 
    fontSize: 11, 
    color: '#666', 
    marginBottom: 4 
  },
  notificationInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  notificationDate: { 
    fontSize: 10, 
    color: '#666', 
    marginLeft: 3 
  },
  notificationAmount: { 
    fontSize: 10, 
    color: '#666', 
    fontWeight: '600', 
    marginLeft: 3 
  },
  noDataCard: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 8, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08 
  },
  noData: { 
    fontSize: 14, 
    color: '#888', 
    marginTop: 8, 
    fontWeight: '600' 
  },
  noDataSub: { 
    fontSize: 10, 
    color: '#aaa', 
    marginTop: 3 
  },
  unreadNotification: {
    backgroundColor: '#E7F3FF',
    borderLeftWidth: 3,
    borderLeftColor: '#1877F2',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  approveButton: {
    backgroundColor: '#1877F2',
  },
  rejectButton: {
    backgroundColor: '#E4E6EB',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
    marginLeft: 3,
  },
});