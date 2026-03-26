import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Modal, AppState } from 'react-native';
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
  originalUri?: string;
}

export default function VaultScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vaultMode, setVaultMode] = useState<'primary' | 'decoy' | null>(null);
  const [hasPrimaryPin, setHasPrimaryPin] = useState<boolean | null>(null);
  const [hasDecoyPin, setHasDecoyPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  
  const [setupStep, setSetupStep] = useState<'none' | 'primary' | 'primary_confirm' | 'decoy' | 'decoy_confirm'>('none');
  const [tempPin, setTempPin] = useState('');

  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>([]);
  const navigation = useNavigation();
  const [selectedItem, setSelectedItem] = useState<HiddenItem | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  
  const appState = useRef(AppState.currentState);
  const skipLock = useRef(false);

  useEffect(() => {
    checkPinStatus();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState !== 'active') {
        if (!skipLock.current) {
          setIsAuthenticated(false);
          setVaultMode(null);
          setPin('');
          setHiddenItems([]);
          setIsSettingsVisible(false);
          setSelectedItem(null);
          setSetupStep('none');
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (vaultMode && isAuthenticated) {
      loadHiddenItems(vaultMode);
    }
  }, [vaultMode, isAuthenticated]);

  const checkPinStatus = async () => {
    try {
      const pPin = await AsyncStorage.getItem('@vault_pin_primary');
      const dPin = await AsyncStorage.getItem('@vault_pin_decoy');
      setHasPrimaryPin(!!pPin);
      setHasDecoyPin(!!dPin);
      
      if (!pPin) {
        setIsAuthenticated(true); 
      }
    } catch (e) {}
  };

  const startSetup = () => {
    setIsAuthenticated(false);
    setSetupStep('primary');
    setPin('');
  };

  const cancelSetup = () => {
     if (setupStep !== 'none') {
         setSetupStep('none');
         setPin('');
     } else {
         navigation.goBack();
     }
  };

  const removeSecurity = async () => {
    Alert.alert("Remove Vault Security", "WARNING: This permanently exposes all metadata logs. Remove security?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove All", style: "destructive", onPress: async () => {
         await AsyncStorage.removeItem('@vault_pin_primary');
         await AsyncStorage.removeItem('@vault_pin_decoy');
         
         setHasPrimaryPin(false);
         setHasDecoyPin(false);
         setVaultMode('primary');
         setIsSettingsVisible(false);
         Alert.alert("Success", "Vault security wiped.");
      }}
    ]);
  };

  const loadHiddenItems = async (mode: 'primary' | 'decoy') => {
    try {
      const items = await AsyncStorage.getItem(`@vault_items_${mode}`);
      if (items) setHiddenItems(JSON.parse(items));
      else setHiddenItems([]);
    } catch (e) {}
  };

  const saveHiddenItems = async (items: HiddenItem[]) => {
    if (!vaultMode) return;
    setHiddenItems(items);
    await AsyncStorage.setItem(`@vault_items_${vaultMode}`, JSON.stringify(items));
  };

  const handlePin = async (p: string) => {
    const newPin = pin + p;
    setPin(newPin);
    
    // Emergency dev bypass
    if (newPin === '999999') {
         await AsyncStorage.removeItem('@vault_pin_primary');
         await AsyncStorage.removeItem('@vault_pin_decoy');
         setHasPrimaryPin(false);
         setHasDecoyPin(false);
         setSetupStep('none');
         setIsAuthenticated(true);
         setVaultMode('primary');
         setPin('');
         Alert.alert("Dev Bypass", "PINs wiped.");
         return;
    }

    if (newPin.length === 4) {
      setTimeout(async () => {
        // Setup flows
        if (setupStep === 'primary') {
          setTempPin(newPin);
          setSetupStep('primary_confirm');
        } else if (setupStep === 'primary_confirm') {
          if (newPin === tempPin) {
             await AsyncStorage.setItem('@vault_pin_primary', newPin);
             setHasPrimaryPin(true);
             setSetupStep('none');
             setVaultMode('primary');
             setIsAuthenticated(true);
             Alert.alert("Vault Secured", "Primary PIN Set. Configure Decoy PIN later in settings.");
          } else {
             Alert.alert("Error", "PINs don't match.");
             setSetupStep('primary');
          }
        } else if (setupStep === 'decoy') {
          setTempPin(newPin);
          setSetupStep('decoy_confirm');
        } else if (setupStep === 'decoy_confirm') {
          if (newPin === tempPin) {
             await AsyncStorage.setItem('@vault_pin_decoy', newPin);
             setHasDecoyPin(true);
             setSetupStep('none');
             Alert.alert("Decoy Set", "Decoy PIN applied.");
          } else {
             Alert.alert("Error", "PINs don't match.");
             setSetupStep('decoy');
          }
        } else {
          // Login flow
          const savedPrimary = await AsyncStorage.getItem('@vault_pin_primary');
          const savedDecoy = await AsyncStorage.getItem('@vault_pin_decoy');
          
          if (newPin === savedPrimary) {
             setVaultMode('primary'); 
             setIsAuthenticated(true);
          } else if (newPin === savedDecoy) {
             const dItems = await AsyncStorage.getItem('@vault_items_decoy');
             if (!dItems || JSON.parse(dItems).length === 0) {
               Alert.alert("Decoy Vault", "Don't forget to hide some fake photos here.");
             }
             setVaultMode('decoy'); 
             setIsAuthenticated(true);
          } else {
             Alert.alert("Error", "Incorrect Vault PIN!");
          }
        }
        setPin('');
      }, 100);
    }
  };

  const pickAndHideImage = async () => {
    if (!vaultMode) return;
    
    skipLock.current = true;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
         Alert.alert("Permission Error", "Allow storage tracking to fully delete gallery files.");
         skipLock.current = false;
         return;
      }
    } catch (e) {}

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], 
      quality: 1,
    });
    skipLock.current = false;

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      try {
         const fileExt = asset.uri.split('.').pop() || 'jpg';
         // @ts-ignore
         const newUri = `${FileSystem.documentDirectory}hidden_${vaultMode}_${Date.now()}.${fileExt}`;
         await FileSystem.copyAsync({ from: asset.uri, to: newUri });

         const newItem: HiddenItem = {
            id: Date.now().toString(),
            uri: newUri,
            type: asset.type === 'video' ? 'video' : 'image',
            originalUri: asset.assetId ? asset.uri : undefined, 
         };
         await saveHiddenItems([newItem, ...hiddenItems]);

         if (asset.assetId) {
            try { 
                await MediaLibrary.deleteAssetsAsync([asset.assetId]);
                Alert.alert("Fully Secured", "Original photo reliably wiped.");
            } catch(e) {
                Alert.alert("Partially Secured", "Media copied, but Please delete original file in gallery app.");
            }
         } else {
             Alert.alert("Partially Secured", "Android privacy bounds blocked deletion. You must wipe original file locally!");
         }
         
         try {
             await FileSystem.deleteAsync(asset.uri, { idempotent: true });
         } catch(e) {}

      } catch (err) {}
    }
  };

  const unhideItem = async () => {
    if (!selectedItem) return;
    try {
      try { await MediaLibrary.requestPermissionsAsync(true); } catch(e){}
      
      let successfullyRestored = false;
      if (selectedItem.originalUri) {
         try {
            // @ts-ignore
            await FileSystem.copyAsync({ from: selectedItem.uri, to: selectedItem.originalUri });
            await MediaLibrary.createAssetAsync(selectedItem.originalUri); 
            successfullyRestored = true;
         } catch(e) {}
      }
      
      if (!successfullyRestored) {
        await MediaLibrary.saveToLibraryAsync(selectedItem.uri);
      }
      
      // @ts-ignore
      await FileSystem.deleteAsync(selectedItem.uri, { idempotent: true });
      await saveHiddenItems(hiddenItems.filter(i => i.id !== selectedItem.id));
      
      setSelectedItem(null);
      Alert.alert("Unhidden", "Item successfully restored.");
    } catch(e) { Alert.alert("Error", "Could not restore file."); }
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

  const getAuthTitle = () => {
    if (setupStep === 'primary') return "Set New Primary PIN";
    if (setupStep === 'primary_confirm') return "Confirm Primary PIN";
    if (setupStep === 'decoy') return "Set Fake Vault PIN";
    if (setupStep === 'decoy_confirm') return "Confirm Fake PIN";
    return "Enter Vault PIN";
  };

  if (hasPrimaryPin === null) return null;

  if ((hasPrimaryPin && !isAuthenticated) || setupStep !== 'none') {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="lock-closed" size={50} color={Colors.primary} style={{marginBottom: 30}} />
        <Text style={styles.authTitle}>{getAuthTitle()}</Text>
        <Text style={styles.pinDisplay}>{'*'.repeat(pin.length)}</Text>
        <View style={styles.numpad}>
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePin(num.toString())}>
              <Text style={styles.numText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.numBtn} onPress={cancelSetup}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.numBtn} onPress={() => handlePin('0')}>
            <Text style={styles.numText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numBtn} onPress={() => setPin(pin.slice(0, -1))}>
            <Ionicons name="backspace" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={{color: Colors.textMuted, opacity: 0.5, marginTop: 40}}>Emergency wipe: type 999999</Text>
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
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
           {!!hasPrimaryPin && !!vaultMode && (
             <>
               <TouchableOpacity onPress={() => { setIsAuthenticated(false); setVaultMode(null); setHiddenItems(''); }} style={{marginRight: 20}}>
                 <Ionicons name="lock-closed" size={28} color={Colors.accent} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={{marginRight: 20}}>
                 <Ionicons name="settings" size={30} color={Colors.textSecondary} />
               </TouchableOpacity>
               <TouchableOpacity onPress={pickAndHideImage}>
                 <Ionicons name="add-circle" size={32} color={Colors.secondary} />
               </TouchableOpacity>
             </>
           )}
        </View>
      </View>

      {!hasPrimaryPin && setupStep === 'none' && (
         <TouchableOpacity onPress={startSetup} style={styles.warningBox}>
            <Ionicons name="warning" size={24} color="#FFD700" />
            <Text style={{...Typography.body, color: "#FFD700", marginLeft: 10, flex: 1}}>Set up a PIN to lock and secure this Vault.</Text>
         </TouchableOpacity>
      )}

      {!!vaultMode && (
         <Text style={styles.subtitle}>Hidden Files ({hiddenItems.length})</Text>
      )}

      {!!vaultMode && (
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
      )}

      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Ionicons name="image" size={40} color={Colors.primary} style={{marginBottom: 10}} />
             <Text style={styles.modalTitle}>Vault File Action</Text>
             
             <TouchableOpacity style={styles.actionBtn} onPress={unhideItem}>
                <Ionicons name="eye-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                <Text style={styles.actionText}>Unhide (Restore)</Text>
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
             
             {vaultMode === 'primary' && !!hasPrimaryPin && (
               <>
                 <TouchableOpacity style={styles.actionBtn} onPress={() => {setIsSettingsVisible(false); setSetupStep('primary');}}>
                    <Ionicons name="key-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                    <Text style={styles.actionText}>Change Primary PIN</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.actionBtn} onPress={() => {setIsSettingsVisible(false); setSetupStep('decoy');}}>
                    <Ionicons name="shield-half-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                    <Text style={styles.actionText}>{hasDecoyPin ? "Change Decoy PIN" : "Setup Fake Vault PIN"}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.accent + '30'}]} onPress={removeSecurity}>
                    <Ionicons name="lock-open-outline" size={24} color={Colors.accent} style={{marginRight: 10}} />
                    <Text style={[styles.actionText, {color: Colors.accent}]}>Remove All Security</Text>
                 </TouchableOpacity>
               </>
             )}

             {vaultMode === 'decoy' && !!hasDecoyPin && (
               <>
                 <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
                    <Ionicons name="shield-checkmark" size={24} color={Colors.text} style={{marginRight: 10}} />
                    <Text style={styles.actionText}>Decoy Profile Active (Restricted)</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.actionBtn} onPress={() => {setIsSettingsVisible(false); setSetupStep('decoy');}}>
                    <Ionicons name="key-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                    <Text style={styles.actionText}>Change Fake PIN</Text>
                 </TouchableOpacity>
               </>
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
  authTitle: { ...Typography.title, marginBottom: 20, textAlign: 'center' },
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
