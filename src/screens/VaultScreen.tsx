import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Animated } from 'react-native';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// The simulated "Hidden Apps" Vault Screen
export default function VaultScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const navigation = useNavigation();

  // Mock Hidden Data (could be apps or passwords or private notes)
  const hiddenItems = [
    { id: '1', name: 'Gallery Vault', icon: 'images' },
    { id: '2', name: 'Private Browser', icon: 'globe' },
    { id: '3', name: 'Banking App Link', icon: 'cash' },
    { id: '4', name: 'Passwords', icon: 'key' },
  ];

  const handlePin = (p: string) => {
    const newPin = pin + p;
    setPin(newPin);
    if (newPin === '1234') {
      setIsAuthenticated(true);
      setPin('');
    } else if (newPin.length >= 4) {
      setPin('');
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="lock-closed" size={50} color={Colors.primary} style={{marginBottom: 30}} />
        <Text style={styles.authTitle}>Enter Vault PIN</Text>
        <Text style={styles.pinDisplay}>{'*'.repeat(pin.length)}</Text>
        
        <View style={styles.numpad}>
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePin(num.toString())}>
              <Text style={styles.numText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.numBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.numBtn} onPress={() => handlePin('0')}>
            <Text style={styles.numText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numBtn} onPress={() => setPin(pin.slice(0, -1))}>
            <Ionicons name="backspace" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Secure Vault</Text>
        <Ionicons name="shield-checkmark" size={24} color={Colors.secondary} />
      </View>

      <Text style={styles.subtitle}>Hidden Applications & Secrets</Text>

      <FlatList
        data={hiddenItems}
        numColumns={2}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.appCard}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={30} color={Colors.text} />
            </View>
            <Text style={styles.appName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: Colors.vaultBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    ...Typography.title,
    marginBottom: 20,
  },
  pinDisplay: {
    ...Typography.header,
    letterSpacing: 20,
    marginBottom: 40,
    height: 40,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'space-between',
  },
  numBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  numText: {
    ...Typography.header,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.vaultBackground,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    ...Typography.header,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  appCard: {
    flex: 1,
    margin: 10,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '80', // Opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  appName: {
    ...Typography.body,
    textAlign: 'center',
  }
});
