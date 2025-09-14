// reports.tsx
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Tour {
  id: string;
  created_at: string;
  title: string;
  price: number;
  duration: string;
  image: string;
  type: string;
  location: string;
  description: string;
  rating: number;
  highlights: string[];
  max_capacity: number;
  available: boolean;
}

interface MonthlyData {
  month: string;
  bookings: number;
  revenue: number;
  tours: number;
}

interface SummaryData {
  totalTours: number;
  totalRevenue: number;
  averagePrice: number;
  mostPopularLocation: string;
  averageRating: number;
  availableTours: number;
}

export default function ReportsScreen() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchToursData();
  }, []);

  const fetchToursData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTours(data || []);
      processData(data || []);
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const processData = (toursData: Tour[]) => {
    // Process summary data
    const totalTours = toursData.length;
    const totalRevenue = toursData.reduce((sum, tour) => sum + tour.price, 0);
    const averagePrice = totalTours > 0 ? totalRevenue / totalTours : 0;
    const availableTours = toursData.filter(tour => tour.available).length;
    const averageRating = totalTours > 0 ? 
      toursData.reduce((sum, tour) => sum + (tour.rating || 0), 0) / totalTours : 0;

    // Find most popular location
    const locationCounts: { [key: string]: number } = {};
    toursData.forEach(tour => {
      locationCounts[tour.location] = (locationCounts[tour.location] || 0) + 1;
    });
    const mostPopularLocation = Object.keys(locationCounts).reduce((a, b) => 
      locationCounts[a] > locationCounts[b] ? a : b, 'N/A');

    setSummaryData({
      totalTours,
      totalRevenue,
      averagePrice,
      mostPopularLocation,
      averageRating,
      availableTours,
    });

    // Process monthly data based on created_at
    const monthlyStats: { [key: string]: { tours: number, revenue: number } } = {};
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Initialize all months
    months.forEach(month => {
      monthlyStats[month] = { tours: 0, revenue: 0 };
    });

    // Process tours by month
    toursData.forEach(tour => {
      const date = new Date(tour.created_at);
      const monthName = months[date.getMonth()];
      monthlyStats[monthName].tours += 1;
      monthlyStats[monthName].revenue += tour.price;
    });

    const processedMonthlyData = months.map(month => ({
      month,
      bookings: monthlyStats[month].tours, // Using tours as bookings for chart compatibility
      revenue: monthlyStats[month].revenue,
      tours: monthlyStats[month].tours,
    }));

    setMonthlyData(processedMonthlyData);
  };

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toLocaleString()}`;
  };

  const SummaryCard = ({ title, value, icon }: { title: string; value: string; icon: string }) => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );

  const BarChart = () => {
    const maxBookings = Math.max(...monthlyData.map(data => data.tours), 1);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Tours Created</Text>
        <View style={styles.chart}>
          {monthlyData.map((data, index) => {
            const barHeight = (data.tours / maxBookings) * 120; // Max height of 120
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: barHeight }]} />
                  <Text style={styles.barValue}>{data.tours}</Text>
                </View>
                <Text style={styles.barLabel}>{data.month.slice(0, 3)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const MonthlyDataTable = () => (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>Monthly Breakdown</Text>
      
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.monthColumn]}>Month</Text>
        <Text style={[styles.tableHeaderText, styles.bookingsColumn]}>Tours</Text>
        <Text style={[styles.tableHeaderText, styles.revenueColumn]}>Total Value</Text>
      </View>

      {/* Table Rows */}
      {monthlyData.map((data, index) => (
        <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
          <Text style={[styles.tableCellText, styles.monthColumn]}>{data.month}</Text>
          <Text style={[styles.tableCellText, styles.bookingsColumn]}>{data.tours}</Text>
          <Text style={[styles.tableCellText, styles.revenueColumn]}>
            {formatCurrency(data.revenue)}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00355f" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!summaryData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.description}>
            View tours, pricing, and performance analytics from your database.
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <SummaryCard
            title="Total Tours"
            value={summaryData.totalTours.toLocaleString()}
            icon="🏝️"
          />
          <SummaryCard
            title="Available Tours"
            value={summaryData.availableTours.toLocaleString()}
            icon="✅"
          />
        </View>

        <View style={styles.summaryContainer}>
          <SummaryCard
            title="Average Price"
            value={formatCurrency(summaryData.averagePrice)}
            icon="💰"
          />
          <SummaryCard
            title="Avg Rating"
            value={summaryData.averageRating.toFixed(1)}
            icon="⭐"
          />
        </View>

        <View style={styles.summaryContainer}>
          <SummaryCard
            title="Popular Location"
            value={summaryData.mostPopularLocation}
            icon="📍"
          />
          <SummaryCard
            title="Total Value"
            value={formatCurrency(summaryData.totalRevenue)}
            icon="💎"
          />
        </View>

        {/* Bar Chart */}
        <BarChart />

        {/* Monthly Data Table */}
        <MonthlyDataTable />

        {/* Tours Summary */}
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>Tours by Type & Location</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}> Tours</Text>
              <Text style={styles.statValue}>
                {tours.filter(t => t.type === 'regular').length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Combo Tours</Text>
              <Text style={styles.statValue}>
                {tours.filter(t => t.type === 'combo').length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Unique Locations</Text>
              <Text style={styles.statValue}>
                {new Set(tours.map(t => t.location)).size}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Capacity</Text>
              <Text style={styles.statValue}>
                {tours.reduce((sum, t) => sum + (t.max_capacity || 0), 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#00355f',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: '#00355f',
  },
  summaryTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00355f',
    textAlign: 'center',
  },

  // Bar Chart
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00355f',
    marginBottom: 20,
    textAlign: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingBottom: 30,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 140,
  },
  bar: {
    backgroundColor: '#eec218',
    width: 20,
    borderRadius: 4,
    marginBottom: 4,
  },
  barValue: {
    fontSize: 10,
    color: '#00355f',
    fontWeight: '500',
  },
  barLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 8,
    transform: [{ rotate: '-45deg' }],
  },

  // Table
  tableContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00355f',
    padding: 20,
    paddingBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#6b7280',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00355f',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCellText: {
    fontSize: 14,
    color: '#6b7280',
  },
  monthColumn: {
    flex: 2,
  },
  bookingsColumn: {
    flex: 1.5,
    textAlign: 'center',
  },
  revenueColumn: {
    flex: 2,
    textAlign: 'right',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 0,
  },
  statItem: {
    width: '50%',
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#eec218',
  },

  bottomSpacer: {
    height: 20,
  },
});
