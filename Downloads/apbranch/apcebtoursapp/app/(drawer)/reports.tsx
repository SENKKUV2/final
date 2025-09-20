import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  RefreshControl,
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Color palette constants
const COLORS = {
  primary: '#00355f',
  accent: '#eec218',
  background: '#ffffff',
  lightGray: '#f9fafb',
  darkGray: '#6b7280',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

// Chart colors array
const CHART_COLORS = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  COLORS.info,
  COLORS.error,
];

type DashboardStats = {
  totalBookings: number;
  totalRevenue: number;
  upcomingTours: number;
  activeCustomers: number;
  bookingsTrend: string;
  revenueTrend: string;
  monthlyBookings: number[];
  monthlyRevenue: number[];
  statusDistribution: {
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
  };
  tourTypeDistribution: {
    regular: number;
    combo: number;
  };
  topLocations: {
    name: string;
    count: number;
    color: string;
  }[];
};

type Tour = {
  id: string;
  title: string;
  price: number;
  duration: string;
  type: string;
  location: string;
  available: boolean;
  max_capacity: number;
  bookings: number;
  rating: number;
};

type Booking = {
  id: string;
  customer: string;
  date: string;
  status: string;
  tourType: string;
  amount: number;
  contact_phone?: string;
  contact_email?: string;
  number_of_people: number;
  special_requests?: string;
};

