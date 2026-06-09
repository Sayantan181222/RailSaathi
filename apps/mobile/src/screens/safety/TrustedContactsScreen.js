import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Trash2, Plus } from 'lucide-react-native';
import apiClient from '../../services/apiClient';

// Mock context fallback
import { useRailSaathi } from '../../context/RailSaathiContext'; 

export default function TrustedContactsScreen() {
  const { currentUser, refreshUser } = useRailSaathi() || {};
  
  // Convert string array to object array for UI
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.emergency_contacts) {
      const initialContacts = currentUser.emergency_contacts.map(phone => ({
        id: Math.random().toString(),
        name: '',
        phone: phone
      }));
      setContacts(initialContacts);
    }
  }, [currentUser]);

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([...contacts, { id: Math.random().toString(), name: '', phone: '' }]);
    }
  };

  const removeContact = (id) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const updateContact = (id, field, value) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const validatePhones = () => {
    const phoneRegex = /^\d{10}$/;
    for (let c of contacts) {
      if (!c.phone || !phoneRegex.test(c.phone)) {
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validatePhones()) {
      Alert.alert('Validation Error', 'All phone numbers must be exactly 10 digits with no letters or special characters.');
      return;
    }

    setSaving(true);
    try {
      // API expects { emergency_contacts: [...phones] }
      const phones = contacts.map(c => c.phone);
      await apiClient.patch('/users/me', { emergency_contacts: phones });
      
      if (refreshUser) {
        await refreshUser();
      }

      // Quick visual toast replacement
      Alert.alert('Success', 'Contacts saved successfully.');
    } catch (e) {
      console.warn('Failed to save contacts', e);
      Alert.alert('Error', 'Failed to save contacts. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Trusted Contacts</Text>
      <Text style={styles.subtitle}>Add up to 3 emergency contacts who will be notified when you trigger an SOS.</Text>

      {contacts.map((contact, index) => (
        <View key={contact.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.contactLabel}>Contact {index + 1}</Text>
            <TouchableOpacity onPress={() => removeContact(contact.id)}>
              <Trash2 color="#CC0000" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name (Optional)</Text>
            <TextInput
              style={styles.input}
              value={contact.name}
              onChangeText={(text) => updateContact(contact.id, 'name', text)}
              placeholder="e.g. Brother"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, contact.phone && !/^\d{10}$/.test(contact.phone) && styles.inputError]}
              value={contact.phone}
              onChangeText={(text) => updateContact(contact.id, 'phone', text.replace(/[^0-9]/g, '').substring(0, 10))}
              placeholder="10 digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>
      ))}

      {contacts.length < 3 && (
        <TouchableOpacity style={styles.addBtn} onPress={addContact}>
          <Plus color="#E8621A" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.addBtnText}>Add Contact</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]} 
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Save Contacts</Text>}
      </TouchableOpacity>
    </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111111',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111111',
  },
  inputError: {
    borderColor: '#CC0000',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8621A',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addBtnText: {
    color: '#E8621A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: '#E8621A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
