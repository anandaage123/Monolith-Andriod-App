import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [habits, setHabits] = useState([
    { id: '1', name: 'Drink Water', completed: false, count: 0 },
    { id: '2', name: 'Exercise', completed: false, count: 0 },
    { id: '3', name: 'Read 10 mins', count: 0 },
  ]);

  const onSecretGesture = () => {
    navigation.navigate('VaultSettingsAuth');
  };

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        return { ...h, completed: !h.completed, count: h.completed ? h.count - 1 : h.count + 1 };
      }
      return h;
    }));
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView style={styles.container}>
      <Pressable onLongPress={onSecretGesture} delayLongPress={2000} style={styles.headerArea}>
        <Text style={styles.dateText}>{today}</Text>
        <Text style={styles.greeting}>Good Morning, Hero</Text>
      </Pressable>

      <View style={styles.quoteCard}>
        <Ionicons name="bulb-outline" size={24} color={Colors.primary} style={styles.quoteIcon} />
        <Text style={styles.quoteText}>"The secret of getting ahead is getting started."</Text>
        <Text style={styles.quoteAuthor}>- Mark Twain</Text>
      </View>

      <Text style={styles.sectionTitle}>Daily Habits</Text>
      <View style={styles.habitsContainer}>
        {habits.map((habit) => (
          <TouchableOpacity 
            key={habit.id} 
            style={[styles.habitCard, habit.completed && styles.habitCardCompleted]}
            onPress={() => toggleHabit(habit.id)}
          >
            <View style={styles.habitCircle}>
              {habit.completed && <Ionicons name="checkmark" size={18} color={Colors.text} />}
            </View>
            <Text style={[styles.habitName, habit.completed && styles.habitNameCompleted]}>{habit.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.weatherWidget}>
         <Ionicons name="partly-sunny" size={40} color="#FFD700" />
         <View style={{marginLeft: 15}}>
           <Text style={styles.weatherTemp}>72°F</Text>
           <Text style={styles.weatherDesc}>Partly Cloudy - California</Text>
         </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 60,
  },
  headerArea: {
    marginBottom: 30,
  },
  dateText: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  greeting: {
    ...Typography.header,
    marginTop: 5,
  },
  quoteCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.surfaceHighlight,
  },
  quoteIcon: {
    marginBottom: 10,
  },
  quoteText: {
    ...Typography.body,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteAuthor: {
    ...Typography.caption,
    marginTop: 10,
    textAlign: 'right',
  },
  sectionTitle: {
    ...Typography.title,
    marginBottom: 15,
  },
  habitsContainer: {
    marginBottom: 30,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitCardCompleted: {
    backgroundColor: '#1E4031', // Subtle green tint
    borderColor: Colors.secondary,
  },
  habitCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitName: {
    ...Typography.body,
  },
  habitNameCompleted: {
    color: Colors.secondary,
    textDecorationLine: 'line-through',
  },
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    padding: 20,
    borderRadius: 16,
    marginBottom: 50,
  },
  weatherTemp: {
    ...Typography.title,
    fontSize: 24,
  },
  weatherDesc: {
    ...Typography.caption,
    marginTop: 4,
  }
});