export default function ReportsScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const calculateTrend = useCallback((current: number, previous: number) => 
    previous === 0 ? (current > 0 ? '+100%' : '0%') : `${((current - previous) / previous * 100).toFixed(0)}%`, 
    []
  );

  const fetchStats = useCallback(async () => {
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

      const activeCustomers = users?.length || 0;
      const totalBookings = completedBookings?.length || 0;
      const totalRevenue = completedBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      const upcomingTours = toursData?.filter(t => t.available).length || 0;

      // Calculate monthly data for the last 6 months
      const monthlyBookings = Array(6).fill(0);
      const monthlyRevenue = Array(6).fill(0);
      const now = new Date();
      
      completedBookings?.forEach(b => {
        const bookingDate = new Date(b.created_at);
        const monthDiff = (now.getFullYear() - bookingDate.getFullYear()) * 12 + (now.getMonth() - bookingDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
          monthlyBookings[5 - monthDiff]++;
          monthlyRevenue[5 - monthDiff] += b.total_price || 0;
        }
      });

      // Status distribution
      const statusDistribution = {
        confirmed: allBookings?.filter(b => b.status === 'confirmed').length || 0,
        pending: allBookings?.filter(b => b.status === 'pending').length || 0,
        cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
        completed: allBookings?.filter(b => b.status === 'completed').length || 0
      };

      // Tour type distribution
      const tourTypeDistribution = {
        regular: toursData?.filter(t => t.type === 'regular').length || 0,
        combo: toursData?.filter(t => t.type === 'combo').length || 0
      };

      // Top locations
      const locationCounts: Record<string, number> = {};
      toursData?.forEach(t => { 
        locationCounts[t.location] = (locationCounts[t.location] || 0) + 1; 
      });
      
      const topLocations = Object.entries(locationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count], i) => ({ 
          name, 
          count, 
          color: CHART_COLORS[i % CHART_COLORS.length] 
        }));

      // Calculate trends
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthBookings = completedBookings?.filter(b => {
        const date = new Date(b.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }) || [];

      const prevMonthBookings = completedBookings?.filter(b => {
        const date = new Date(b.created_at);
        return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
      }) || [];

      const currentRevenue = currentMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const prevRevenue = prevMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      setStats({
        totalBookings,
        totalRevenue,
        upcomingTours,
        activeCustomers,
        bookingsTrend: calculateTrend(currentMonthBookings.length, prevMonthBookings.length),
        revenueTrend: calculateTrend(currentRevenue, prevRevenue),
        monthlyBookings,
        monthlyRevenue,
        statusDistribution,
        tourTypeDistribution,
        topLocations
      });
    } catch (error: any) {
      console.error('Stats fetch error:', error.message);
      throw error;
    }
  }, [calculateTrend]);

  const fetchTours = useCallback(async () => {
    const { data, error } = await supabase
      .from('tours')
      .select('id,title,price,duration,type,location,available,max_capacity,rating,bookings(id)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    setTours(
      data?.map((t) => ({
        id: t.id,
        title: t.title,
        price: t.price || 0,
        duration: t.duration,
        type: t.type,
        location: t.location,
        available: t.available,
        max_capacity: t.max_capacity || 0,
        bookings: t.bookings?.length || 0,
        rating: t.rating || 0,
      })) || []
    );
  }, []);

  const fetchBookings = useCallback(async () => {
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
        profiles(full_name,email),
        tours!bookings_tour_id_fkey(title,type)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setBookings(
      data?.map((b) => ({
        id: b.id,
        customer: b.profiles?.full_name || b.profiles?.email || 'Unknown',
        date: b.booking_date,
        status: b.status,
        tourType: b.tours?.title || 'Unknown Tour',
        amount: b.total_price || 0,
        contact_phone: b.contact_phone,
        contact_email: b.contact_email,
        number_of_people: b.number_of_people,
        special_requests: b.special_requests,
      })) || []
    );
  }, []);

  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchStats(), fetchTours(), fetchBookings()]);
    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchStats, fetchTours, fetchBookings]);

  const exportToExcel = useCallback(async () => {
    try {
      setExporting(true);
      const data: string[][] = [
        ['Tour Management Report', '', '', '', '', '', '', ''],
        ['Generated on:', new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['Summary Statistics', '', '', '', '', '', '', ''],
        ['Metric', 'Value', 'Trend', '', '', '', '', ''],
        ['Total Bookings', stats?.totalBookings.toString() || '0', stats?.bookingsTrend || '0%', '', '', '', '', ''],
        ['Total Revenue', `PHP ${stats?.totalRevenue.toLocaleString()}` || 'PHP 0', stats?.revenueTrend || '0%', '', '', '', '', ''],
        ['Available Tours', stats?.upcomingTours.toString() || '0', '', '', '', '', '', ''],
        ['Active Customers', stats?.activeCustomers.toString() || '0', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['Monthly Data', '', '', '', '', '', '', ''],
        ['Month', 'Bookings', 'Revenue', '', '', '', '', ''],
      ];

      const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      stats?.monthlyBookings.forEach((bookings, index) => {
        data.push([
          monthNames[index] || `Month ${index + 1}`,
          bookings.toString(),
          stats?.monthlyRevenue[index].toLocaleString() || '0',
          '', '', '', '', '',
        ]);
      });

      const csvContent = data
        .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const filename = `tour_report_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', `Report downloaded as ${filename}`);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Tour Report',
          });
        } else {
          Alert.alert('Success', `Report saved as ${filename}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  }, [stats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReportsData();
  }, [fetchReportsData]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Memoized chart configurations
  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: COLORS.background,
    backgroundGradientTo: COLORS.background,
    color: (opacity = 1) => `rgba(0, 53, 95, ${opacity})`, // Primary color with opacity
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Dark gray
    strokeWidth: 3,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.lightGray,
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600',
    },
  }), []);

  // Memoized chart data
  const pieData = useMemo(() => [
    { 
      name: 'Confirmed', 
      population: stats?.statusDistribution.confirmed || 0, 
      color: COLORS.success, 
      legendFontColor: COLORS.darkGray, 
      legendFontSize: 13 
    },
    { 
      name: 'Pending', 
      population: stats?.statusDistribution.pending || 0, 
      color: COLORS.warning, 
      legendFontColor: COLORS.darkGray, 
      legendFontSize: 13 
    },
    { 
      name: 'Cancelled', 
      population: stats?.statusDistribution.cancelled || 0, 
      color: COLORS.error, 
      legendFontColor: COLORS.darkGray, 
      legendFontSize: 13 
    },
    { 
      name: 'Completed', 
      population: stats?.statusDistribution.completed || 0, 
      color: COLORS.primary, 
      legendFontColor: COLORS.darkGray, 
      legendFontSize: 13 
    },
  ].filter(item => item.population > 0), [stats]);

  const revenueData = useMemo(() => ({
    labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(-(stats?.monthlyRevenue.length || 0)),
    datasets: [{
      data: stats?.monthlyRevenue || [],
      color: (opacity = 1) => `rgba(238, 194, 24, ${opacity})`, // Accent color
      strokeWidth: 3,
    }],
  }), [stats]);

  const bookingsBarData = useMemo(() => ({
    labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(-(stats?.monthlyBookings.length || 0)),
    datasets: [{
      data: stats?.monthlyBookings || [],
    }],
  }), [stats]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating Analytics...</Text>
          <Text style={styles.loadingSubText}>Please wait while we process your data</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <MaterialIcons name="analytics" size={48} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>Analytics Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReportsData}>
            <MaterialIcons name="refresh" size={20} color={COLORS.background} />
            <Text style={styles.retryText}>Retry Analysis</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS.primary]} 
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Business Analytics</Text>
            <Text style={styles.headerSubtitle}>Real-time insights & performance metrics</Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiSection}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, styles.primaryKpi]}>
              <View style={styles.kpiIconContainer}>
                <MaterialIcons name="trending-up" size={28} color={COLORS.success} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiValue}>₱{(stats?.totalRevenue || 0).toLocaleString()}</Text>
                <Text style={styles.kpiLabel}>Total Revenue</Text>
                <View style={styles.trendContainer}>
                  <MaterialIcons 
                    name={stats?.revenueTrend?.startsWith('+') ? 'arrow-upward' : 'arrow-downward'} 
                    size={14} 
                    color={stats?.revenueTrend?.startsWith('+') ? COLORS.success : COLORS.error} 
                  />
                  <Text style={[styles.trendText, { 
                    color: stats?.revenueTrend?.startsWith('+') ? COLORS.success : COLORS.error 
                  }]}>
                    {stats?.revenueTrend}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.kpiCard, styles.secondaryKpi]}>
              <View style={styles.kpiIconContainer}>
                <MaterialIcons name="event-available" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiValue}>{stats?.totalBookings || 0}</Text>
                <Text style={styles.kpiLabel}>Total Bookings</Text>
                <View style={styles.trendContainer}>
                  <MaterialIcons 
                    name={stats?.bookingsTrend?.startsWith('+') ? 'arrow-upward' : 'arrow-downward'} 
                    size={14} 
                    color={stats?.bookingsTrend?.startsWith('+') ? COLORS.success : COLORS.error} 
                  />
                  <Text style={[styles.trendText, { 
                    color: stats?.bookingsTrend?.startsWith('+') ? COLORS.success : COLORS.error 
                  }]}>
                    {stats?.bookingsTrend}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconContainer}>
                <MaterialIcons name="tour" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiValue}>{stats?.upcomingTours || 0}</Text>
                <Text style={styles.kpiLabel}>Active Tours</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIconContainer}>
                <MaterialIcons name="people" size={24} color={COLORS.info} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiValue}>{stats?.activeCustomers || 0}</Text>
                <Text style={styles.kpiLabel}>Customers</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revenue Trend */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Revenue Performance</Text>
            <Text style={styles.chartSubtitle}>Monthly revenue tracking</Text>
          </View>
          <View style={styles.chartContainer}>
            <LineChart
              data={revenueData}
              width={width - 60}
              height={240}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(238, 194, 24, ${opacity})`, // Accent color
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* Bookings Bar Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Booking Trends</Text>
            <Text style={styles.chartSubtitle}>Monthly booking volume</Text>
          </View>
          <View style={styles.chartContainer}>
            <BarChart
              data={bookingsBarData}
              width={width - 60}
              height={240}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </View>
        </View>

        {/* Booking Status Distribution */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Booking Status</Text>
            <Text style={styles.chartSubtitle}>Current distribution overview</Text>
          </View>
          <View style={styles.chartContainer}>
            {pieData.length > 0 ? (
              <PieChart
                data={pieData}
                width={width - 60}
                height={240}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
                hasLegend={true}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="donut-small" size={48} color={COLORS.darkGray} />
                <Text style={styles.noDataText}>No booking data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Location Performance */}
        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Top Performing Locations</Text>
            <Text style={styles.tableSubtitle}>Tours by destination</Text>
          </View>
          <View style={styles.tableContainer}>
            {stats?.topLocations.length ? stats.topLocations.map((location, index) => (
              <View key={index} style={[styles.locationRow, { borderBottomWidth: index === stats.topLocations.length - 1 ? 0 : 1 }]}>
                <View style={styles.locationRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={[styles.locationIndicator, { backgroundColor: location.color }]} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationSubtext}>{location.count} tours available</Text>
                </View>
                <View style={styles.locationMetric}>
                  <Text style={styles.locationCount}>{location.count}</Text>
                  <Text style={styles.locationLabel}>tours</Text>
                </View>
              </View>
            )) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="location-off" size={48} color={COLORS.darkGray} />
                <Text style={styles.noDataText}>No location data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tour Analytics */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Tour Portfolio</Text>
            <Text style={styles.statsSubtitle}>Comprehensive tour statistics</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="map" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{tours.filter(t => t.type === 'regular').length}</Text>
              <Text style={styles.statLabel}>Regular Tours</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="layers" size={32} color={COLORS.success} />
              <Text style={styles.statValue}>{tours.filter(t => t.type === 'combo').length}</Text>
              <Text style={styles.statLabel}>Combo Packages</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="place" size={32} color={COLORS.error} />
              <Text style={styles.statValue}>{new Set(tours.map(t => t.location)).size}</Text>
              <Text style={styles.statLabel}>Unique Locations</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="groups" size={32} color={COLORS.accent} />
              <Text style={styles.statValue}>{tours.reduce((sum, t) => sum + t.max_capacity, 0)}</Text>
              <Text style={styles.statLabel}>Total Capacity</Text>
            </View>
          </View>
        </View>

        {/* Export Button */}
        <View style={styles.exportSection}>
          <TouchableOpacity style={styles.exportButton} onPress={exportToExcel} disabled={exporting}>
            <MaterialIcons 
              name={exporting ? "hourglass-empty" : "file-download"} 
              size={24} 
              color={COLORS.background} 
            />
            <Text style={styles.exportText}>
              {exporting ? 'Exporting Report...' : 'Export Complete Report'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingCard: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
  },
  loadingSubText: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 20,
  },
  errorCard: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  retryText: {
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingTop: 60,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  exportSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportText: {
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  kpiSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryKpi: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  secondaryKpi: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  kpiIconContainer: {
    marginBottom: 12,
  },
  kpiContent: {
    flex: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    color: COLORS.darkGray,
    fontWeight: '500',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chartSubtitle: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 20,
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 12,
    fontWeight: '500',
  },
  tableSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  tableHeader: {
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tableSubtitle: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  tableContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 20,
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomColor: COLORS.lightGray,
  },
  locationRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  locationIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationSubtext: {
    fontSize: 13,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  locationMetric: {
    alignItems: 'center',
  },
  locationCount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  locationLabel: {
    fontSize: 11,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsSubtitle: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.darkGray,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});