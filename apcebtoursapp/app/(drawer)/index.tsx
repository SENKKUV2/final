import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';



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
};

type DashboardStats = {
    totalBookings: number;
    totalRevenue: number;
    upcomingTours: number;
    activeCustomers: number;
    bookingsTrend: string;
    revenueTrend: string;
    toursTrend: string;
    customersTrend: string;
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
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [isViewModalVisible, setViewModalVisible] = useState(false);
    const [currentTour, setCurrentTour] = useState<Tour | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchStats(),
                fetchPendingBookings(),
                fetchTours(),
                fetchComboPackages()
            ]);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchStats = async () => {
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                id,
                total_price,
                created_at,
                status,
                user_id,
                booking_date
            `);

        if (bookingsError) throw bookingsError;

        const { data: toursData, error: toursError } = await supabase
            .from('tours')
            .select('id, available, created_at');

        if (toursError) throw toursError;

        const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, created_at');

        if (usersError) throw usersError;

        const totalBookings = bookingsData?.length || 0;
        const totalRevenue = bookingsData?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;
        const upcomingTours = toursData?.filter(tour => tour.available)?.length || 0;
        const activeCustomers = usersData?.length || 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const currentMonthBookings = bookingsData?.filter(booking => {
            const bookingDate = new Date(booking.created_at);
            return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
        }) || [];

        const previousMonthBookings = bookingsData?.filter(booking => {
            const bookingDate = new Date(booking.created_at);
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            return bookingDate.getMonth() === prevMonth && bookingDate.getFullYear() === prevYear;
        }) || [];

        const bookingsTrend = calculateTrend(currentMonthBookings.length, previousMonthBookings.length);
        const currentRevenue = currentMonthBookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
        const previousRevenue = previousMonthBookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
        const revenueTrend = calculateTrend(currentRevenue, previousRevenue);

        setStats({
            totalBookings,
            totalRevenue,
            upcomingTours,
            activeCustomers,
            bookingsTrend,
            revenueTrend,
            toursTrend: '+3',
            customersTrend: '+15%',
        });
    };

    const calculateTrend = (current: number, previous: number): string => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const percentage = ((current - previous) / previous * 100).toFixed(0);
        return `${percentage >= 0 ? '+' : ''}${percentage}%`;
    };

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
                profiles(full_name, email),
                tours!bookings_tour_id_fkey(title, type)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const formattedBookings: Booking[] = (data || []).map(booking => ({
            id: booking.id,
            customer: booking?.profiles?.full_name || booking?.profiles?.email || 'Unknown Customer',
            date: booking.booking_date,
            status: booking.status,
            tourType: booking.tours?.title || 'Unknown Tour',
            amount: `₱${booking.total_price?.toLocaleString()}`,
            contact_phone: booking.contact_phone,
            contact_email: booking.contact_email,
            number_of_people: booking.number_of_people,
            special_requests: booking.special_requests,
        }));

        setPendingBookings(formattedBookings);
    };

    const fetchTours = async () => {
        const { data, error } = await supabase
            .from('tours')
            .select(`
                id,
                title,
                price,
                duration,
                image,
                rating,
                type,
                location,
                available,
                max_capacity,
                bookings(id)
            `)
            .eq('type', 'regular')
            .eq('available', true)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        const formattedTours: Tour[] = (data || []).map(tour => ({
            id: tour.id,
            title: tour.title,
            price: `₱${tour.price?.toLocaleString()}`,
            duration: tour.duration,
            image: tour.image,
            rating: tour.rating || 4.5,
            type: tour.type,
            location: tour.location,
            available: tour.available,
            max_capacity: tour.max_capacity || 20,
            bookings: tour.bookings?.length || 0,
        }));

        setTours(formattedTours);
    };

    const fetchComboPackages = async () => {
        const { data, error } = await supabase
            .from('tours')
            .select(`
                id,
                title,
                price,
                duration,
                image,
                rating,
                type,
                location,
                available,
                max_capacity,
                bookings(id)
            `)
            .eq('type', 'combo')
            .eq('available', true)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        const formattedComboPackages: Tour[] = (data || []).map(tour => ({
            id: tour.id,
            title: tour.title,
            price: `₱${tour.price?.toLocaleString()}`,
            duration: tour.duration,
            image: tour.image,
            rating: tour.rating || 4.5,
            type: tour.type,
            location: tour.location,
            available: tour.available,
            max_capacity: tour.max_capacity || 20,
            bookings: tour.bookings?.length || 0,
        }));

        setComboPackages(formattedComboPackages);
    };

    const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled') => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: action })
                .eq('id', bookingId);

            if (error) throw error;

            await fetchPendingBookings();
            await fetchStats();
        } catch (err) {
            console.error(`Error ${action} booking:`, err);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return '#FF9800';
            case 'confirmed': return '#4CAF50';
            case 'cancelled': return '#f44336';
            case 'completed': return '#2196F3';
            default: return '#666';
        }
    };

    const handleEditPress = (tour: Tour) => {
        setCurrentTour(tour);
        setSelectedImage(null);
        setEditModalVisible(true);
    };
    
    const handleViewPress = (tour: Tour) => {
        setCurrentTour(tour);
        setViewModalVisible(true);
    };

    const handlePickImage = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Permission to access the media library is needed to upload images.');
                return;
            }
        }
    
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
    
        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };
    
    const uploadImage = async (uri: string) => {
        try {
            setUploading(true);
    
            const fileName = `${uuidv4()}.jpg`;
    
            const response = await fetch(uri);
            const blob = await response.blob();
    
            const { data, error } = await supabase
                .storage
                .from('tours')
                .upload(fileName, blob, {
                    cacheControl: '3600',
                    upsert: false
                });
    
            if (error) {
                throw error;
            }
    
            const { data: publicUrlData } = supabase
                .storage
                .from('tours')
                .getPublicUrl(fileName);
    
            return publicUrlData.publicUrl;
        } catch (err) {
            console.error('Error uploading image:', err);
            Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
            return null;
        } finally {
            setUploading(false);
        }
    };
    
    const handleSave = async () => {
        if (!currentTour) return;

        if (!currentTour.title || !currentTour.price || !currentTour.duration) {
            Alert.alert('Error', 'Please fill in all required fields.');
            return;
        }
        
        setUploading(true);
    
        try {
            let newImageUrl = currentTour.image;
    
            if (selectedImage) {
                newImageUrl = await uploadImage(selectedImage);
                if (!newImageUrl) {
                    return;
                }
            }
    
            const priceForDb = parseFloat(currentTour.price.replace('₱', '').replace(/,/g, ''));
            const { data, error } = await supabase
                .from('tours')
                .update({ 
                    title: currentTour.title,
                    price: priceForDb,
                    duration: currentTour.duration,
                    image: newImageUrl,
                    rating: currentTour.rating,
                    location: currentTour.location,
                    max_capacity: currentTour.max_capacity,
                    type: currentTour.type
                })
                .eq('id', currentTour.id)
                .select();
    
            if (error) {
                throw error;
            }
    
            console.log('Tour updated successfully:', data);
            setEditModalVisible(false);
            setSelectedImage(null);
            await fetchTours();
            await fetchComboPackages();
            Alert.alert('Success', 'Tour updated successfully!');
        } catch (err) {
            console.error('Error updating tour:', err);
            Alert.alert('Error', 'Failed to update tour. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const EditTourModal = () => {
        if (!currentTour) return null;

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={isEditModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={modalStyles.centeredView}>
                    <View style={modalStyles.modalView}>
                        <Text style={modalStyles.modalTitle}>Edit Tour</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={modalStyles.label}>Tour Image</Text>
                            <View style={modalStyles.imagePickerContainer}>
                                <Image 
                                    source={{ uri: selectedImage || currentTour.image }} 
                                    style={modalStyles.tourImage} 
                                />
                                <TouchableOpacity 
                                    style={modalStyles.changeImageButton} 
                                    onPress={handlePickImage}
                                >
                                    <Text style={modalStyles.changeImageText}>Change Image</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={modalStyles.label}>Tour Title</Text>
                            <TextInput
                                style={modalStyles.input}
                                value={currentTour.title}
                                onChangeText={(text) => setCurrentTour({ ...currentTour, title: text })}
                            />

                            <Text style={modalStyles.label}>Price</Text>
                            <TextInput
                                style={modalStyles.input}
                                value={currentTour.price}
                                onChangeText={(text) => setCurrentTour({ ...currentTour, price: text })}
                                keyboardType="numeric"
                            />

                            <Text style={modalStyles.label}>Duration</Text>
                            <TextInput
                                style={modalStyles.input}
                                value={currentTour.duration}
                                onChangeText={(text) => setCurrentTour({ ...currentTour, duration: text })}
                            />

                            <Text style={modalStyles.label}>Location</Text>
                            <TextInput
                                style={modalStyles.input}
                                value={currentTour.location}
                                onChangeText={(text) => setCurrentTour({ ...currentTour, location: text })}
                            />
                        </ScrollView>
                        
                        <View style={modalStyles.buttonContainer}>
                            <TouchableOpacity
                                style={[modalStyles.button, modalStyles.cancelButton]}
                                onPress={() => {
                                    setEditModalVisible(false);
                                    setSelectedImage(null);
                                }}
                            >
                                <Text style={modalStyles.textStyle}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[modalStyles.button, modalStyles.saveButton]}
                                onPress={handleSave}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={modalStyles.textStyle}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const ViewTourModal = () => {
        if (!currentTour) return null;

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={isViewModalVisible}
                onRequestClose={() => setViewModalVisible(false)}
            >
                <View style={modalStyles.centeredView}>
                    <View style={modalStyles.modalView}>
                        <Text style={modalStyles.modalTitle}>Tour Details</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={modalStyles.imageContainer}>
                                <Image 
                                    source={{ uri: currentTour.image }} 
                                    style={modalStyles.tourImage} 
                                />
                            </View>

                            <Text style={modalStyles.label}>Tour Title</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.title}
                                editable={false}
                            />

                            <Text style={modalStyles.label}>Price</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.price}
                                editable={false}
                            />

                            <Text style={modalStyles.label}>Duration</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.duration}
                                editable={false}
                            />

                            <Text style={modalStyles.label}>Location</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.location}
                                editable={false}
                            />
                            
                            <Text style={modalStyles.label}>Bookings</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.bookings.toString()}
                                editable={false}
                            />
                            
                            <Text style={modalStyles.label}>Rating</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.rating.toString()}
                                editable={false}
                            />

                            <Text style={modalStyles.label}>Max Capacity</Text>
                            <TextInput
                                style={modalStyles.staticInput}
                                value={currentTour.max_capacity.toString()}
                                editable={false}
                            />
                        </ScrollView>
                        
                        <View style={modalStyles.buttonContainer}>
                            <TouchableOpacity
                                style={[modalStyles.button, modalStyles.closeButton]}
                                onPress={() => setViewModalVisible(false)}
                            >
                                <Text style={modalStyles.textStyle}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#f57c00" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
                    <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statsCards = [
        {
            label: "Total Bookings",
            value: stats?.totalBookings?.toString() || "0",
            icon: "book-online",
            color: "#4CAF50",
            trend: stats?.bookingsTrend || "0%",
            subtitle: "This month"
        },
        {
            label: "Total Revenue",
            value: `₱${stats?.totalRevenue?.toLocaleString() || '0'}`,
            icon: "attach-money",
            color: "#f57c00",
            trend: stats?.revenueTrend || "0%",
            subtitle: "This month"
        },
        {
            label: "Available Tours",
            value: stats?.upcomingTours?.toString() || "0",
            icon: "tour",
            color: "#2196F3",
            trend: stats?.toursTrend || "0%",
            subtitle: "Active"
        },
        {
            label: "Registered Users",
            value: stats?.activeCustomers?.toString() || "0",
            icon: "people",
            color: "#9C27B0",
            trend: stats?.customersTrend || "0%",
            subtitle: "Total"
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Admin Dashboard</Text>
                        <Text style={styles.headerSubtitle}>Manage your tour business efficiently</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}>
                        <MaterialIcons name="notifications-outline" size={24} color="#f57c00" />
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>{pendingBookings.length}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                    {statsCards.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: `${stat.color}15` }]}>
                                    <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
                                </View>
                                <View style={styles.trendContainer}>
                                    <MaterialIcons
                                        name={stat.trend.startsWith('+') ? "trending-up" : "trending-down"}
                                        size={16}
                                        color={stat.trend.startsWith('+') ? "#4CAF50" : "#f44336"}
                                    />
                                    <Text style={[styles.trendText, { color: stat.trend.startsWith('+') ? "#4CAF50" : "#f44336" }]}>
                                        {stat.trend}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                            <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/manage-tours')}
                        >
                            <MaterialIcons name="add-circle-outline" size={32} color="#f57c00" />
                            <Text style={styles.quickActionText}>Add Tour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/bookings')}
                        >
                            <MaterialIcons name="book-online" size={32} color="#4CAF50" />
                            <Text style={styles.quickActionText}>View Booking</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/reports')}
                        >
                            <MaterialIcons name="assessment" size={32} color="#2196F3" />
                            <Text style={styles.quickActionText}>View Reports</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/settings')}
                        >
                            <MaterialIcons name="settings" size={32} color="#9C27B0" />
                            <Text style={styles.quickActionText}>Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pending Bookings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Pending Bookings</Text>
                        <TouchableOpacity onPress={() => router.push('/bookings')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {pendingBookings.length > 0 ? (
                        pendingBookings.map((booking) => (
                            <View key={booking.id} style={styles.bookingCard}>
                                <View style={styles.bookingLeft}>
                                    <View style={styles.bookingHeader}>
                                        <Text style={styles.bookingId}>#{booking.id.slice(0, 8)}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                                                {booking.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.customerName}>{booking.customer}</Text>
                                    <Text style={styles.tourType}>{booking.tourType}</Text>
                                    <View style={styles.bookingInfo}>
                                        <MaterialIcons name="calendar-today" size={14} color="#666" />
                                        <Text style={styles.bookingDate}>{formatDate(booking.date)}</Text>
                                        <MaterialIcons name="attach-money" size={14} color="#666" style={{ marginLeft: 10 }} />
                                        <Text style={styles.bookingAmount}>{booking.amount}</Text>
                                        <MaterialIcons name="people" size={14} color="#666" style={{ marginLeft: 10 }} />
                                        <Text style={styles.bookingAmount}>{booking.number_of_people}</Text>
                                    </View>
                                </View>
                                <View style={styles.bookingActions}>
                                    <TouchableOpacity 
                                        style={[styles.actionButton, styles.approveButton]}
                                        onPress={() => handleBookingAction(booking.id, 'confirmed')}
                                    >
                                        <MaterialIcons name="check" size={16} color="#fff" />
                                        <Text style={styles.actionText}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionButton, styles.rejectButton]}
                                        onPress={() => handleBookingAction(booking.id, 'cancelled')}
                                    >
                                        <MaterialIcons name="close" size={16} color="#fff" />
                                        <Text style={styles.actionText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noDataCard}>
                            <MaterialIcons name="event-available" size={48} color="#ccc" />
                            <Text style={styles.noDataText}>No pending bookings</Text>
                            <Text style={styles.noDataSubtext}>All bookings are up to date!</Text>
                        </View>
                    )}
                </View>

                {/* Manage Tours */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Regular Tours</Text>
                        <TouchableOpacity onPress={() => router.push('/manage-tours')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {tours.length > 0 ? (
                        tours.map((tour) => (
                            <View key={tour.id} style={styles.manageCard}>
                                <Image source={{ uri: tour.image }} style={styles.manageImage} />
                                <View style={styles.manageContent}>
                                    <View style={styles.manageHeader}>
                                        <Text style={styles.manageTitle}>{tour.title}</Text>
                                        <View style={styles.ratingContainer}>
                                            <MaterialIcons name="star" size={16} color="#FFD700" />
                                            <Text style={styles.ratingText}>{tour.rating}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.managePrice}>{tour.price}</Text>
                                    <View style={styles.manageInfo}>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="access-time" size={14} color="#666" />
                                            <Text style={styles.infoText}>{tour.duration}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="people" size={14} color="#666" />
                                            <Text style={styles.infoText}>{tour.bookings} bookings</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="location-on" size={14} color="#666" />
                                            <Text style={styles.infoText}>{tour.location}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoText}>{tour.type.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.manageActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.viewButton]}
                                            onPress={() => handleViewPress(tour)}
                                        >
                                            <MaterialIcons name="visibility" size={16} color="#fff" />
                                            <Text style={styles.actionText}>View</Text>
                                        </TouchableOpacity>
                                    
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noDataCard}>
                            <MaterialIcons name="event-busy" size={48} color="#ccc" />
                            <Text style={styles.noDataText}>No regular tours found</Text>
                            <Text style={styles.noDataSubtext}>Add new tours to manage them here!</Text>
                        </View>
                    )}
                </View>

                {/* Manage Combo Packages */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Combo Packages</Text>
                        <TouchableOpacity onPress={() => router.push('/manage-tours')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {comboPackages.length > 0 ? (
                        comboPackages.map((tour) => (
                            <View key={tour.id} style={styles.manageCard}>
                                <Image source={{ uri: tour.image }} style={styles.manageImage} />
                                <View style={styles.manageContent}>
                                    <View style={styles.manageHeader}>
                                        <Text style={styles.manageTitle}>{tour.title}</Text>
                                        <View style={styles.ratingContainer}>
                                            <MaterialIcons name="star" size={16} color="#FFD700" />
                                            <Text style={styles.ratingText}>{tour.rating}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.managePrice}>{tour.price}</Text>
                                    <View style={styles.manageInfo}>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="access-time" size={14} color="#666" />
                                            <Text style={styles.infoText}>{tour.duration}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="people" size={14} color="#666" />
                                            <Text style={styles.infoText}>{tour.bookings} bookings</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="location-on" size={14} color="#666" />
                                            <Text style={styles.infoText}>{tour.location}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoText}>{tour.type.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.manageActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.viewButton]}
                                            onPress={() => handleViewPress(tour)}
                                        >
                                            <MaterialIcons name="visibility" size={16} color="#fff" />
                                            <Text style={styles.actionText}>View</Text>
                                        </TouchableOpacity>
                                        
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noDataCard}>
                            <MaterialIcons name="event-busy" size={48} color="#ccc" />
                            <Text style={styles.noDataText}>No combo packages found</Text>
                            <Text style={styles.noDataSubtext}>Add new packages to manage them here!</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
            <EditTourModal />
            <ViewTourModal />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 20,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#f44336',
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#f57c00',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    notificationButton: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#f44336',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        width: '48%',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 8,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendText: {
        marginLeft: 4,
        fontWeight: 'bold',
        fontSize: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    statSubtitle: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 2,
    },
    quickActions: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    quickActionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        width: '48%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    quickActionText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    viewAllText: {
        color: '#f57c00',
        fontWeight: 'bold',
    },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bookingLeft: {
        flex: 1,
        marginRight: 10,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bookingId: {
        fontSize: 12,
        color: '#888',
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 5,
    },
    tourType: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    bookingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    bookingDate: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    bookingAmount: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    bookingActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#f44336',
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: 'bold',
    },
    noDataCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    noDataText: {
        fontSize: 16,
        color: '#888',
        marginTop: 10,
        fontWeight: 'bold',
    },
    noDataSubtext: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 4,
    },
    manageCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    manageImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    manageContent: {
        padding: 15,
    },
    manageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    manageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flexShrink: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD70030',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    ratingText: {
        fontSize: 12,
        color: '#333',
        marginLeft: 4,
        fontWeight: 'bold',
    },
    managePrice: {
        fontSize: 16,
        color: '#f57c00',
        fontWeight: 'bold',
        marginTop: 5,
    },
    manageInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
        marginBottom: 5,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    manageActions: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 8,
    },
    editButton: {
        backgroundColor: '#2196F3',
    },
    viewButton: {
        backgroundColor: '#666',
    }
});

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: '75%', // Limit height to make it scrollable
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 13,
        color: '#666',
        marginTop: 8,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f9f9f9',
    },
    staticInput: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#f9f9f9',
    },
    imagePickerContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    tourImage: {
        width: '100%',
        height: 120, // Smaller image height
        borderRadius: 8,
        resizeMode: 'cover',
    },
    changeImageButton: {
        marginTop: 8,
        padding: 7,
        backgroundColor: '#f57c00',
        borderRadius: 8,
    },
    changeImageText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },
    button: {
        borderRadius: 8,
        padding: 10,
        elevation: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    cancelButton: {
        backgroundColor: '#f44336',
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        marginLeft: 8,
    },
    closeButton: {
        backgroundColor: '#666',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
    },
});