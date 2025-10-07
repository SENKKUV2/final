import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import * as XLSX from 'xlsx'; // Add SheetJS for Excel export

const { width } = Dimensions.get('window');

type DashboardStats = {
  totalBookings: number; totalRevenue: number; upcomingTours: number; activeCustomers: number;
  bookingsTrend: string; revenueTrend: string; monthlyBookings: number[]; monthlyRevenue: number[];
  statusDistribution: { confirmed: number; pending: number; cancelled: number; completed: number };
  tourTypeDistribution: { regular: number; combo: number };
  topLocations: { name: string; count: number; color: string }[];
};

type Tour = { id: string; title: string; price: number; duration: string; type: string; location: string; available: boolean; max_capacity: number; bookings: number; rating: number };
type Booking = { id: string; customer: string; date: string; status: string; tourType: string; amount: number; contact_phone?: string; contact_email?: string; number_of_people: number; special_requests?: string; profiles?: { full_name?: string; email?: string }; tours?: { title?: string; type?: string } };

export default function ReportsScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchReportsData(); }, []);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStats(), fetchTours(), fetchBookings()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const [{ data: completedBookings, error: cbError }, { data: allBookings, error: abError }, { data: toursData, error: tError }, { data: users, error: uError }] = await Promise.all([
      supabase.from('bookings').select('id,total_price,created_at,booking_date').eq('status', 'completed'),
      supabase.from('bookings').select('status'),
      supabase.from('tours').select('id,available,type,location'),
      supabase.from('profiles').select('id').eq('role', 'user')
    ]);

    if (cbError || abError || tError || uError) throw new Error(`Fetch error: ${cbError?.message || abError?.message || tError?.message || uError?.message}`);

    const now = new Date();
    const monthlyBookings = Array(6).fill(0);
    const monthlyRevenue = Array(6).fill(0);
    completedBookings?.forEach(b => {
      const diff = (now.getFullYear() - new Date(b.created_at).getFullYear()) * 12 + (now.getMonth() - new Date(b.created_at).getMonth());
      if (diff >= 0 && diff < 6) {
        monthlyBookings[5 - diff]++;
        monthlyRevenue[5 - diff] += b.total_price || 0;
      }
    });

    const locationCounts: { [key: string]: number } = {};
    toursData?.forEach(t => { locationCounts[t.location] = (locationCounts[t.location] || 0) + 1; });

    const currentMonthBookings = completedBookings?.filter(b => {
      const d = new Date(b.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }) || [];
    const prevMonthBookings = completedBookings?.filter(b => {
      const d = new Date(b.created_at);
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }) || [];

    setStats({
      totalBookings: completedBookings?.length || 0,
      totalRevenue: completedBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
      upcomingTours: toursData?.filter(t => t.available).length || 0,
      activeCustomers: users?.length || 0,
      bookingsTrend: calculateTrend(currentMonthBookings.length, prevMonthBookings.length),
      revenueTrend: calculateTrend(currentMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0), prevMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)),
      monthlyBookings,
      monthlyRevenue,
      statusDistribution: {
        confirmed: allBookings?.filter(b => b.status === 'confirmed').length || 0,
        pending: allBookings?.filter(b => b.status === 'pending').length || 0,
        cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
        completed: allBookings?.filter(b => b.status === 'completed').length || 0
      },
      tourTypeDistribution: {
        regular: toursData?.filter(t => t.type === 'regular').length || 0,
        combo: toursData?.filter(t => t.type === 'combo').length || 0
      },
      topLocations: Object.entries(locationCounts).sort(([, a], [, b]) => b - a).slice(0, 5)
        .map(([name, count], i) => ({ name, count, color: ['#6366f1', '#06d6a0', '#f72585', '#ffbe0b', '#fb8500'][i] }))
    });
  };

  const calculateTrend = (current: number, previous: number) => previous === 0 ? (current > 0 ? '+100%' : '0%') : `${((current - previous) / previous * 100).toFixed(0)}%`;

  const fetchTours = async () => {
    const { data, error } = await supabase.from('tours').select('id,title,price,duration,type,location,available,max_capacity,rating,bookings(id)').order('created_at', { ascending: false });
    if (error) throw error;
    setTours(data?.map(t => ({ ...t, bookings: t.bookings?.length || 0, price: t.price || 0, max_capacity: t.max_capacity || 0, rating: t.rating || 0 })) || []);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase.from('bookings').select(`
      id,total_price,booking_date,status,number_of_people,contact_phone,contact_email,special_requests,
      profiles(full_name,email),tours!bookings_tour_id_fkey(title,type)
    `).order('created_at', { ascending: false });
    if (error) throw error;
    setBookings(data?.map(b => ({
      id: b.id, customer: b.profiles?.full_name || b.profiles?.email || 'Unknown', date: b.booking_date, status: b.status,
      tourType: b.tours?.title || 'Unknown Tour', amount: b.total_price || 0, contact_phone: b.contact_phone,
      contact_email: b.contact_email, number_of_people: b.number_of_people, special_requests: b.special_requests,
      profiles: b.profiles, tours: b.tours
    })) || []);
  };

  const generateBusinessReport = () => {
    const reportDate = new Date();
    const dateStr = reportDate.toISOString().split('T')[0];

    // Generate dynamic month labels for the last 6 months
    const monthLabels = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return date.toLocaleString('en-US', { month: 'long' });
    });

    const avgBookingValue = stats?.totalBookings ? (stats.totalRevenue / stats.totalBookings) : 0;
    const occupancyRate = tours.length ? (tours.reduce((sum, t) => sum + t.bookings, 0) / tours.reduce((sum, t) => sum + t.max_capacity, 0) * 100) : 0;
    const topPerformingTour = tours.sort((a, b) => (b.bookings * b.price) - (a.bookings * a.price))[0];

    return {
      executiveSummary: [
        ['TOUR MANAGEMENT BUSINESS INTELLIGENCE REPORT'],
        ['Report Generated:', reportDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
        ['Report Period:', 'Last 6 Months'],
        ['Company:', 'Tour Management System'],
        [''],
        ['EXECUTIVE SUMMARY'],
        [''],
        ['Key Performance Indicators', 'Current Value', 'Trend', 'Status'],
        ['Total Revenue (Completed)', `PHP ${(stats?.totalRevenue || 0).toLocaleString()}`, stats?.revenueTrend || '0%', stats?.revenueTrend?.startsWith('+') ? 'Positive' : 'Needs Attention'],
        ['Total Bookings (Completed)', stats?.totalBookings?.toString() || '0', stats?.bookingsTrend || '0%', stats?.bookingsTrend?.startsWith('+') ? 'Growing' : 'Declining'],
        ['Average Booking Value', `PHP ${avgBookingValue.toLocaleString()}`, '', avgBookingValue > 5000 ? 'Strong' : 'Moderate'],
        ['Active Tours', stats?.upcomingTours?.toString() || '0', '', stats?.upcomingTours ? 'Healthy' : 'Limited'],
        ['Customer Base', stats?.activeCustomers?.toString() || '0', '', stats?.activeCustomers ? 'Growing' : 'Needs Growth'],
        ['Occupancy Rate', `${occupancyRate.toFixed(1)}%`, '', occupancyRate > 60 ? 'Excellent' : occupancyRate > 40 ? 'Good' : 'Needs Improvement'],
        [''],
        ['BUSINESS INSIGHTS'],
        ['Top Performing Tour:', topPerformingTour?.title || 'N/A'],
        ['Revenue per Tour:', `PHP ${topPerformingTour ? (topPerformingTour.bookings * topPerformingTour.price).toLocaleString() : '0'}`],
        ['Most Popular Location:', stats?.topLocations[0]?.name || 'N/A'],
        ['Location Tour Count:', stats?.topLocations[0]?.count?.toString() || '0'],
        [''],
        ['RECOMMENDATIONS'],
        ['1. Revenue Growth:', avgBookingValue < 5000 ? 'Focus on premium tour packages and upselling' : 'Maintain current pricing strategy'],
        ['2. Capacity Management:', occupancyRate < 60 ? 'Optimize tour scheduling and marketing efforts' : 'Consider expanding popular tours'],
        ['3. Customer Retention:', 'Implement loyalty programs and follow-up campaigns'],
        ['4. Market Expansion:', stats?.topLocations && stats.topLocations.length < 3 ? 'Explore new destination opportunities' : 'Strengthen existing location offerings']
      ],

      monthlyPerformance: [
        ['Month', 'Bookings', 'Revenue (PHP)', 'Avg Booking Value', 'Growth Rate'],
        ...monthLabels.map((month, i) => {
          const bookings = stats?.monthlyBookings[i] || 0;
          const revenue = stats?.monthlyRevenue[i] || 0;
          const avgValue = bookings > 0 ? revenue / bookings : 0;
          const prevRevenue = i > 0 ? (stats?.monthlyRevenue[i-1] || 0) : 0;
          const growthRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100).toFixed(1) + '%' : 'N/A';
          
          return [month, bookings, revenue, avgValue, growthRate];
        }),
        [''],
        ['PERFORMANCE METRICS'],
        ['Total Period Revenue:', (stats?.monthlyRevenue.reduce((a, b) => a + b, 0) || 0)],
        ['Total Period Bookings:', (stats?.monthlyBookings.reduce((a, b) => a + b, 0) || 0)],
        ['Average Monthly Revenue:', ((stats?.monthlyRevenue.reduce((a, b) => a + b, 0) || 0) / 6)],
        ['Peak Month:', monthLabels[stats?.monthlyRevenue.indexOf(Math.max(...(stats?.monthlyRevenue || []))) || 0]],
        ['Lowest Month:', monthLabels[stats?.monthlyRevenue.indexOf(Math.min(...(stats?.monthlyRevenue || []))) || 0]]
      ],

      tourPortfolio: [
        ['Tour Name', 'Type', 'Location', 'Price (PHP)', 'Capacity', 'Bookings', 'Revenue (PHP)', 'Rating', 'Utilization %', 'Status'],
        ...tours.map(tour => [
          tour.title,
          tour.type.toUpperCase(),
          tour.location,
          tour.price,
          tour.max_capacity,
          tour.bookings,
          (tour.bookings * tour.price),
          tour.rating.toFixed(1),
          tour.max_capacity > 0 ? ((tour.bookings / tour.max_capacity) * 100).toFixed(1) + '%' : '0%',
          tour.available ? 'ACTIVE' : 'INACTIVE'
        ]),
        [''],
        ['PORTFOLIO SUMMARY'],
        ['Total Tours:', tours.length],
        ['Regular Tours:', tours.filter(t => t.type === 'regular').length],
        ['Combo Tours:', tours.filter(t => t.type === 'combo').length],
        ['Unique Locations:', new Set(tours.map(t => t.location)).size],
        ['Total Capacity:', tours.reduce((sum, t) => sum + t.max_capacity, 0)],
        ['Average Price:', tours.length > 0 ? (tours.reduce((sum, t) => sum + t.price, 0) / tours.length) : 0],
        ['Average Rating:', tours.length > 0 ? (tours.reduce((sum, t) => sum + t.rating, 0) / tours.length).toFixed(2) : 0],
        ['Portfolio Value:', tours.reduce((sum, t) => sum + (t.bookings * t.price), 0)]
      ],

      customerAnalysis: [
        ['Booking ID', 'Customer', 'Tour', 'Date', 'Status', 'Amount (PHP)', 'People', 'Contact Phone', 'Contact Email'],
        ...bookings.slice(0, 100).map(booking => [
          booking.id,
          booking.customer,
          booking.tourType,
          booking.date,
          booking.status.toUpperCase(),
          booking.amount,
          booking.number_of_people,
          booking.contact_phone || 'N/A',
          booking.contact_email || booking.profiles?.email || 'N/A'
        ]),
        [''],
        ['BOOKING STATISTICS'],
        ['Total Bookings:', bookings.length],
        ['Confirmed Bookings:', stats?.statusDistribution.confirmed || 0],
        ['Pending Bookings:', stats?.statusDistribution.pending || 0],
        ['Completed Bookings:', stats?.statusDistribution.completed || 0],
        ['Cancelled Bookings:', stats?.statusDistribution.cancelled || 0],
        ['Average Group Size:', bookings.length > 0 ? (bookings.reduce((sum, b) => sum + b.number_of_people, 0) / bookings.length).toFixed(1) : 0],
        ['Total Customers Served:', bookings.reduce((sum, b) => sum + b.number_of_people, 0)]
      ],

      locationAnalysis: [
        ['Rank', 'Location', 'Tour Count', 'Total Bookings', 'Revenue (PHP)', 'Avg Price', 'Market Share'],
        ...stats?.topLocations.map((location, index) => {
          const locationTours = tours.filter(t => t.location === location.name);
          const totalBookings = locationTours.reduce((sum, t) => sum + t.bookings, 0);
          const totalRevenue = locationTours.reduce((sum, t) => sum + (t.bookings * t.price), 0);
          const avgPrice = locationTours.length > 0 ? locationTours.reduce((sum, t) => sum + t.price, 0) / locationTours.length : 0;
          const marketShare = tours.length > 0 ? ((location.count / tours.length) * 100).toFixed(1) + '%' : '0%';
          
          return [
            `#${index + 1}`,
            location.name,
            location.count,
            totalBookings,
            totalRevenue,
            avgPrice,
            marketShare
          ];
        }) || [],
        [''],
        ['LOCATION INSIGHTS'],
        ['Most Popular Location:', stats?.topLocations[0]?.name || 'N/A'],
        ['Highest Revenue Location:', stats?.topLocations[0]?.name || 'N/A'],
        ['Location Diversity Index:', stats?.topLocations ? (stats.topLocations.length / new Set(tours.map(t => t.location)).size * 100).toFixed(1) + '%' : '0%']
      ],

      financialSummary: [
        ['REVENUE BREAKDOWN'],
        ['Metric', 'Amount (PHP)', 'Percentage', 'Target', 'Status'],
        ['Completed Bookings Revenue', (stats?.totalRevenue || 0), '100%', 'Baseline', 'Achieved'],
        ['Regular Tours Revenue', tours.filter(t => t.type === 'regular').reduce((sum, t) => sum + (t.bookings * t.price), 0), 
         tours.length > 0 ? ((tours.filter(t => t.type === 'regular').reduce((sum, t) => sum + (t.bookings * t.price), 0) / tours.reduce((sum, t) => sum + (t.bookings * t.price), 0)) * 100).toFixed(1) + '%' : '0%', 
         '60%', 'On Track'],
        ['Combo Tours Revenue', tours.filter(t => t.type === 'combo').reduce((sum, t) => sum + (t.bookings * t.price), 0), 
         tours.length > 0 ? ((tours.filter(t => t.type === 'combo').reduce((sum, t) => sum + (t.bookings * t.price), 0) / tours.reduce((sum, t) => sum + (t.bookings * t.price), 0)) * 100).toFixed(1) + '%' : '0%', 
         '40%', 'Growing'],
        [''],
        ['PROFITABILITY ANALYSIS'],
        ['Average Revenue per Booking:', avgBookingValue],
        ['Revenue per Customer:', bookings.length > 0 ? ((stats?.totalRevenue || 0) / bookings.reduce((sum, b) => sum + b.number_of_people, 0)) : 0],
        ['Monthly Revenue Target:', ((stats?.totalRevenue || 0) * 1.2 / 6)],
        [''],
        ['COST EFFICIENCY METRICS'],
        ['Tours per Location:', stats?.topLocations ? (tours.length / new Set(tours.map(t => t.location)).size).toFixed(1) : 0],
        ['Capacity Utilization:', `${occupancyRate.toFixed(1)}%`],
        ['Revenue per Available Seat:', tours.reduce((sum, t) => sum + t.max_capacity, 0) > 0 ? ((stats?.totalRevenue || 0) / tours.reduce((sum, t) => sum + t.max_capacity, 0)) : 0]
      ]
    };
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const reportData = generateBusinessReport();
      const timestamp = new Date().toISOString().split('T')[0];
      const workbook = XLSX.utils.book_new();

      // Convert each sheet to an Excel worksheet
      const sheets = [
        { name: 'Executive Summary', data: reportData.executiveSummary },
        { name: 'Monthly Performance', data: reportData.monthlyPerformance },
        { name: 'Tour Portfolio', data: reportData.tourPortfolio },
        { name: 'Customer Analysis', data: reportData.customerAnalysis },
        { name: 'Location Performance', data: reportData.locationAnalysis },
        { name: 'Financial Dashboard', data: reportData.financialSummary }
      ];

      sheets.forEach(sheet => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });

      // Add a chart data sheet for easier chart creation in Excel
      const chartDataSheet = [
        ['Chart Data for Visualizations'],
        [''],
        ['Revenue Performance'],
        ['Month', 'Revenue (PHP)'],
        ...Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          return [
            date.toLocaleString('en-US', { month: 'long' }),
            stats?.monthlyRevenue[i] || 0
          ];
        }),
        [''],
        ['Booking Trends'],
        ['Month', 'Bookings'],
        ...Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          return [
            date.toLocaleString('en-US', { month: 'long' }),
            stats?.monthlyBookings[i] || 0
          ];
        }),
        [''],
        ['Booking Status Distribution'],
        ['Status', 'Count'],
        ['Confirmed', stats?.statusDistribution.confirmed || 0],
        ['Pending', stats?.statusDistribution.pending || 0],
        ['Cancelled', stats?.statusDistribution.cancelled || 0],
        ['Completed', stats?.statusDistribution.completed || 0],
        [''],
        ['Top Performing Locations'],
        ['Location', 'Tour Count', 'Color (for Chart)'],
        ...(stats?.topLocations.map(loc => [loc.name, loc.count, loc.color]) || [])
      ];
      const chartWorksheet = XLSX.utils.aoa_to_sheet(chartDataSheet);
      XLSX.utils.book_append_sheet(workbook, chartWorksheet, 'Chart Data');

      // Export the workbook
      const filename = `business_intelligence_report_${timestamp}.xlsx`;
      if (Platform.OS === 'web') {
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        Alert.alert('Success', `Excel report downloaded as ${filename}. Open in Excel to create charts using the Chart Data sheet.`);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Business Report',
            UTI: 'com.microsoft.excel.xlsx'
          });
          Alert.alert(
            'Success',
            `Excel report generated: ${filename}\n\nIncludes 6 sheets with data and a Chart Data sheet for visualizations.\nOpen in Excel to create charts using the provided data.`
          );
        } else {
          Alert.alert(
            'Report Generated',
            `Excel report saved to: ${fileUri}\n\nIncludes 6 sheets and a Chart Data sheet. Transfer to a computer and open in Excel to create Tableau-style charts.`
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate Excel report.';
      Alert.alert('Export Failed', errorMessage);
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff', color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`, strokeWidth: 3, barPercentage: 0.7, decimalPlaces: 0,
    propsForBackgroundLines: { strokeDasharray: '', stroke: '#e2e8f0', strokeWidth: 1 },
    propsForLabels: { fontSize: 11, fontWeight: '600' }
  };

  const pieData = [
    { name: 'Confirmed', population: stats?.statusDistribution.confirmed || 0, color: '#06d6a0', legendFontColor: '#334155', legendFontSize: 13 },
    { name: 'Pending', population: stats?.statusDistribution.pending || 0, color: '#ffbe0b', legendFontColor: '#334155', legendFontSize: 13 },
    { name: 'Cancelled', population: stats?.statusDistribution.cancelled || 0, color: '#f72585', legendFontColor: '#334155', legendFontSize: 13 },
    { name: 'Completed', population: stats?.statusDistribution.completed || 0, color: '#6366f1', legendFontColor: '#334155', legendFontSize: 13 }
  ].filter(item => item.population > 0);

  const revenueData = {
    labels: Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return date.toLocaleString('en-US', { month: 'short' });
    }).slice(-(stats?.monthlyRevenue.length || 0)),
    datasets: [{ data: stats?.monthlyRevenue || [], color: (opacity = 1) => `rgba(6, 214, 160, ${opacity})`, strokeWidth: 3 }]
  };

  const bookingsBarData = {
    labels: Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return date.toLocaleString('en-US', { month: 'short' });
    }).slice(-(stats?.monthlyBookings.length || 0)),
    datasets: [{ data: stats?.monthlyBookings || [] }]
  };

  if (loading && !refreshing) return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Generating Analytics...</Text>
        <Text style={styles.loadingSubText}>Please wait while we process your data</Text>
      </View>
    </View>
  );

  if (error) return (
    <View style={styles.errorContainer}>
      <View style={styles.errorCard}>
        <MaterialIcons name="analytics" size={48} color="#f72585" />
        <Text style={styles.errorTitle}>Analytics Unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReportsData}>
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryText}>Retry Analysis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReportsData(); }} colors={['#6366f1']} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Business Analytics</Text>
            <Text style={styles.headerSubtitle}>Real-time insights & performance metrics</Text>
          </View>
        </View>

        <View style={styles.kpiSection}>
          <View style={styles.kpiRow}>
            {[
              { icon: 'trending-up', color: '#06d6a0', value: `₱${(stats?.totalRevenue || 0).toLocaleString()}`, label: 'Total Revenue (Completed Bookings)', trend: stats?.revenueTrend, style: styles.primaryKpi },
              { icon: 'event-available', color: '#6366f1', value: stats?.totalBookings || 0, label: 'Total Bookings (Completed)', trend: stats?.bookingsTrend, style: styles.secondaryKpi }
            ].map((kpi, i) => (
              <View key={i} style={[styles.kpiCard, kpi.style]}>
                <MaterialIcons name={kpi.icon} size={28} color={kpi.color} style={styles.kpiIconContainer} />
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                {kpi.trend && (
                  <View style={styles.trendContainer}>
                    <MaterialIcons name={kpi.trend.startsWith('+') ? 'arrow-upward' : 'arrow-downward'} size={14} color={kpi.trend.startsWith('+') ? '#06d6a0' : '#f72585'} />
                    <Text style={[styles.trendText, { color: kpi.trend.startsWith('+') ? '#06d6a0' : '#f72585' }]}>{kpi.trend}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <View style={styles.kpiRow}>
            {[
              { icon: 'tour', color: '#ffbe0b', value: stats?.upcomingTours || 0, label: 'Active Tours' },
              { icon: 'people', color: '#fb8500', value: stats?.activeCustomers || 0, label: 'Customers' }
            ].map((kpi, i) => (
              <View key={i} style={styles.kpiCard}>
                <MaterialIcons name={kpi.icon} size={24} color={kpi.color} style={styles.kpiIconContainer} />
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {[
          { 
            title: 'Revenue Performance', 
            subtitle: 'Monthly revenue from completed bookings', 
            chart: <LineChart data={revenueData} width={width - 60} height={240} chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(6, 214, 160, ${opacity})` }} bezier style={styles.chart} /> 
          },
          { 
            title: 'Booking Trends', 
            subtitle: 'Monthly completed bookings', 
            chart: <BarChart data={bookingsBarData} width={width - 60} height={240} chartConfig={chartConfig} style={styles.chart} showValuesOnTopOfBars yAxisLabel="" yAxisSuffix="" /> 
          },
          {
            title: 'Booking Status', 
            subtitle: 'Current distribution overview',
            chart: pieData.length > 0 ? (
              <PieChart data={pieData} width={width - 60} height={240} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" style={styles.chart} hasLegend />
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="donut-small" size={48} color="#cbd5e1" />
                <Text style={styles.noDataText}>No booking data available</Text>
              </View>
            )
          }
        ].map((section, i) => (
          <View key={i} style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>{section.title}</Text>
              <Text style={styles.chartSubtitle}>{section.subtitle}</Text>
            </View>
            <View style={styles.chartContainer}>{section.chart}</View>
          </View>
        ))}

        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Top Performing Locations</Text>
            <Text style={styles.tableSubtitle}>Tours by destination</Text>
          </View>
          <View style={styles.tableContainer}>
            {stats?.topLocations.length ? stats.topLocations.map((loc, i) => (
              <View key={i} style={styles.locationRow}>
                <View style={styles.locationRank}><Text style={styles.rankText}>#{i + 1}</Text></View>
                <View style={[styles.locationIndicator, { backgroundColor: loc.color }]} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{loc.name}</Text>
                  <Text style={styles.locationSubtext}>{loc.count} tours available</Text>
                </View>
                <View style={styles.locationMetric}>
                  <Text style={styles.locationCount}>{loc.count}</Text>
                  <Text style={styles.locationLabel}>tours</Text>
                </View>
              </View>
            )) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="location-off" size={48} color="#cbd5e1" />
                <Text style={styles.noDataText}>No location data available</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Tour Portfolio</Text>
            <Text style={styles.statsSubtitle}>Comprehensive tour statistics</Text>
          </View>
          <View style={styles.statsGrid}>
            {[
              { icon: 'map', color: '#6366f1', value: tours.filter(t => t.type === 'regular').length, label: 'Regular Tours' },
              { icon: 'layers', color: '#06d6a0', value: tours.filter(t => t.type === 'combo').length, label: 'Combo Packages' },
              { icon: 'place', color: '#f72585', value: new Set(tours.map(t => t.location)).size, label: 'Unique Locations' },
              { icon: 'groups', color: '#ffbe0b', value: tours.reduce((sum, t) => sum + t.max_capacity, 0), label: 'Total Capacity' }
            ].map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <MaterialIcons name={stat.icon} size={32} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.exportSection}>
          <View style={styles.exportHeader}>
            <Text style={styles.exportTitle}>Business Intelligence Export</Text>
            <Text style={styles.exportSubtitle}>Generate multi-sheet Excel report with chart-ready data</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]} 
            onPress={exportToExcel} 
            disabled={exporting}
          >
            <MaterialIcons name={exporting ? 'hourglass-empty' : 'assessment'} size={24} color="#fff" />
            <Text style={styles.exportText}>
              {exporting ? 'Generating Excel Report...' : 'Export Excel Report'}
            </Text>
          </TouchableOpacity>
          
          {exporting && (
            <View style={styles.exportProgress}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.exportProgressText}>Creating Excel report with charts...</Text>
            </View>
          )}
          
          <View style={styles.exportFeatures}>
            <Text style={styles.featuresTitle}>Report Includes:</Text>
            <View style={styles.featuresList}>
              {[
                { icon: 'dashboard', text: 'Executive Summary Dashboard' },
                { icon: 'trending-up', text: 'Monthly Performance Analysis' },
                { icon: 'inventory', text: 'Complete Tour Portfolio Analytics' },
                { icon: 'people', text: 'Customer Booking Intelligence' },
                { icon: 'location-on', text: 'Location Performance Metrics' },
                { icon: 'attach-money', text: 'Financial Performance Dashboard' },
                { icon: 'show-chart', text: 'Chart Data for Visualizations' }
              ].map((feature, i) => (
                <View key={i} style={styles.featureItem}>
                  <MaterialIcons name={feature.icon} size={16} color="#6366f1" />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 40, alignItems: 'center', shadowColor: '#00355F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  loadingText: { fontSize: 18, fontWeight: '600', color: '#00355F', marginTop: 16 },
  loadingSubText: { fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 },
  errorCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#EEC218', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#00355F', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  retryButton: { flexDirection: 'row', backgroundColor: '#00355F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  retryText: { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
  header: { paddingHorizontal: 24, paddingVertical: 24, paddingTop: 60, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#00355F' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  kpiSection: { paddingHorizontal: 20, paddingVertical: 16 },
  kpiRow: { flexDirection: 'row', marginBottom: 16, gap: 16 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#00355F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  primaryKpi: { borderLeftWidth: 4, borderLeftColor: '#EEC218' },
  secondaryKpi: { borderLeftWidth: 4, borderLeftColor: '#00355F' },
  kpiIconContainer: { marginBottom: 12 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#00355F', marginBottom: 4 },
  kpiLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 8 },
  trendContainer: { flexDirection: 'row', alignItems: 'center' },
  trendText: { fontSize: 12, fontWeight: '600', marginLeft: 4, color: '#EEC218' },
  chartSection: { marginHorizontal: 20, marginBottom: 24 },
  chartHeader: { marginBottom: 16 },
  chartTitle: { fontSize: 20, fontWeight: '700', color: '#00355F' },
  chartSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  chartContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#00355F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  chart: { borderRadius: 16 },
  noDataContainer: { alignItems: 'center', paddingVertical: 40 },
  noDataText: { fontSize: 16, color: '#94A3B8', marginTop: 12, fontWeight: '500' },
  tableSection: { marginHorizontal: 20, marginBottom: 24 },
  tableHeader: { marginBottom: 16 },
  tableTitle: { fontSize: 20, fontWeight: '700', color: '#00355F' },
  tableSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  tableContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#00355F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  locationRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rankText: { fontSize: 14, fontWeight: '700', color: '#00355F' },
  locationIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 16, backgroundColor: '#EEC218' },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 16, fontWeight: '600', color: '#00355F' },
  locationSubtext: { fontSize: 13, color: '#64748B', marginTop: 2 },
  locationMetric: { alignItems: 'center' },
  locationCount: { fontSize: 20, fontWeight: '700', color: '#EEC218' },
  locationLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  statsSection: { marginHorizontal: 20, marginBottom: 24 },
  statsHeader: { marginBottom: 16 },
  statsTitle: { fontSize: 20, fontWeight: '700', color: '#00355F' },
  statsSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#00355F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#00355F', marginTop: 12, marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', textAlign: 'center' },
  exportSection: { marginHorizontal: 20, marginBottom: 24, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#00355F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  exportHeader: { marginBottom: 20 },
  exportTitle: { fontSize: 20, fontWeight: '700', color: '#00355F' },
  exportSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  exportButton: { flexDirection: 'row', backgroundColor: '#00355F', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  exportButtonDisabled: { backgroundColor: '#7A8FA5', opacity: 0.7 },
  exportText: { color: '#FFFFFF', fontWeight: '600', marginLeft: 8, fontSize: 16 },
  exportProgress: { flexDirection: 'row', alignItems: 'center', marginTop: 16, justifyContent: 'center' },
  exportProgressText: { color: '#00355F', fontSize: 14, marginLeft: 8 },
  exportFeatures: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  featuresTitle: { fontSize: 16, fontWeight: '600', color: '#00355F', marginBottom: 16 },
  featuresList: { gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
  featureText: { fontSize: 14, color: '#64748B', marginLeft: 12, flex: 1 },
  bottomSpacer: { height: 40 },
});