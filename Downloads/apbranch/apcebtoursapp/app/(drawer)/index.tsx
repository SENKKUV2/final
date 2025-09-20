import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: () => '#00355f',
  labelColor: () => '#6b7280',
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
};
type Tour = { id: string; title: string; price: string; duration: string; image: string; bookings: number; rating: number; type: string; location: string; available: boolean; max_capacity: number; features?: { text: string; available: boolean }[] };
type DashboardStats = { totalBookings: number; totalRevenue: number; upcomingTours: number; activeCustomers: number; bookingsTrend: string; revenueTrend: string; monthlyBookings: number[]; monthlyRevenue: number[]; statusDistribution: { confirmed: number; pending: number; cancelled: number; completed: number }; tourTypeDistribution: { regular: number; combo: number }; topLocations: { name: string; count: number; color: string }[] };

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

  useEffect(() => { fetchDashboardData(); }, []);

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
        .map(([name, count], i) => ({ name, count, color: ['#eec218', '#00355f', '#4CAF50', '#9C27B0', '#FF5722'][i] }));

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
    } catch (error: any) { // Explicitly type error
    console.error('Error in fetchStats:', error);
    setError(error.message || 'Failed to fetch stats');
    }
  };

  const calculateTrend = (current: number, previous: number) => previous === 0 ? (current > 0 ? '+100%' : '0%') : `${((current - previous) / previous * 100).toFixed(0)}%`;

  const fetchPendingBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id,total_price,booking_date,status,number_of_people,contact_phone,contact_email,special_requests,profiles(email),tours!bookings_tour_id_fkey(title,type)')
      .in('status', ['pending', 'cancel-requested'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    setPendingBookings(data?.map(b => ({
      id: b.id,
      customer: b.profiles?.email || 'Unknown',
      date: b.booking_date,
      status: b.status,
      tourType: b.tours?.title || 'Unknown Tour',
      amount: `₱${b.total_price?.toLocaleString()}`,
      contact_phone: b.contact_phone,
      contact_email: b.contact_email,
      number_of_people: b.number_of_people,
      special_requests: b.special_requests,
      notificationType: b.status === 'pending' ? 'New Booking' : 'Cancel Request'
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

  const NotificationModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible.notifications}
        onRequestClose={() => setModalVisible({ ...modalVisible, notifications: false })}
      >
        <View style={ms.centered}>
          <View style={ms.modal}>
            <View style={ms.header}>
              <Text style={ms.title}>Notifications</Text>
              <TouchableOpacity
                style={ms.close}
                onPress={() => setModalVisible({ ...modalVisible, notifications: false })}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={ms.section}>
                <Text style={ms.sectionTitle}>Pending Actions</Text>
                {pendingBookings.length > 0 ? (
                  pendingBookings.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={ms.notificationCard}
                      onPress={() => {
                        setModalVisible({ ...modalVisible, notifications: false });
                        router.push(`/bookings?bookingId=${b.id}`);
                      }}
                    >
                      <View style={ms.notificationHeader}>
                        <Text style={ms.notificationId}>#{b.id.slice(0, 8)}</Text>
                        <View style={[ms.statusBadge, { backgroundColor: b.status === 'pending' ? '#eec21815' : '#FF572215' }]}>
                          <Text style={[ms.statusText, { color: b.status === 'pending' ? '#eec218' : '#FF5722' }]}>
                            {b.notificationType}
                          </Text>
                        </View>
                      </View>
                      <Text style={ms.notificationCustomer}>{b.customer}</Text>
                      <Text style={ms.notificationTour}>{b.tourType}</Text>
                      <View style={ms.notificationInfo}>
                        <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
                        <Text style={ms.notificationDate}>
                          {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <MaterialIcons name="attach-money" size={14} color="#6b7280" style={{ marginLeft: 10 }} />
                        <Text style={ms.notificationAmount}>{b.amount}</Text>
                        <MaterialIcons name="people" size={14} color="#6b7280" style={{ marginLeft: 10 }} />
                        <Text style={ms.notificationAmount}>{b.number_of_people}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={ms.noDataCard}>
                    <MaterialIcons name="event-available" size={48} color="#6b7280" />
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

    const featureIcons: { [key: string]: string } = {
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
      { label: 'Tour Type', value: currentTour.type.toUpperCase(), icon: 'category' },
      { label: 'Duration', value: currentTour.duration, icon: 'schedule' },
      { label: 'Location', value: currentTour.location, icon: 'location-on' },
      { label: 'Max Capacity', value: `${currentTour.max_capacity} people`, icon: 'people' },
      { label: 'Total Bookings', value: `${currentTour.bookings} bookings`, icon: 'book-online' },
      { label: 'Rating', value: `${currentTour.rating}/5.0`, icon: 'star' },
      { label: 'Price', value: currentTour.price, icon: 'attach-money' },
      { label: 'Status', value: currentTour.available ? 'Available' : 'Unavailable', icon: 'check-circle' }
    ];

    return (
      <Modal animationType="slide" transparent visible={modalVisible.details} onRequestClose={() => setModalVisible({ ...modalVisible, details: false })}>
        <View style={ms.centered}>
          <View style={ms.modal}>
            <View style={ms.header}>
              <Text style={ms.title}>Tour Details</Text>
              <TouchableOpacity style={ms.close} onPress={() => setModalVisible({ ...modalVisible, details: false })}><MaterialIcons name="close" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={ms.imageSection}>
                <Image source={{ uri: currentTour.image }} style={ms.heroImage} />
                <View style={ms.overlay}>
                  <View style={ms.ratingBadge}><MaterialIcons name="star" size={16} color="#eec218" /><Text style={ms.ratingText}>{currentTour.rating}</Text></View>
                  <View style={[ms.statusBadge, { backgroundColor: currentTour.available ? '#4CAF5020' : '#f4433620' }]}>
                    <MaterialIcons name={currentTour.available ? "check-circle" : "cancel"} size={14} color={currentTour.available ? '#4CAF50' : '#f44336'} />
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
                        <MaterialIcons name={featureIcons[f.text] || 'info'} size={20} color={f.available ? '#4CAF50' : '#6b7280'} />
                        <Text style={[ms.featureText, !f.available && ms.unavailableText]}>{f.text}</Text>
                        {f.available && <MaterialIcons name="check" size={16} color="#4CAF50" />}
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
                      <View style={ms.detailIcon}><MaterialIcons name={d.icon} size={18} color="#eec218" /></View>
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
                    { icon: 'trending-up', value: currentTour.bookings, label: 'Total Bookings', color: '#4CAF50' },
                    { icon: 'star-rate', value: currentTour.rating, label: 'Average Rating', color: '#eec218' },
                    { icon: 'people', value: currentTour.max_capacity, label: 'Max Capacity', color: '#00355f' }
                  ].map((s, i) => (
                    <View key={i} style={ms.stat}>
                      <MaterialIcons name={s.icon} size={24} color={s.color} />
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
                <MaterialIcons name="book-online" size={18} color="#fff" />
                <Text style={ms.actionText}>View Tour</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const StatChart = ({ type, title, value, trend, icon, iconColor, dataKey, chartColor }: { type: 'line' | 'pie' | 'progress'; title: string; value: string; trend: string; icon: string; iconColor: string; dataKey: keyof DashboardStats; chartColor: string }) => {
    if (!stats || stats[dataKey] == null) return <View style={s.card}><Text style={s.noData}>No data</Text></View>;

    const chartData = type === 'line' ? {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].slice(-(stats[dataKey] as number[]).length),
      datasets: [{ data: stats[dataKey] as number[], color: () => chartColor, strokeWidth: 2 }]
    } : type === 'pie' ? [
      { name: 'Regular', population: stats.tourTypeDistribution.regular, color: '#00355f', legendFontColor: '#333', legendFontSize: 8 },
      { name: 'Combo', population: stats.tourTypeDistribution.combo, color: '#eec218', legendFontColor: '#333', legendFontSize: 8 }
    ].filter(item => item.population > 0) : { data: [Math.min(stats.activeCustomers / Math.max(stats.activeCustomers || 1, 10), 1)] };

    return (
      <View style={s.card}>
        <View style={s.statHeader}>
          <View style={[s.icon, { backgroundColor: `${iconColor}15` }]}><MaterialIcons name={icon} size={18} color={iconColor} /></View>
          <View style={s.trend}>
            <MaterialIcons name={trend.startsWith('+') ? 'trending-up' : 'trending-down'} size={12} color={trend.startsWith('+') ? '#4CAF50' : '#f44336'} />
            <Text style={[s.trendText, { color: trend.startsWith('+') ? '#4CAF50' : '#f44336' }]}>{trend}</Text>
          </View>
        </View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{title}</Text>
        {type === 'line' && <LineChart data={chartData} width={width * 0.4} height={100} chartConfig={{ ...chartConfig, color: () => chartColor }} bezier style={s.chart} />}
        {type === 'pie' && chartData.length > 0 && <PieChart data={chartData} width={width * 0.4} height={100} chartConfig={{ ...chartConfig, color: () => '#00355f' }} accessor="population" backgroundColor="transparent" paddingLeft="10" center={[10, 0]} style={s.chart} />}
        {type === 'progress' && (
          <ProgressChart
            data={chartData}
            width={width * 0.4}
            height={100}
            strokeWidth={8}
            radius={25}
            chartConfig={{ ...chartConfig, color: () => chartColor }}
            hideLegend
            style={s.chart}
            accessible={true}
            accessibilityLabel="Total Users Chart"
          />
        )}
      </View>
    );
  };

  if (loading && !refreshing) return <View style={[s.container, s.center]}><ActivityIndicator size="large" color="#eec218" /><Text style={s.loading}>Loading...</Text></View>;
  if (error) return <View style={[s.container, s.center]}><Text style={s.error}>Error: {error}</Text><TouchableOpacity style={s.retry} onPress={fetchDashboardData}><Text style={s.retryText}>Try Again</Text></TouchableOpacity></View>;

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} />}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Admin Dashboard</Text>
            <Text style={s.headerSubtitle}>Manage your tours</Text>
          </View>
          <TouchableOpacity
            style={s.notification}
            onPress={() => setModalVisible({ ...modalVisible, notifications: true })}
          >
            <MaterialIcons name="notifications-outline" size={24} color="#eec218" />
            <View style={s.badge}><Text style={s.badgeText}>{pendingBookings.length}</Text></View>
          </TouchableOpacity>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Analytics Overview</Text>
          <View style={s.analytics}>
            {[
              { type: 'line', title: 'Total Bookings', value: stats?.totalBookings.toString() || '0', trend: stats?.bookingsTrend || '0%', icon: 'book-online', iconColor: '#4CAF50', dataKey: 'monthlyBookings', chartColor: '#4CAF50' },
              { type: 'line', title: 'Total Revenue', value: `₱${stats?.totalRevenue.toLocaleString() || '0'}`, trend: stats?.revenueTrend || '0%', icon: 'attach-money', iconColor: '#eec218', dataKey: 'monthlyRevenue', chartColor: '#eec218' },
              { type: 'pie', title: 'Available Tours', value: stats?.upcomingTours.toString() || '0', trend: '+3', icon: 'tour', iconColor: '#00355f', dataKey: 'tourTypeDistribution', chartColor: '#00355f' },
              { type: 'progress', title: 'Total Users', value: stats?.activeCustomers.toString() || '0', trend: '+15%', icon: 'people', iconColor: '#00355f', dataKey: 'activeCustomers', chartColor: '#00355f' }
            ].map((c, i) => <StatChart key={i} {...c} />)}
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.actions}>
            {[
              { icon: 'add-circle-outline', text: 'Add Tour', route: '/manage-tours', color: '#eec218' },
              { icon: 'book-online', text: 'View Booking', route: '/bookings', color: '#4CAF50' },
              { icon: 'assessment', text: 'View Reports', route: '/reports', color: '#00355f' },
              { icon: 'settings', text: 'Settings', route: '/settings', color: '#00355f' }
            ].map(({ icon, text, route, color }, i) => (
              <TouchableOpacity key={i} style={s.actionCard} onPress={() => router.push(route)}>
                <MaterialIcons name={icon} size={32} color={color} />
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
          {pendingBookings.length ? pendingBookings.map(b => (
            <TouchableOpacity 
              key={b.id} 
              style={s.bookingCard}
              onPress={() => router.push(`/bookings?bookingId=${b.id}`)}
            >
              <View style={s.bookingLeft}>
                <View style={s.bookingHeader}>
                  <Text style={s.bookingId}>#{b.id.slice(0, 8)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: `${({ pending: '#eec218', confirmed: '#4CAF50', cancelled: '#f44336', completed: '#00355f', 'cancel-requested': '#FF5722' }[b.status.toLowerCase()] || '#6b7280')}15` }]}>
                    <Text style={[s.statusText, { color: ({ pending: '#eec218', confirmed: '#4CAF50', cancelled: '#f44336', completed: '#00355f', 'cancel-requested': '#FF5722' }[b.status.toLowerCase()] || '#6b7280') }]}>{b.notificationType}</Text>
                  </View>
                </View>
                <Text style={s.customer}>{b.customer}</Text>
                <Text style={s.tourType}>{b.tourType}</Text>
                <View style={s.bookingInfo}>
                  <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
                  <Text style={s.bookingDate}>{new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  <MaterialIcons name="attach-money" size={14} color="#6b7280" style={{ marginLeft: 10 }} />
                  <Text style={s.bookingAmount}>{b.amount}</Text>
                  <MaterialIcons name="people" size={14} color="#6b7280" style={{ marginLeft: 10 }} />
                  <Text style={s.bookingAmount}>{b.number_of_people}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )) : (
            <View style={s.noDataCard}>
              <MaterialIcons name="event-available" size={48} color="#6b7280" />
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
                    <View style={s.rating}><MaterialIcons name="star" size={16} color="#eec218" /><Text style={s.ratingText}>{t.rating}</Text></View>
                  </View>
                  <Text style={s.managePrice}>{t.price}</Text>
                  <View style={s.manageInfo}>
                    <View style={s.infoItem}><MaterialIcons name="access-time" size={14} color="#6b7280" /><Text style={s.infoText}>{t.duration}</Text></View>
                    <View style={s.infoItem}><MaterialIcons name="people" size={14} color="#6b7280" /><Text style={s.infoText}>{t.bookings} bookings</Text></View>
                    <View style={s.infoItem}><MaterialIcons name="location-on" size={14} color="#6b7280" /><Text style={s.infoText}>{t.location}</Text></View>
                    <View style={s.infoItem}><Text style={s.infoText}>{t.type.toUpperCase()}</Text></View>
                  </View>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={s.noDataCard}>
                <MaterialIcons name="event-busy" size={48} color="#6b7280" />
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

// Updated styles with new color palette
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loading: { marginTop: 10, color: '#6b7280' },
  error: { color: '#f44336', fontSize: 16, textAlign: 'center' },
  retry: { marginTop: 20, backgroundColor: '#eec218', padding: 10, borderRadius: 8 },
  retryText: { color: '#00355f', fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, paddingTop: 60 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#00355f' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  notification: { backgroundColor: '#ffffff', padding: 10, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#f44336', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  analytics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, width: '48%', marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  icon: { padding: 6, borderRadius: 8 },
  trend: { flexDirection: 'row', alignItems: 'center' },
  trendText: { marginLeft: 4, fontWeight: 'bold', fontSize: 11 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#00355f', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  chart: { borderRadius: 8, alignSelf: 'center' },
  noData: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 20, fontWeight: '500' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#00355f', marginBottom: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, width: '48%', alignItems: 'center', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  actionText: { marginTop: 8, fontSize: 14, fontWeight: 'bold', color: '#00355f' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  viewAll: { color: '#eec218', fontWeight: 'bold' },
  bookingCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  bookingLeft: { flex: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingId: { fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' },
  customer: { fontSize: 16, fontWeight: 'bold', color: '#00355f', marginTop: 5 },
  tourType: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  bookingInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bookingDate: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  bookingAmount: { fontSize: 12, color: '#6b7280', fontWeight: 'bold', marginLeft: 4 },
  noDataCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  noDataSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  manageCard: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 15, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  manageImage: { width: '100%', height: 150, resizeMode: 'cover' },
  manageContent: { padding: 15 },
  manageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  manageTitle: { fontSize: 18, fontWeight: 'bold', color: '#00355f', flexShrink: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eec21830', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingText: { fontSize: 12, color: '#00355f', marginLeft: 4, fontWeight: 'bold' },
  managePrice: { fontSize: 16, color: '#eec218', fontWeight: 'bold', marginTop: 5 },
  manageInfo: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 5 },
  infoText: { fontSize: 12, color: '#6b7280', marginLeft: 4 }
});

const ms = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,53,95,0.5)' },
  modal: { width: '95%', maxWidth: 400, backgroundColor: '#ffffff', borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, elevation: 5, maxHeight: '75%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#00355f' },
  close: { padding: 5 },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00355f', marginBottom: 15 },
  imageSection: { position: 'relative', marginBottom: 20 },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  overlay: { position: 'absolute', top: 15, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15 },
  ratingText: { fontSize: 14, fontWeight: 'bold', color: '#00355f', marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  titleSection: { paddingHorizontal: 20, marginBottom: 25 },
  tourTitle: { fontSize: 24, fontWeight: 'bold', color: '#00355f', marginBottom: 5 },
  tourPrice: { fontSize: 20, fontWeight: 'bold', color: '#eec218' },
  features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  feature: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 12, padding: 8, backgroundColor: '#f9fafb', borderRadius: 8 },
  unavailable: { opacity: 0.5 },
  featureText: { fontSize: 13, color: '#00355f', marginLeft: 8, flex: 1 },
  unavailableText: { color: '#6b7280' },
  noFeaturesText: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
  details: { gap: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 10 },
  detailIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eec21820', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: 'bold', color: '#00355f' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, backgroundColor: '#f9fafb', borderRadius: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#00355f', marginTop: 5 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  actions: { flexDirection: 'row', padding: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f9fafb', gap: 12 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  bookingsAction: { backgroundColor: '#00355f' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  notificationCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  notificationId: { fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  notificationCustomer: { fontSize: 16, fontWeight: 'bold', color: '#00355f', marginBottom: 2 },
  notificationTour: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  notificationInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  notificationDate: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  notificationAmount: { fontSize: 12, color: '#6b7280', fontWeight: 'bold', marginLeft: 4 },
  noDataCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  noData: { fontSize: 16, color: '#6b7280', marginTop: 10, fontWeight: 'bold' },
  noDataSub: { fontSize: 12, color: '#6b7280', marginTop: 4 }
});