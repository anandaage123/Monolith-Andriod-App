import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, Modal, AppState, Dimensions, Platform, Animated, StatusBar, TextInput, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { MM_Colors, Typography, Shadows, Spacing } from '../theme/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width, height } = Dimensions.get('window');

interface HiddenItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
}

interface PasswordItem {
  id: string;
  site: string;
  username: string;
  pass: string;
}

export default function VaultScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vaultMode, setVaultMode] = useState<'primary' | 'decoy' | null>(null);
  const [hasPrimaryPin, setHasPrimaryPin] = useState<boolean | null>(null);
  const [hasDecoyPin, setHasDecoyPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');

  const [setupStep, setSetupStep] = useState<'none' | 'primary' | 'primary_confirm' | 'decoy' | 'decoy_confirm'>('none');
  const [tempPin, setTempPin] = useState('');

  const [activeTab, setActiveTab] = useState<'media' | 'passwords'>('media');
  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>([]);
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);

  const [isPassModalVisible, setIsPassModalVisible] = useState(false);
  const [newSite, setNewSite] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');

  const navigation = useNavigation<any>();
  const [selectedItem, setSelectedItem] = useState<HiddenItem | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<HiddenItem | null>(null);

  const appState = useRef(AppState.currentState);
  const skipLock = useRef(false);

  const videoPlayer = useVideoPlayer(viewingMedia?.type === 'video' ? viewingMedia.uri : null, (player) => {
    player.loop = true;
    player.play();
  });

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPinStatus();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState !== 'active') {
        if (!skipLock.current) {
          setIsAuthenticated(false);
          setVaultMode(null);
          setPin('');
          setHiddenItems([]);
          setPasswords([]);
          setIsSettingsVisible(false);
          setSelectedItem(null);
          setViewingMedia(null);
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
      loadPasswords(vaultMode);
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
        setVaultMode('primary');
      }
    } catch (e) {}
  };

  const getAuthTitle = () => {
    switch (setupStep) {
      case 'primary': return 'Set Security PIN';
      case 'primary_confirm': return 'Confirm Security PIN';
      case 'decoy': return 'Set Decoy PIN';
      case 'decoy_confirm': return 'Confirm Decoy PIN';
      default: return 'Enter PIN';
    }
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
         skipLock.current = true;
         // Use goBack() if Dashboard is the previous screen,
         // or dispatch a reset to ensure Dashboard exists.
         if (navigation.canGoBack()) {
            navigation.goBack();
         } else {
            navigation.navigate('Dashboard');
         }
     }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const removePin = async () => {
    Alert.alert("Reset Vault", "Permanently delete all secure data?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem('@vault_pin_primary');
          await AsyncStorage.removeItem('@vault_pin_decoy');
          await AsyncStorage.removeItem('@vault_items_primary');
          await AsyncStorage.removeItem('@vault_items_decoy');
          await AsyncStorage.removeItem('@vault_pass_primary');
          await AsyncStorage.removeItem('@vault_pass_decoy');
          setHasPrimaryPin(false);
          setHasDecoyPin(false);
          setVaultMode('primary');
          setIsAuthenticated(true);
          setIsSettingsVisible(false);
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

  const loadPasswords = async (mode: 'primary' | 'decoy') => {
    try {
      const stored = await AsyncStorage.getItem(`@vault_pass_${mode}`);
      if (stored) setPasswords(JSON.parse(stored));
      else setPasswords([]);
    } catch (e) {}
  };

  const savePasswords = async (items: PasswordItem[]) => {
    if (!vaultMode) return;
    setPasswords(items);
    await AsyncStorage.setItem(`@vault_pass_${vaultMode}`, JSON.stringify(items));
  };

  const handlePin = async (p: string) => {
    const newPin = pin + p;
    if (newPin.length > 6) return;
    setPin(newPin);
    if (newPin.length === 6) {
      setTimeout(async () => {
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
          } else {
             shake();
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
             setIsAuthenticated(true);
             setVaultMode('primary');
          } else {
             shake();
             Alert.alert("Error", "PINs don't match.");
             setSetupStep('decoy');
          }
        } else {
          const savedPrimary = await AsyncStorage.getItem('@vault_pin_primary');
          const savedDecoy = await AsyncStorage.getItem('@vault_pin_decoy');
          if (newPin === savedPrimary) {
             setVaultMode('primary');
             setIsAuthenticated(true);
          } else if (newPin === savedDecoy) {
             setVaultMode('decoy');
             setIsAuthenticated(true);
          } else {
             shake();
             setPin('');
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
         Alert.alert("Permission Required", "Allow storage access to secure files.");
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
         const newUri = `${FileSystem.documentDirectory}hidden_${vaultMode}_${Date.now()}.${fileExt}`;
         await FileSystem.copyAsync({ from: asset.uri, to: newUri });
         const newItem: HiddenItem = {
            id: Date.now().toString(),
            uri: newUri,
            type: asset.type === 'video' ? 'video' : 'image',
         };
         await saveHiddenItems([newItem, ...hiddenItems]);
         if (asset.assetId) {
            try { await MediaLibrary.deleteAssetsAsync([asset.assetId]); } catch(e) {}
         }
      } catch (err) {}
    }
  };

  const handleUnhide = async (item: HiddenItem) => {
    try {
      await MediaLibrary.saveToLibraryAsync(item.uri);
      const updated = hiddenItems.filter(i => i.id !== item.id);
      saveHiddenItems(updated);
      setSelectedItem(null);
      setViewingMedia(null);
      Alert.alert("Success", "File restored to gallery.");
    } catch(e) {
      Alert.alert("Error", "Could not restore file.");
    }
  };

  const handleRemove = async (item: HiddenItem) => {
    const updated = hiddenItems.filter(i => i.id !== item.id);
    saveHiddenItems(updated);
    setSelectedItem(null);
    setViewingMedia(null);
  };

  const addPassword = () => {
    if (newSite.trim()) {
      const newItem: PasswordItem = {
        id: Date.now().toString(),
        site: newSite.trim(),
        username: newUser.trim(),
        pass: newPass.trim()
      };
      savePasswords([newItem, ...passwords]);
      setIsPassModalVisible(false);
      setNewSite(''); setNewUser(''); setNewPass('');
    }
  };

  const deletePassword = (id: string) => {
    Alert.alert("Delete Entry", "Remove this password?", [
      { text: "Cancel", style: 'cancel' },
      { text: "Delete", style: 'destructive', onPress: () => savePasswords(passwords.filter(p => p.id !== id)) }
    ]);
  };

  if (hasPrimaryPin === null) return null;

  if ((hasPrimaryPin && !isAuthenticated) || setupStep !== 'none') {
    return (
      <View style={styles.authContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.authMain}>
           <View style={styles.identityContainer}>
              <View style={styles.iconCircle}>
                 <Ionicons name="lock-closed-outline" size={40} color={MM_Colors.primary} />
              </View>
              <Text style={styles.authHeading}>{getAuthTitle()}</Text>
              <Text style={styles.authSubtitle}>Secure verification required</Text>
           </View>

           <Animated.View style={[styles.pinDisplay, { transform: [{ translateX: shakeAnim }] }]}>
             {[1,2,3,4,5,6].map((i) => (
               <View key={i} style={[styles.pinDot, pin.length >= i && styles.pinDotActive]} />
             ))}
           </Animated.View>

           <View style={styles.numpadGrid}>
              {[1,2,3,4,5,6,7,8,9].map(num => (
                <Pressable key={num} style={({ pressed }) => [styles.numpadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={() => handlePin(num.toString())}>
                  <Text style={styles.numpadText}>{num}</Text>
                </Pressable>
              ))}
              <Pressable style={({ pressed }) => [styles.numpadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={cancelSetup}>
                <Ionicons name="close" size={28} color={MM_Colors.textVariant} />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.numpadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={() => handlePin('0')}>
                <Text style={styles.numpadText}>0</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.numpadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={() => setPin(pin.slice(0, -1))}>
                <Ionicons name="backspace-outline" size={28} color={MM_Colors.text} />
              </Pressable>
           </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={28} color={MM_Colors.primary} />
        </Pressable>
        <Text style={styles.title}>Vault</Text>
        <Pressable onPress={() => setIsSettingsVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="settings-outline" size={24} color={MM_Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('media')}
          style={[styles.tab, activeTab === 'media' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Media</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('passwords')}
          style={[styles.tab, activeTab === 'passwords' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'passwords' && styles.activeTabText]}>Passwords</Text>
        </Pressable>
      </View>

      {activeTab === 'media' ? (
        <FlatList
          data={hiddenItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setViewingMedia(item)}
              onLongPress={() => setSelectedItem(item)}
              style={styles.mediaItem}
            >
              <Image source={{ uri: item.uri }} style={styles.mediaImage} />
              {item.type === 'video' && (
                <View style={styles.videoBadge}>
                  <Ionicons name="play" size={14} color="#FFF" />
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color={MM_Colors.primaryLight} />
              <Text style={styles.emptyTitle}>Vault is Empty</Text>
              <Text style={styles.emptySubtitle}>Secure your private photos and videos here.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={passwords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => deletePassword(item.id)}
              style={styles.passItem}
            >
              <View style={styles.passIcon}>
                <Ionicons name="key-outline" size={20} color={MM_Colors.primary} />
              </View>
              <View style={styles.passInfo}>
                <Text style={styles.passSite}>{item.site}</Text>
                <Text style={styles.passUser}>{item.username}</Text>
              </View>
              <Pressable onPress={() => Alert.alert("Password", item.pass)}>
                <Ionicons name="eye-outline" size={20} color={MM_Colors.textVariant} />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={64} color={MM_Colors.primaryLight} />
              <Text style={styles.emptyTitle}>No Passwords</Text>
              <Text style={styles.emptySubtitle}>Store your login credentials safely.</Text>
            </View>
          }
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => activeTab === 'media' ? pickAndHideImage() : setIsPassModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </Pressable>

      <Modal visible={isSettingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vault Settings</Text>
              <Pressable onPress={() => setIsSettingsVisible(false)}>
                <Ionicons name="close" size={24} color={MM_Colors.text} />
              </Pressable>
            </View>
            <Pressable style={styles.settingRow} onPress={() => { setIsSettingsVisible(false); startSetup(); }}>
              <Ionicons name="lock-open-outline" size={22} color={MM_Colors.text} />
              <Text style={styles.settingLabel}>Change PIN</Text>
            </Pressable>
            {!hasDecoyPin && (
              <Pressable style={styles.settingRow} onPress={() => { setIsSettingsVisible(false); setSetupStep('decoy'); setIsAuthenticated(false); }}>
                <Ionicons name="eye-off-outline" size={22} color={MM_Colors.text} />
                <Text style={styles.settingLabel}>Setup Decoy Mode</Text>
              </Pressable>
            )}
            <Pressable style={styles.settingRow} onPress={removePin}>
              <Ionicons name="trash-outline" size={22} color={MM_Colors.error} />
              <Text style={[styles.settingLabel, { color: MM_Colors.error }]}>Reset Vault</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!viewingMedia} animationType="fade" statusBarTranslucent>
        <View style={styles.viewerContainer}>
          <Pressable style={styles.viewerClose} onPress={() => setViewingMedia(null)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </Pressable>
          {viewingMedia?.type === 'video' ? (
             <VideoView style={styles.fullMedia} player={videoPlayer} allowsFullscreen allowsPictureInPicture />
          ) : (
            <Image source={{ uri: viewingMedia?.uri }} style={styles.fullMedia} resizeMode="contain" />
          )}
          <View style={styles.viewerActions}>
            <Pressable style={styles.viewerBtn} onPress={() => handleUnhide(viewingMedia!)}>
               <Ionicons name="download-outline" size={24} color="#FFF" />
               <Text style={styles.viewerBtnText}>Restore</Text>
            </Pressable>
            <Pressable style={styles.viewerBtn} onPress={() => handleRemove(viewingMedia!)}>
               <Ionicons name="trash-outline" size={24} color="#FF4B4B" />
               <Text style={[styles.viewerBtnText, { color: '#FF4B4B' }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isPassModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.passModal}>
             <Text style={styles.passModalTitle}>Add Password</Text>
             <TextInput placeholder="Website / App" style={styles.input} value={newSite} onChangeText={setNewSite} placeholderTextColor={MM_Colors.textVariant} />
             <TextInput placeholder="Username" style={styles.input} value={newUser} onChangeText={setNewUser} autoCapitalize="none" placeholderTextColor={MM_Colors.textVariant} />
             <TextInput placeholder="Password" style={styles.input} value={newPass} onChangeText={setNewPass} secureTextEntry placeholderTextColor={MM_Colors.textVariant} />
             <View style={styles.modalBtns}>
                <Pressable onPress={() => setIsPassModalVisible(false)} style={styles.cancelBtn}>
                   <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={addPassword} style={styles.saveBtn}>
                   <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
             </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MM_Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  title: { ...Typography.h2, color: MM_Colors.text },
  tabContainer: { flexDirection: 'row', padding: 20, gap: 15 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0EFFF' },
  activeTab: { backgroundColor: MM_Colors.primary },
  tabText: { fontWeight: '600', color: MM_Colors.textVariant },
  activeTabText: { color: '#FFF' },
  listContent: { paddingHorizontal: 15, paddingBottom: 100 },
  mediaItem: { width: (width - 40) / 3, height: (width - 40) / 3, margin: 2, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E9E5FF' },
  mediaImage: { width: '100%', height: '100%' },
  videoBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 10 },
  passItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 10, ...Shadows.small },
  passIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0EFFF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  passInfo: { flex: 1 },
  passSite: { fontSize: 16, fontWeight: '700', color: MM_Colors.text },
  passUser: { fontSize: 13, color: MM_Colors.textVariant, marginTop: 2 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: MM_Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.medium },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: MM_Colors.text, marginTop: 20 },
  emptySubtitle: { textAlign: 'center', color: MM_Colors.textVariant, marginTop: 10, lineHeight: 20 },
  authContainer: { flex: 1, backgroundColor: MM_Colors.background },
  authMain: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  identityContainer: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.medium, marginBottom: 20 },
  authHeading: { fontSize: 24, fontWeight: '800', color: MM_Colors.text },
  authSubtitle: { fontSize: 15, color: MM_Colors.textVariant, marginTop: 5 },
  pinDisplay: { flexDirection: 'row', gap: 15, marginBottom: 50 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: MM_Colors.primaryLight },
  pinDotActive: { backgroundColor: MM_Colors.primary, borderColor: MM_Colors.primary },
  numpadGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center', gap: 20 },
  numpadBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.small },
  numpadText: { fontSize: 28, fontWeight: '600', color: MM_Colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: MM_Colors.text },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: MM_Colors.text },
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullMedia: { width: '100%', height: '70%' },
  viewerActions: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 40 },
  viewerBtn: { alignItems: 'center' },
  viewerBtnText: { color: '#FFF', fontSize: 12, marginTop: 8, fontWeight: '600' },
  passModal: { backgroundColor: '#FFF', margin: 30, borderRadius: 24, padding: 25, ...Shadows.medium },
  passModalTitle: { fontSize: 18, fontWeight: '800', color: MM_Colors.text, marginBottom: 20 },
  input: { height: 50, backgroundColor: '#F9F5FF', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, color: MM_Colors.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 5 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  saveBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: MM_Colors.primary },
  cancelBtnText: { fontWeight: '700', color: MM_Colors.textVariant },
  saveBtnText: { fontWeight: '700', color: '#FFF' },
});