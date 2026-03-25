import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface HiddenItem {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'mixed';
}

export default function VaultScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRegisteredPin, setHasRegisteredPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    checkPinStatus();
    loadHiddenItems();
  }, []);

  const checkPinStatus = async () => {
    try {
      const savedPin = await AsyncStorage.getItem('@vault_pin');
      setHasRegisteredPin(!!savedPin);
    } catch (e) {}
  };

  const loadHiddenItems = async () => {
    try {
      const items = await AsyncStorage.getItem('@vault_items');
      if (items) setHiddenItems(JSON.parse(items));
    } catch (e) {}
  };

  const saveHiddenItems = async (items: HiddenItem[]) => {
    setHiddenItems(items);
    await AsyncStorage.setItem('@vault_items', JSON.stringify(items));
  };

  const handlePin = async (p: string) => {
    const newPin = pin + p;
    setPin(newPin);
    
    if (newPin.length === 4) {
      setTimeout(async () => {
        if (!hasRegisteredPin) {
          await AsyncStorage.setItem('@vault_pin', newPin);
          setHasRegisteredPin(true);
          setIsAuthenticated(true);
        } else {
          const savedPin = await AsyncStorage.getItem('@vault_pin');
          if (newPin === savedPin) {
            setIsAuthenticated(true);
          } else {
            Alert.alert("Error", "Incorrect PIN!");
          }
        }
        setPin('');
      }, 100);
    }
  };

  const pickAndHideImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const fileExt = asset.uri.split('.').pop() || 'jpg';
        // @ts-ignore
        const newUri = `${FileSystem.documentDirectory}hidden_${Date.now()}.${fileExt}`;
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });

        const newItem: HiddenItem = {
          id: Date.now().toString(),
          uri: newUri,
          type: asset.type === 'video' ? 'video' : 'image',
        };
        await saveHiddenItems([newItem, ...hiddenItems]);
      } catch (err) {
        console.log("Vault Error: ", err);
      }
    }
  };

  const removeHiddenItem = (id: string, uri: string) => {
    Alert.alert('Remove', 'Delete this securely hidden item from Vault?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            await saveHiddenItems(hiddenItems.filter(i => i.id !== id));
          } catch (e) {}
        }}
    ]);
  };

  if (hasRegisteredPin === null) return null;

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="lock-closed" size={50} color={Colors.primary} style={{marginBottom: 30}} />
        <Text style={styles.authTitle}>
          {!hasRegisteredPin ? "Create Vault PIN" : "Enter Vault PIN"}
        </Text>
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
        <TouchableOpacity onPress={pickAndHideImage}>
          <Ionicons name="add-circle" size={32} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Hidden Files ({hiddenItems.length})</Text>

      <FlatList
        data={hiddenItems}
        numColumns={2}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.appCard} onLongPress={() => removeHiddenItem(item.id, item.uri)}>
            <Image source={{ uri: item.uri }} style={styles.hiddenImage} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{color: Colors.textMuted, textAlign: 'center', marginTop: 50}}>Tap top-right to securely hide photos/videos here.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: Colors.vaultBackground, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authTitle: { ...Typography.title, marginBottom: 20 },
  pinDisplay: { ...Typography.header, letterSpacing: 20, marginBottom: 40, height: 40 },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'space-between' },
  numBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  numText: { ...Typography.header },
  container: { flex: 1, backgroundColor: Colors.vaultBackground, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  title: { ...Typography.header },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: 20 },
  appCard: { flex: 1, margin: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surface, aspectRatio: 1 },
  hiddenImage: { width: '100%', height: '100%' }
});
