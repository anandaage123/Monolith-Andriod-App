import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface HiddenItem {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'mixed';
  originalUri?: string; // Track exact original location hook
}

export default function VaultScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRegisteredPin, setHasRegisteredPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>([]);
  const navigation = useNavigation();

  const [selectedItem, setSelectedItem] = useState<HiddenItem | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  useEffect(() => {
    checkPinStatus();
    loadHiddenItems();
  }, []);

  const checkPinStatus = async () => {
    try {
      const savedPin = await AsyncStorage.getItem('@vault_pin');
      setHasRegisteredPin(!!savedPin);
      if (!savedPin) {
        setIsAuthenticated(true); // If PIN doesn't exist, bypass authentication
      }
    } catch (e) {}
  };

  const removePin = async () => {
    Alert.alert("Remove PIN", "Are you sure? Anyone with access to the app will be able to view hidden files.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
         await AsyncStorage.removeItem('@vault_pin');
         setHasRegisteredPin(false);
         setIsSettingsVisible(false);
         Alert.alert("Success", "Vault PIN removed.");
      }}
    ]);
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
          if (newPin === savedPin) setIsAuthenticated(true);
          else Alert.alert("Error", "Incorrect PIN!");
        }
        setPin('');
      }, 100);
    }
  };

  const pickAndHideImage = async () => {
    let hasMediaLibAccess = false;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status === 'granted') hasMediaLibAccess = true;
    } catch (e) { console.log('Expo Go Media Lib Warning'); }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const fileExt = asset.uri.split('.').pop() || 'jpg';
        // @ts-ignore
        const newUri = `${FileSystem.documentDirectory}hidden_${Date.now()}.${fileExt}`;
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });

        if (asset.assetId) {
          try {
            await MediaLibrary.deleteAssetsAsync([asset.assetId]);
          } catch(e) {}
        }

        const newItem: HiddenItem = {
          id: Date.now().toString(),
          uri: newUri,
          type: asset.type === 'video' ? 'video' : 'image',
          originalUri: asset.uri, // Store initial original path 
        };
        await saveHiddenItems([newItem, ...hiddenItems]);
      } catch (err) {}
    }
  };

  const unhideItem = async () => {
    if (!selectedItem) return;
    try {
      let hasMediaLibAccess = false;
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
        if (status === 'granted') hasMediaLibAccess = true;
      } catch (e) { console.log('Expo Go Media Lib Warning'); }
      
      let successfullyRestored = false;
      
      // Attempt 1: Native FileSys Move to Original exact folder structure
      if (selectedItem.originalUri) {
         try {
            // @ts-ignore
            await FileSystem.copyAsync({ from: selectedItem.uri, to: selectedItem.originalUri });
            // Alert Android Media Scanner
            await MediaLibrary.createAssetAsync(selectedItem.originalUri); 
            successfullyRestored = true;
         } catch(e) {}
      }
      
      // Attempt 2: Fallback to General Gallery
      if (!successfullyRestored) {
        await MediaLibrary.saveToLibraryAsync(selectedItem.uri);
      }
      
      // @ts-ignore
      await FileSystem.deleteAsync(selectedItem.uri, { idempotent: true });
      await saveHiddenItems(hiddenItems.filter(i => i.id !== selectedItem.id));
      
      setSelectedItem(null);
      Alert.alert("Unhidden", "Item successfully restored to the OS gallery!");
    } catch(e) {
      Alert.alert("Error", "Could not restore the file.");
    }
  };

  const permanentlyDelete = async () => {
    if (!selectedItem) return;
    try {
      // @ts-ignore
      await FileSystem.deleteAsync(selectedItem.uri, { idempotent: true });
      await saveHiddenItems(hiddenItems.filter(i => i.id !== selectedItem.id));
      setSelectedItem(null);
    } catch(e) {}
  };

  if (hasRegisteredPin === null) return null;

  if (hasRegisteredPin && !isAuthenticated) {
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
        <View style={{flexDirection: 'row'}}>
           <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={{marginRight: 20}}>
             <Ionicons name="settings" size={30} color={Colors.textSecondary} />
           </TouchableOpacity>
           <TouchableOpacity onPress={pickAndHideImage}>
             <Ionicons name="add-circle" size={32} color={Colors.secondary} />
           </TouchableOpacity>
        </View>
      </View>

      {!hasRegisteredPin && (
         <TouchableOpacity onPress={() => setIsAuthenticated(false)} style={styles.warningBox}>
            <Ionicons name="warning" size={24} color="#FFD700" />
            <Text style={{...Typography.body, color: "#FFD700", marginLeft: 10, flex: 1}}>Set up a PIN to lock this Vault.</Text>
         </TouchableOpacity>
      )}

      <Text style={styles.subtitle}>Hidden Files ({hiddenItems.length})</Text>

      <FlatList
        data={hiddenItems}
        numColumns={2}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.appCard} onPress={() => setSelectedItem(item)}>
            <Image source={{ uri: item.uri }} style={styles.hiddenImage} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{color: Colors.textMuted, textAlign: 'center', marginTop: 50}}>Tap '+' to authentically hide photos/videos here.</Text>}
      />

      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Ionicons name="image" size={40} color={Colors.primary} style={{marginBottom: 10}} />
             <Text style={styles.modalTitle}>Vault File Action</Text>
             
             <TouchableOpacity style={styles.actionBtn} onPress={unhideItem}>
                <Ionicons name="eye-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                <Text style={styles.actionText}>Unhide (Original Location)</Text>
             </TouchableOpacity>

             <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.accent + '30'}]} onPress={permanentlyDelete}>
                <Ionicons name="trash-outline" size={24} color={Colors.accent} style={{marginRight: 10}} />
                <Text style={[styles.actionText, {color: Colors.accent}]}>Permanently Delete</Text>
             </TouchableOpacity>

             <TouchableOpacity style={{marginTop: 15}} onPress={() => setSelectedItem(null)}>
                <Text style={{color: Colors.textMuted, fontWeight: 'bold'}}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isSettingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Vault Settings</Text>
             
             {hasRegisteredPin && (
               <TouchableOpacity style={styles.actionBtn} onPress={removePin}>
                  <Ionicons name="lock-open-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                  <Text style={styles.actionText}>Remove Security PIN</Text>
               </TouchableOpacity>
             )}
             
             <TouchableOpacity style={{marginTop: 15}} onPress={() => setIsSettingsVisible(false)}>
                <Text style={{color: Colors.textMuted, fontWeight: 'bold'}}>Close</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#332b00', padding: 15, borderRadius: 12, marginBottom: 20 },
  appCard: { flex: 1, margin: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surface, aspectRatio: 1 },
  hiddenImage: { width: '100%', height: '100%' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surfaceHighlight, padding: 25, borderRadius: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalTitle: { ...Typography.title, marginBottom: 25 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, width: '100%', padding: 15, borderRadius: 12, marginBottom: 10 },
  actionText: { ...Typography.body, fontWeight: '600' }
});
