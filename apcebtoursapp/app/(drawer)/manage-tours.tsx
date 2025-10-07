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
  FlatList,
  type KeyboardTypeOptions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface Tour {
  id: string;
  title: string;
  price: number;
  duration: string;
  image: string;
  type: 'regular' | 'combo';
  location: string;
  sub_images?: string[];
  features?: { text: string; available: boolean }[];
}

type TabType = 'all' | 'regular' | 'combo';

interface TourFormData {
  title: string;
  price: string;
  duration: string;
  image: string;
  type: 'regular' | 'combo';
  location: string;
  sub_images: string[];
  features: { text: string; available: boolean }[];
}

const durationOptions = ['Half Day', 'Whole Day', 'Two Days', 'Three Days'];

export default function ManageToursScreen() {
  const router = useRouter();
  const { tourId, search } = useLocalSearchParams();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(decodeURIComponent((search as string) || ''));
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<{ id: string; title: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [formData, setFormData] = useState<TourFormData>({
    title: '',
    price: '',
    duration: '',
    image: '',
    type: 'regular',
    location: '',
    sub_images: [],
    features: [],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tours').select('*, features').order('created_at', { ascending: false });
      if (error) throw error;
      setTours(data as Tour[]);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch tours.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTourById = async (id: string) => {
    const { data, error } = await supabase
      .from('tours')
      .select('*, features')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tour by ID:', error.message);
      Alert.alert('Error', 'Failed to fetch tour details.');
      return null;
    }
    return data as Tour;
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchTours();
      if (tourId && typeof tourId === 'string') {
        const tour = await fetchTourById(tourId);
        if (tour) {
          setSearchQuery(tour.title);
          setActiveTab('all');
        }
      } else if (search) {
        setSearchQuery(decodeURIComponent(search as string));
      }
    };
    initialize();
  }, [tourId, search, fetchTours]);

  const filteredTours = tours.filter(
    (tour) =>
      (tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.id.includes(searchQuery) ||
        tour.location.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (activeTab === 'all' || tour.type === activeTab)
  );

  const tourCounts = {
    all: tours.length,
    regular: tours.filter((t) => t.type === 'regular').length,
    combo: tours.filter((t) => t.type === 'combo').length,
  };

  const resetForm = () => {
    setFormData({
      title: '',
      price: '',
      duration: '',
      image: '',
      type: 'regular',
      location: '',
      sub_images: [],
      features: [],
    });
    setNewFeatureText('');
    setEditingTour(null);
  };

  const showSuccessAlert = (type: 'created' | 'updated' | 'deleted', title: string) => {
    setSuccessMessage(`"${title}" has been successfully ${type}.`);
    setSuccessModalVisible(true);
  };

  const handleDeleteTour = (tourId: string, tourTitle: string) => {
    setTourToDelete({ id: tourId, title: tourTitle });
    setDeleteModalVisible(true);
  };

  const confirmDeleteTour = async () => {
    if (!tourToDelete) return;
    setLoading(true);
    setDeleteModalVisible(false);
    try {
      const { error: tourError } = await supabase.from('tours').delete().eq('id', tourToDelete.id);
      if (tourError) throw new Error('Failed to delete tour');
      setTours((tours) => tours.filter((t) => t.id !== tourToDelete.id));
      showSuccessAlert('deleted', tourToDelete.title);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete tour.');
    } finally {
      setLoading(false);
      setTourToDelete(null);
    }
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setFormData({
      title: tour.title,
      price: tour.price.toString(),
      duration: tour.duration,
      image: tour.image,
      type: tour.type,
      location: tour.location,
      sub_images: tour.sub_images || [],
      features: tour.features || [],
    });
    setNewFeatureText('');
    setModalVisible(true);
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('tours').upload(`tour-images/${fileName}`, arrayBuffer, { contentType: `image/${fileExt}`, upsert: false });
      if (error) throw error;
      return supabase.storage.from('tours').getPublicUrl(`tour-images/${fileName}`).data.publicUrl;
    } catch {
      throw new Error('Failed to upload image');
    }
  };

  const pickImage = async (isMain: boolean) => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return Alert.alert('Permission Required', 'Camera roll access needed.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isMain ? [16, 9] : [4, 3],
      quality: isMain ? 0.8 : 0.7,
      allowsMultipleSelection: !isMain,
    });
    if (!result.canceled && result.assets) {
      setImageUploading(true);
      try {
        if (isMain) {
          const url = await uploadImage(result.assets[0].uri);
          setFormData((prev) => ({ ...prev, image: url }));
        } else {
          const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri)));
          setFormData((prev) => ({ ...prev, sub_images: [...prev.sub_images, ...urls].slice(0, 5) }));
        }
      } catch {
        Alert.alert('Error', 'Failed to upload image(s).');
      } finally {
        setImageUploading(false);
      }
    }
  };

  const validateForm = () => {
    const { title, price, duration, location, image } = formData;
    if (!title.trim()) return Alert.alert('Validation Error', 'Enter a tour title.'), false;
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return Alert.alert('Validation Error', 'Enter a valid price.'), false;
    if (!duration.trim()) return Alert.alert('Validation Error', 'Select a tour duration.'), false;
    if (!location.trim()) return Alert.alert('Validation Error', 'Enter tour location.'), false;
    if (!image) return Alert.alert('Validation Error', 'Upload a tour image.'), false;
    return true;
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) {
      Alert.alert('Error', 'Please enter a feature name.');
      return;
    }
    if (formData.features.some((f) => f.text.toLowerCase() === newFeatureText.trim().toLowerCase())) {
      Alert.alert('Error', 'This feature already exists.');
      return;
    }
    setFormData({
      ...formData,
      features: [...formData.features, { text: newFeatureText.trim(), available: true }],
    });
    setNewFeatureText('');
  };

  const handleToggleFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.map((f, i) => (i === index ? { ...f, available: !f.available } : f)),
    });
  };

  const handleSaveTour = async () => {
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      const tourData = {
        ...formData,
        price: parseInt(formData.price),
        title: formData.title.trim(),
        duration: formData.duration.trim(),
        location: formData.location.trim(),
        features: formData.features,
      };
      const { data, error } = editingTour
        ? await supabase.from('tours').update(tourData).eq('id', editingTour.id).select().single()
        : await supabase.from('tours').insert([tourData]).select().single();
      if (error) throw error;
      setTours((tours) => (editingTour ? tours.map((t) => (t.id === editingTour.id ? data : t)) : [data, ...tours]));
      showSuccessAlert(editingTour ? 'updated' : 'created', formData.title);
      setModalVisible(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'Failed to save tour.');
    } finally {
      setFormLoading(false);
    }
  };

  const renderTourItem = ({ item: tour }: { item: Tour }) => (
    <View key={tour.id} style={s.tourCard}>
      <Image source={{ uri: tour.image || 'https://via.placeholder.com/200' }} style={s.tourImage} />
      {tour.sub_images?.length ? (
        <View style={s.subImagesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subImagesScroll}>
            {tour.sub_images.slice(0, 4).map((img, i) => (
              <Image key={i} source={{ uri: img || 'https://via.placeholder.com/60x45' }} style={s.subImage} />
            ))}
            {tour.sub_images.length > 4 && (
              <View style={s.moreImagesIndicator}>
                <Text style={s.moreImagesText}>+{tour.sub_images.length - 4}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : null}
      <View style={s.tourInfo}>
        <Text style={s.tourTitle}>{tour.title || 'Unnamed Tour'}</Text>
        <Text style={s.tourLocation}>📍 {tour.location || 'Unknown Location'}</Text>
        <View style={s.tourDetails}>
          <Text style={s.tourPrice}>₱{typeof tour.price === 'number' ? tour.price.toLocaleString() : '0'}</Text>
          <View style={s.tourMeta}>
            <Text style={s.tourDuration}>{tour.duration || 'Unknown Duration'}</Text>
            <View style={[s.typeTag, tour.type === 'combo' && s.comboTag]}>
              <Text style={[s.typeText, tour.type === 'combo' && s.comboText]}>
                {(tour.type || 'regular').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={s.actionButtons}>
        <TouchableOpacity style={[s.actionButton, s.editButton]} onPress={() => handleEditTour(tour)}>
          <Text style={s.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionButton, s.deleteButton]} onPress={() => handleDeleteTour(tour.id, tour.title || 'Unnamed Tour')} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#D32F2F" /> : <Text style={s.deleteButtonText}>Delete</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModal = () => {
    const fields: {
      label: string;
      key: keyof Pick<TourFormData, 'title' | 'price' | 'location'>;
      placeholder: string;
      keyboardType?: KeyboardTypeOptions;
    }[] = [
      { label: 'Tour Title', key: 'title', placeholder: 'Enter tour title' },
      { label: 'Price (₱)', key: 'price', placeholder: 'Enter price', keyboardType: 'numeric' },
      { label: 'Location', key: 'location', placeholder: 'Enter tour location' },
    ];

    return (
      <>
        {/* Form Modal */}
        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={s.modalContainer}>
            <View style={s.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{editingTour ? 'Edit Tour' : 'Add New Tour'}</Text>
                  <TouchableOpacity style={s.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={s.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {fields.map(({ label, key, placeholder, keyboardType }) => (
                  <View key={key} style={s.formGroup}>
                    <Text style={s.label}>{label}</Text>
                    <TextInput
                      style={s.input}
                      placeholder={placeholder}
                      value={formData[key]}
                      onChangeText={(text) => setFormData({ ...formData, [key]: text })}
                      keyboardType={keyboardType}
                    />
                  </View>
                ))}
                {/* Duration Dropdown */}
                <View style={s.formGroup}>
                  <Text style={s.label}>Duration</Text>
                  <View style={[s.input, s.pickerContainer]}>
                    <Picker
                      selectedValue={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                      style={s.picker}
                    >
                      <Picker.Item label="Select duration" value="" enabled={false} />
                      {durationOptions.map((option) => (
                        <Picker.Item key={option} label={option} value={option} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={s.formGroup}>
                  <Text style={s.label}>Tour Type</Text>
                  <View style={s.typeSelector}>
                    {(['regular', 'combo'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[s.typeOption, formData.type === type && s.activeTypeOption]}
                        onPress={() => setFormData({ ...formData, type })}
                      >
                        <Text style={[s.typeOptionText, formData.type === type && s.activeTypeOptionText]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.formGroup}>
                  <Text style={s.label}>Main Tour Image</Text>
                  <TouchableOpacity style={s.imageUpload} onPress={() => pickImage(true)} disabled={imageUploading}>
                    {imageUploading ? (
                      <ActivityIndicator size="large" color="#2E7D32" />
                    ) : formData.image ? (
                      <>
                        <Image source={{ uri: formData.image }} style={s.previewImage} />
                        <Text style={s.changeImageText}>Tap to change image</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.uploadText}>📷</Text>
                        <Text style={s.uploadSubText}>Tap to upload main image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={s.formGroup}>
                  <Text style={s.label}>Additional Images (Optional, up to 5)</Text>
                  {formData.sub_images.length > 0 && (
                    <FlatList
                      data={formData.sub_images}
                      renderItem={({ item, index }) => (
                        <View style={s.subImageItem}>
                          <Image source={{ uri: item }} style={s.subImagePreview} />
                          <TouchableOpacity
                            style={s.removeSubImageButton}
                            onPress={() => setFormData({ ...formData, sub_images: formData.sub_images.filter((_, i) => i !== index) })}
                          >
                            <Text style={s.removeSubImageText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      keyExtractor={(item, i) => `${item}_${i}`}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s.subImagesList}
                      contentContainerStyle={s.subImagesListContent}
                    />
                  )}
                  {formData.sub_images.length < 5 && (
                    <TouchableOpacity style={s.addSubImageButton} onPress={() => pickImage(false)} disabled={imageUploading}>
                      {imageUploading ? (
                        <ActivityIndicator size="small" color="#2E7D32" />
                      ) : (
                        <>
                          <Text style={s.addSubImageIcon}>+</Text>
                          <Text style={s.addSubImageText}>{`Add Images (${formData.sub_images.length}/5)`}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <View style={s.formGroup}>
                  <Text style={s.label}>Tour Features</Text>
                  {formData.features.length > 0 ? (
                    <View style={s.featureSelector}>
                      {formData.features.map((feature, index) => (
                        <TouchableOpacity
                          key={`${feature.text}_${index}`}
                          style={[s.featureOption, feature.available && s.activeFeatureOption]}
                          onPress={() => handleToggleFeature(index)}
                        >
                          <Text style={[s.featureOptionText, feature.available && s.activeFeatureOptionText]}>
                            {feature.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.noFeaturesText}>No features added yet.</Text>
                  )}
                  <View style={s.addFeatureContainer}>
                    <TextInput
                      style={[s.input, s.addFeatureInput]}
                      placeholder="Enter new feature"
                      value={newFeatureText}
                      onChangeText={setNewFeatureText}
                    />
                    <TouchableOpacity style={s.addFeatureButton} onPress={handleAddFeature}>
                      <Text style={s.addFeatureButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.modalActions}>
                  <TouchableOpacity style={[s.modalButton, s.cancelButton]} onPress={() => setModalVisible(false)}>
                    <Text style={s.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalButton, s.saveButton]} onPress={handleSaveTour} disabled={formLoading}>
                    {formLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.saveButtonText}>{editingTour ? 'Update Tour' : 'Create Tour'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
        {/* Success Modal */}
        <Modal animationType="fade" transparent visible={successModalVisible} onRequestClose={() => setSuccessModalVisible(false)}>
          <View style={s.modalContainer}>
            <View style={s.successModalContent}>
              <Text style={s.successModalTitle}>Success</Text>
              <Text style={s.successModalMessage}>{successMessage}</Text>
              <TouchableOpacity
                style={s.confirmButton}
                onPress={() => setSuccessModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={s.confirmButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Delete Confirmation Modal */}
        <Modal animationType="fade" transparent visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
          <View style={s.modalContainer}>
            <View style={s.successModalContent}>
              <Text style={s.successModalTitle}>Delete Tour</Text>
              <Text style={s.successModalMessage}>
                Are you sure you want to delete "{tourToDelete?.title || 'this tour'}"?
              </Text>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalButton, s.cancelButton]}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setTourToDelete(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalButton, s.deleteButton]}
                  onPress={confirmDeleteTour}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#D32F2F" />
                  ) : (
                    <Text style={s.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Manage Tours</Text>
        <Text style={s.description}>Add, edit, or remove tours. Update prices and details.</Text>
        <View style={s.searchContainer}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, ID, or location..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={s.clearButton} onPress={() => setSearchQuery('')}>
              <Text style={s.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.tabsContainer}>
          {[
            { key: 'all', label: 'All', count: tourCounts.all },
            { key: 'regular', label: 'Regular Packages', count: tourCounts.regular },
            { key: 'combo', label: 'Combo Packages', count: tourCounts.combo },
          ].map(({ key, label, count }) => (
            <TouchableOpacity
              key={key}
              style={[s.tab, activeTab === key && s.activeTab]}
              onPress={() => setActiveTab(key as TabType)}
            >
              <Text style={[s.tabText, activeTab === key && s.activeTabText]}>{label}</Text>
              <View style={[s.badge, activeTab === key && s.activeBadge]}>
                <Text style={[s.badgeText, activeTab === key && s.activeBadgeText]}>{count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredTours}
          renderItem={renderTourItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.toursList}
          ListEmptyComponent={<Text style={s.noToursText}>No tours found.</Text>}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={s.bottomSpacer} />}
        />
      )}
      <TouchableOpacity
        style={s.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
      {renderModal()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9f7' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  description: { fontSize: 16, color: '#666', lineHeight: 22 },
  toursList: { paddingHorizontal: 20 },
  tourCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tourImage: { width: '100%', height: 200, backgroundColor: '#f0f0f0' },
  subImagesContainer: { backgroundColor: '#f8f9fa', paddingVertical: 8 },
  subImagesScroll: { paddingHorizontal: 16 },
  subImage: { width: 60, height: 45, borderRadius: 6, marginRight: 8, backgroundColor: '#e0e0e0' },
  moreImagesIndicator: {
    width: 60,
    height: 45,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  moreImagesText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tourInfo: { padding: 16 },
  tourTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
  tourLocation: { fontSize: 14, color: '#666', marginBottom: 12 },
  tourDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourPrice: { fontSize: 20, fontWeight: 'bold', color: '#EEC218' },
  tourMeta: { alignItems: 'flex-end', gap: 8 },
  tourDuration: { fontSize: 14, color: '#666', backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  typeTag: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  comboTag: { backgroundColor: '#EEC21820' },
  typeText: { fontSize: 12, fontWeight: '600', color: '#00355F' },
  comboText: { color: '#EEC218' },
  actionButtons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  editButton: { backgroundColor: '#E3F2FD', borderRightWidth: 0.5, borderRightColor: '#f0f0f0' },
  deleteButton: { backgroundColor: '#FFEBEE' },
  editButtonText: { color: '#00355F', fontWeight: '600', fontSize: 16 },
  deleteButtonText: { color: '#D32F2F', fontWeight: '600', fontSize: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00355F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { fontSize: 24, color: '#FFFFFF', fontWeight: 'bold' },
  bottomSpacer: { height: 100 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  clearButton: { padding: 8 },
  clearButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#f8f9fa', borderRadius: 25, padding: 4 },
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
    backgroundColor: '#00355F',
    shadowColor: '#00355F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666', textAlign: 'center', flexShrink: 1 },
  activeTabText: { color: '#FFFFFF', fontWeight: '700' },
  badge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeBadge: { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: 'transparent' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#00355F' },
  activeBadgeText: { color: '#FFFFFF' },
  noToursText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, width: '90%', maxHeight: '80%' },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '80%',
    padding: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 24, color: '#666' },
  formGroup: { paddingHorizontal: 20, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#e0e0e0' },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  picker: {
    width: '100%',
    color: '#333',
    fontSize: 16,
    height: 48,
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
  },
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeOption: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f8f9fa', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  activeTypeOption: { backgroundColor: '#E3F2FD', borderColor: '#00355F' },
  typeOptionText: { fontSize: 16, fontWeight: '600', color: '#666' },
  activeTypeOptionText: { color: '#00355F' },
  imageUpload: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 150,
  },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 8 },
  changeImageText: { fontSize: 14, color: '#00355F', fontWeight: '600' },
  uploadText: { fontSize: 24, marginBottom: 8 },
  uploadSubText: { fontSize: 14, color: '#666' },
  subImagesList: { marginVertical: 10 },
  subImagesListContent: { paddingRight: 10 },
  subImageItem: { marginRight: 10, position: 'relative' },
  subImagePreview: { width: 80, height: 60, borderRadius: 8 },
  removeSubImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#D32F2F',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  removeSubImageText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  addSubImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    marginTop: 10,
  },
  addSubImageIcon: { fontSize: 20, color: '#00355F', marginRight: 8 },
  addSubImageText: { fontSize: 14, color: '#00355F', fontWeight: '600' },
  featureSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  featureOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  activeFeatureOption: { backgroundColor: '#E3F2FD', borderColor: '#00355F' },
  featureOptionText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeFeatureOptionText: { color: '#00355F' },
  noFeaturesText: { fontSize: 14, color: '#666', marginBottom: 10 },
  addFeatureContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addFeatureInput: { flex: 1 },
  addFeatureButton: {
    backgroundColor: '#00355F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addFeatureButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e0e0e0' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { backgroundColor: '#00355F' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  confirmButton: {
    backgroundColor: '#00355F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00355F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: '60%',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});