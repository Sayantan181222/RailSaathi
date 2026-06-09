import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { postHazardReport } from './services/safetyService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const HAZARD_TYPES = [
  { id: 'UNMANNED_CROSSING', label: 'Unmanned Crossing' },
  { id: 'BROKEN_PLATFORM', label: 'Broken Platform' },
  { id: 'POOR_LIGHTING', label: 'Poor Lighting' },
  { id: 'FLOODING', label: 'Flooding' },
  { id: 'TRACK_DAMAGE', label: 'Track Damage' },
  { id: 'OTHER', label: 'Other' },
];

export default function HazardReportScreen() {
  const navigation = useNavigation();

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [alertSubtype, setAlertSubtype] = useState(HAZARD_TYPES[0].id);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successEvent, setSuccessEvent] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(loc.coords);
        }
      } catch (e) {
        console.warn('Location failed', e);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Camera failed", e);
    }
  };

  const uploadPhoto = async (uri) => {
    if (!uri) return null;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
      const fileName = `hazard_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('hazard-photos')
        .upload(fileName, blob, { contentType: `image/${ext}` });

      if (data) {
        const { data: publicUrlData } = supabase.storage.from('hazard-photos').getPublicUrl(fileName);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn("Upload failed", e);
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!location) return;
    setSubmitting(true);

    try {
      let photo_url = null;
      if (photoUri) {
        setUploading(true);
        photo_url = await uploadPhoto(photoUri);
        setUploading(false);
      }

      const res = await postHazardReport({
        lat: location.latitude,
        lng: location.longitude,
        alert_subtype: alertSubtype,
        description: description,
        photo_url: photo_url
      });

      // Based on endpoint contract, data is inside res.data.data or res.data
      const createdEvent = res?.data?.data || res?.data;
      setSuccessEvent(createdEvent);

      setTimeout(() => {
        navigation.goBack();
      }, 4000);
    } catch (e) {
      console.warn('Submit failed', e);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (successEvent) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Thank you for keeping passengers safe</Text>
        <Text style={styles.refText}>Reference ID: {successEvent.id?.split('-')[0]}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>Report Hazard</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Location</Text>
        {locating ? (
          <View style={styles.locatingRow}>
            <ActivityIndicator color="#E8621A" size="small" />
            <Text style={styles.locatingText}>Getting your location...</Text>
          </View>
        ) : location ? (
          <Text style={styles.gpsText}>
            Lat: {location.latitude.toFixed(2)}°, Lng: {location.longitude.toFixed(2)}°
          </Text>
        ) : (
          <Text style={styles.errorText}>Location access denied. Cannot proceed.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Hazard Type</Text>
        {HAZARD_TYPES.map(type => (
          <TouchableOpacity 
            key={type.id} 
            style={styles.radioRow}
            onPress={() => setAlertSubtype(type.id)}
          >
            <View style={styles.radioOuter}>
              {alertSubtype === type.id && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.charCounter}>{description.length}/200</Text>
        </View>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Add details about the hazard..."
          multiline
          maxLength={200}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Photo Evidence (Optional)</Text>
        {photoUri ? (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity onPress={() => setPhotoUri(null)}>
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Camera color="#E8621A" size={24} style={{ marginRight: 8 }} />
            <Text style={styles.photoBtnText}>Take a Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, (!location || locating || submitting) && styles.submitBtnDisabled]} 
        onPress={handleSubmit}
        disabled={!location || locating || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>{uploading ? 'Uploading Photo...' : 'Submit Report'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 12,
    fontWeight: '600',
  },
  locatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locatingText: {
    marginLeft: 8,
    color: '#E8621A',
    fontStyle: 'italic',
  },
  gpsText: {
    fontSize: 16,
    color: '#111111',
    fontWeight: 'bold',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  errorText: {
    color: '#CC0000',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E8621A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#E8621A',
  },
  radioLabel: {
    fontSize: 16,
    color: '#111111',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: '#888',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111111',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8621A',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  photoBtnText: {
    color: '#E8621A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  photoPreviewContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  removePhotoText: {
    color: '#CC0000',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#E8621A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 16,
  },
  refText: {
    fontSize: 16,
    color: '#555555',
  }
});
