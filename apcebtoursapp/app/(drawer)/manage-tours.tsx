// manage-tours.tsx
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Tour {
  id: string;
  title: string;
  price: number;
  duration: string;
  image: string;
  type: 'regular' | 'combo';
  location: string;
  created_at?: string;
}

type TabType = 'all' | 'regular' | 'combo';

interface TourFormData {
  title: string;
  price: string;
  duration: string;
  image: string;
  type: 'regular' | 'combo';
  location: string;
}

export default function ManageToursScreen(): React.JSX.Element {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<TourFormData>({
    title: '',
    price: '',
    duration: '',
    image: '',
    type: 'regular',
    location: '',
  });

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      setTours(data as Tour[]);
    } catch (error) {
      console.error('Error fetching tours:', error);
      Alert.alert('Error', 'Failed to fetch tours. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  // Filter tours based on search and active tab
  const filteredTours = tours.filter((tour: Tour) => {
    const matchesSearch =
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.id.includes(searchQuery) ||
      tour.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'regular' && tour.type === 'regular') ||
      (activeTab === 'combo' && tour.type === 'combo');

    return matchesSearch && matchesTab;
  });

  // Count tours by type for badges
  const tourCounts = {
    all: tours.length,
    regular: tours.filter((tour: Tour) => tour.type === 'regular').length,
    combo: tours.filter((tour: Tour) => tour.type === 'combo').length,
  };

  const resetForm = () => {
    setFormData({
      title: '',
      price: '',
      duration: '',
      image: '',
      type: 'regular',
      location: '',
    });
    setEditingTour(null);
  };

  const handleDeleteTour = async (tourId: string, tourTitle: string) => {
    Alert.alert(
      'Delete Tour',
      `Are you sure you want to delete "${tourTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('tours')
                .delete()
                .eq('id', tourId);
                
              if (error) {
                throw error;
              }
              
              setTours(currentTours => currentTours.filter(tour => tour.id !== tourId));
              Alert.alert('Success', `${tourTitle} has been deleted.`);
            } catch (error) {
              console.error('Error deleting tour:', error);
              Alert.alert('Error', 'Failed to delete tour. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleEditTour = (tour: Tour): void => {
    setEditingTour(tour);
    setFormData({
      title: tour.title,
      price: tour.price.toString(),
      duration: tour.duration,
      image: tour.image,
      type: tour.type,
      location: tour.location,
    });
    setModalVisible(true);
  };

  const handleAddTour = (): void => {
    resetForm();
    setModalVisible(true);
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
     const response = await fetch(uri);
const arrayBuffer = await response.arrayBuffer();
const fileExt = uri.split('.').pop();
const fileName = `${Date.now()}.${fileExt}`;
const filePath = `tour-images/${fileName}`;

      const { data, error } = await supabase.storage
  .from('tours')
  .upload(filePath, arrayBuffer, {
    contentType: `image/${fileExt}`,
    upsert: false,
  });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tours')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUploading(true);
        try {
          const imageUrl = await uploadImage(result.assets[0].uri);
          setFormData(prev => ({ ...prev, image: imageUrl }));
        } catch (error) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setImageUploading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a tour title.');
      return false;
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price.');
      return false;
    }
    if (!formData.duration.trim()) {
      Alert.alert('Validation Error', 'Please enter tour duration.');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Validation Error', 'Please enter tour location.');
      return false;
    }
    if (!formData.image) {
      Alert.alert('Validation Error', 'Please upload a tour image.');
      return false;
    }
    return true;
  };

  const handleSaveTour = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const tourData = {
        title: formData.title.trim(),
        price: parseInt(formData.price),
        duration: formData.duration.trim(),
        image: formData.image,
        type: formData.type,
        location: formData.location.trim(),
      };

      if (editingTour) {
        // Update existing tour
        const { data, error } = await supabase
          .from('tours')
          .update(tourData)
          .eq('id', editingTour.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setTours(currentTours =>
          currentTours.map(tour =>
            tour.id === editingTour.id ? { ...data } : tour
          )
        );

        Alert.alert('Success', 'Tour updated successfully!');
      } else {
        // Create new tour
        const { data, error } = await supabase
          .from('tours')
          .insert([tourData])
          .select()
          .single();

        if (error) {
          throw error;
        }

        setTours(currentTours => [data, ...currentTours]);
        Alert.alert('Success', 'Tour created successfully!');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tour:', error);
      Alert.alert('Error', 'Failed to save tour. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const renderTourItem = (tour: Tour): React.JSX.Element => (
    <View key={tour.id} style={styles.tourCard}>
      <Image source={{ uri: tour.image }} style={styles.tourImage} />
      <View style={styles.tourInfo}>
        <Text style={styles.tourTitle}>{tour.title}</Text>
        <Text style={styles.tourLocation}>📍 {tour.location}</Text>
        <View style={styles.tourDetails}>
          <Text style={styles.tourPrice}>₱{tour.price.toLocaleString()}</Text>
          <View style={styles.tourMeta}>
            <Text style={styles.tourDuration}>{tour.duration}</Text>
            <View style={[styles.typeTag, tour.type === 'combo' && styles.comboTag]}>
              <Text style={[styles.typeText, tour.type === 'combo' && styles.comboText]}>
                {tour.type.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditTour(tour)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteTour(tour.id, tour.title)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTour ? 'Edit Tour' : 'Add New Tour'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tour Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter tour title"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Price (₱)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                value={formData.price}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Duration</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Half Day, Full Day, 2 Days"
                value={formData.duration}
                onChangeText={(text) => setFormData(prev => ({ ...prev, duration: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter tour location"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tour Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    formData.type === 'regular' && styles.activeTypeOption,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: 'regular' }))}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      formData.type === 'regular' && styles.activeTypeOptionText,
                    ]}
                  >
                    Regular
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    formData.type === 'combo' && styles.activeTypeOption,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: 'combo' }))}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      formData.type === 'combo' && styles.activeTypeOptionText,
                    ]}
                  >
                    Combo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tour Image</Text>
              <TouchableOpacity
                style={styles.imageUpload}
                onPress={pickImage}
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <ActivityIndicator size="large" color="#00355f" />
                ) : formData.image ? (
                  <>
                    <Image source={{ uri: formData.image }} style={styles.previewImage} />
                    <Text style={styles.changeImageText}>Tap to change image</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.uploadText}>📷</Text>
                    <Text style={styles.uploadSubText}>Tap to upload image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTour}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingTour ? 'Update Tour' : 'Create Tour'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Tours</Text>
        <Text style={styles.description}>
          Add, edit, or remove available tours. Update tour prices, descriptions, and highlights here.
        </Text>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tour name, ID, or location..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'all' && styles.activeTabText,
              ]}
            >
              All
            </Text>
            <View
              style={[styles.badge, activeTab === 'all' && styles.activeBadge]}
            >
              <Text
                style={[
                  styles.badgeText,
                  activeTab === 'all' && styles.activeBadgeText,
                ]}
              >
                {tourCounts.all}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'regular' && styles.activeTab]}
            onPress={() => setActiveTab('regular')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'regular' && styles.activeTabText,
              ]}
            >
              Regular Packages
            </Text>
            <View
              style={[
                styles.badge,
                activeTab === 'regular' && styles.activeBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  activeTab === 'regular' && styles.activeBadgeText,
                ]}
              >
                {tourCounts.regular}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'combo' && styles.activeTab]}
            onPress={() => setActiveTab('combo')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'combo' && styles.activeTabText,
              ]}
            >
              Combo Packages
            </Text>
            <View
              style={[
                styles.badge,
                activeTab === 'combo' && styles.activeBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  activeTab === 'combo' && styles.activeBadgeText,
                ]}
              >
                {tourCounts.combo}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#00355f" style={{ marginTop: 50 }} />
        ) : filteredTours.length > 0 ? (
          <View style={styles.toursList}>{filteredTours.map(renderTourItem)}</View>
        ) : (
          <Text style={styles.noToursText}>No tours found. Try adjusting your search.</Text>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={handleAddTour}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      {renderModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  },
  scrollView: {
    flex: 1,
  },
  toursList: {
    paddingHorizontal: 20,
  },
  tourCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tourImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f9fafb',
  },
  tourInfo: {
    padding: 16,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00355f',
    marginBottom: 4,
  },
  tourLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tourDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tourPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#eec218',
  },
  tourMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  tourDuration: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTag: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comboTag: {
    backgroundColor: '#fff8e0',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00355f',
  },
  comboText: {
    color: '#eec218',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#f9fafb',
    borderRightWidth: 0.5,
    borderRightColor: '#f9fafb',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  editButtonText: {
    color: '#00355f',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontWeight: '600',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00355f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#00355f',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 20,
    gap: 6,
    minHeight: 44,
  },
  activeTab: {
    backgroundColor: '#00355f',
    shadowColor: '#00355f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    flexShrink: 1,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f9fafb',
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'transparent',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#eec218',
  },
  activeBadgeText: {
    color: '#ffffff',
  },
  noToursText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#6b7280',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00355f',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  formGroup: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00355f',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#00355f',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  activeTypeOption: {
    backgroundColor: '#00355f',
    borderColor: '#00355f',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTypeOptionText: {
    color: '#ffffff',
  },
  imageUpload: {
    borderWidth: 2,
    borderColor: '#6b7280',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    minHeight: 150,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  changeImageText: {
    color: '#00355f',
    fontWeight: '500',
  },
  uploadText: {
    fontSize: 30,
    marginBottom: 8,
  },
  uploadSubText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f9fafb',
  },
  saveButton: {
    backgroundColor: '#00355f',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
