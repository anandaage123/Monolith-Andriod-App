import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, Alert, View, Text, Animated, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 800, useNativeDriver: true
    }).start(() => {
       Animated.timing(fadeAnim, {
          toValue: 0, duration: 800, delay: 1800, useNativeDriver: true
       }).start(() => setShowSplash(false));
    });

    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Storage permission is required to access files.');
      }
    })();
  }, []);

  if (showSplash) {
     return (
        <View style={styles.splashContainer}>
          <StatusBar hidden />
          <Animated.View style={{opacity: fadeAnim, alignItems: 'center'}}>
             <Text style={styles.splashText}>Innovated By</Text>
             <Text style={styles.splashTitle}>Anand Aage</Text>
          </Animated.View>
        </View>
     );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E2C" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#1E1E2C', justifyContent: 'center', alignItems: 'center' },
  splashText: { color: '#8E8E93', fontSize: 16, fontWeight: '600', marginBottom: 8, letterSpacing: 4, textTransform: 'uppercase' },
  splashTitle: { color: '#FFD700', fontSize: 42, fontWeight: 'bold', letterSpacing: 1, textShadowColor: 'rgba(255, 215, 0, 0.3)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 10 }
});
