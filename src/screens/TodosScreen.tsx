import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MM_Colors, Typography, Shadows, Spacing } from '../theme/Theme';

const { width } = Dimensions.get('window');

type Priority = 'low' | 'med' | 'high';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  isPrimary?: boolean;
}

export default function TodosScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('med');
  const [isAdding, setIsAdding] = useState(false);
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const stored = await AsyncStorage.getItem('@daily_todos_v3');
      let loadedTodos: Todo[] = stored ? JSON.parse(stored) : [];
      const today = new Date().toDateString();
      const lastDate = await AsyncStorage.getItem('@todos_last_date');

      if (lastDate !== today) {
        loadedTodos = loadedTodos.map(t => ({ ...t, completed: false }));
        await AsyncStorage.setItem('@todos_last_date', today);
        await AsyncStorage.setItem('@daily_todos_v3', JSON.stringify(loadedTodos));
      }
      setTodos(loadedTodos);
    } catch (e) {}
  };

  const saveTodos = async (newTodos: Todo[]) => {
    setTodos(newTodos); 
    try {
      await AsyncStorage.setItem('@daily_todos_v3', JSON.stringify(newTodos));
    } catch (e) {}
  };

  const addTodo = () => {
    if (inputText.trim()) {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: inputText.trim(),
        completed: false,
        priority: selectedPriority,
        isPrimary: todos.length === 0
      };
      const updated = [newTodo, ...todos].sort((a, b) => {
        const pVal = { high: 3, med: 2, low: 1 };
        return pVal[b.priority] - pVal[a.priority];
      });
      saveTodos(updated);
      setInputText('');
      setIsAdding(false);
    }
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTodos(newTodos);
  };

  const deleteTodo = (id: string) => {
      saveTodos(todos.filter(t => t.id !== id));
  };

  const confirmClear = () => {
    saveTodos([]);
    setIsClearModalVisible(false);
  };

  const getPriorityColor = (p: Priority) => {
    if (p === 'high') return MM_Colors.error;
    if (p === 'med') return MM_Colors.secondary;
    return MM_Colors.tertiary;
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</Text>
          <Text style={styles.title}>Daily Tasks</Text>
        </View>
        <Pressable
          onPress={() => setIsClearModalVisible(true)}
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="broom" size={24} color={MM_Colors.primary} />
        </Pressable>
      </View>

      <LinearGradient
        colors={[MM_Colors.primary, MM_Colors.primaryLight]}
        style={styles.progressCard}
      >
        <View style={styles.progressInfo}>
          <View>
            <Text style={styles.progressTitle}>Focus Metrics</Text>
            <Text style={styles.progressSubtitle}>
              {totalCount === 0
                ? "No tasks set for today"
                : `${completedCount} OF ${totalCount} DONE`}
            </Text>
          </View>
          <MaterialCommunityIcons name="chart-donut" size={32} color={MM_Colors.white} opacity={0.6} />
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressQuote}>
          {progress === 1 ? "Perfect rhythm! You've mastered today." : "Your focus today is sharp. Keep the flow."}
        </Text>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Current Tasks</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.taskCard,
              item.completed && styles.taskCardCompleted,
              { opacity: pressed ? 0.7 : (item.completed ? 0.6 : 1) }
            ]}
            onPress={() => toggleTodo(item.id)}
          >
            <View style={styles.taskMain}>
              <View style={[styles.checkbox, item.completed && { backgroundColor: MM_Colors.primary, borderColor: MM_Colors.primary }]}>
                {item.completed && <Ionicons name="checkmark" size={18} color={MM_Colors.white} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.taskHeaderRow}>
                  <Text style={[styles.taskText, item.completed && styles.taskTextCompleted]}>
                    {item.text}
                  </Text>
                  {item.isPrimary && !item.completed && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>FOCUS</Text>
                    </View>
                  )}
                </View>
                <View style={styles.taskFooter}>
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
                  <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
                </View>
              </View>
            </View>
            <Pressable onPress={() => deleteTodo(item.id)} style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="close-circle-outline" size={22} color={MM_Colors.textVariant} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="notebook-outline" size={64} color={MM_Colors.surfaceContainer} />
            <Text style={styles.emptyText}>The day is quiet. Add a task to begin.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <Modal visible={isClearModalVisible} transparent animationType="fade">
         <View style={styles.modalOverlay}>
            <View style={styles.clearModalContent}>
               <Text style={styles.clearTitle}>Sweep All Tasks?</Text>
               <Text style={styles.clearSub}>This will permanently remove all tasks from your daily list.</Text>
               <View style={styles.clearActions}>
                  <Pressable style={styles.clearCancelBtn} onPress={() => setIsClearModalVisible(false)}>
                     <Text style={styles.clearCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.clearConfirmBtn} onPress={confirmClear}>
                     <Text style={styles.clearConfirmText}>Sweep All</Text>
                  </Pressable>
               </View>
            </View>
         </View>
      </Modal>

      {!isAdding ? (
        <Pressable
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setIsAdding(true)}
        >
          <LinearGradient colors={[MM_Colors.primary, MM_Colors.primaryLight]} style={styles.fabGradient}>
            <Ionicons name="add" size={32} color={MM_Colors.white} />
          </LinearGradient>
        </Pressable>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.addOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAdding(false)} />
          <View style={styles.addSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Task</Text>
              <Pressable onPress={() => setIsAdding(false)}>
                <Text style={{ color: MM_Colors.primary, fontSize: 17 }}>Cancel</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor={MM_Colors.textVariant}
              value={inputText}
              onChangeText={setInputText}
              autoFocus
              onSubmitEditing={addTodo}
            />

            <View style={styles.priorityRow}>
              <Text style={styles.label}>PRIORITY</Text>
              <View style={styles.priorityOptions}>
                {(['low', 'med', 'high'] as Priority[]).map(p => (
                  <Pressable
                    key={p}
                    onPress={() => setSelectedPriority(p)}
                    style={({ pressed }) => [
                      styles.pOption,
                      selectedPriority === p && { backgroundColor: getPriorityColor(p), borderColor: getPriorityColor(p) },
                      { opacity: pressed ? 0.7 : 1 }
                    ]}
                  >
                    <Text style={[styles.pOptionText, selectedPriority === p && { color: MM_Colors.white }]}>
                      {p.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={addTodo}>
              <Text style={styles.submitBtnText}>Add Task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MM_Colors.background },
  listContent: { padding: Spacing.padding, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  headerContent: { marginBottom: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateText: { ...Typography.caption, fontWeight: '700', letterSpacing: 1.5 },
  title: { ...Typography.header },
  iconButton: { padding: 10, backgroundColor: MM_Colors.white, borderRadius: 12, ...Shadows.soft },

  progressCard: { padding: 24, borderRadius: 24, marginBottom: 32, ...Shadows.soft },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressTitle: { ...Typography.title, color: MM_Colors.white, fontSize: 18 },
  progressSubtitle: { ...Typography.caption, color: MM_Colors.white, opacity: 0.8, fontWeight: '700' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 12 },
  progressBarFill: { height: 6, backgroundColor: MM_Colors.white, borderRadius: 3 },
  progressQuote: { ...Typography.body, color: MM_Colors.white, fontSize: 13, fontStyle: 'italic', opacity: 0.9 },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { ...Typography.title, fontSize: 20 },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MM_Colors.white,
    padding: 16,
    borderRadius: Spacing.borderRadius,
    marginBottom: 12,
    ...Shadows.soft,
  },
  taskCardCompleted: { opacity: 0.6 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: MM_Colors.surfaceContainer, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  taskHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  taskText: { ...Typography.body, fontWeight: '600' },
  taskTextCompleted: { textDecorationLine: 'line-through', color: MM_Colors.textVariant },
  primaryBadge: { backgroundColor: MM_Colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  primaryBadgeText: { ...Typography.caption, fontSize: 10, fontWeight: '800', color: MM_Colors.primary },
  taskFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priorityDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  priorityText: { ...Typography.caption, fontSize: 10, fontWeight: '700' },
  deleteBtn: { padding: 4 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { ...Typography.body, color: MM_Colors.textVariant, marginTop: 16, textAlign: 'center' },

  fab: { position: 'absolute', right: 20, bottom: 30, borderRadius: 30, ...Shadows.soft },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },

  addOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  addSheet: { backgroundColor: MM_Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { ...Typography.title },
  input: { ...Typography.body, borderBottomWidth: 1, borderBottomColor: MM_Colors.surfaceContainer, paddingVertical: 12, marginBottom: 24 },
  label: { ...Typography.caption, fontWeight: '700', marginBottom: 12 },
  priorityRow: { marginBottom: 32 },
  priorityOptions: { flexDirection: 'row', gap: 10 },
  pOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: MM_Colors.surfaceContainer, alignItems: 'center' },
  pOptionText: { ...Typography.caption, fontWeight: '700' },
  submitBtn: { backgroundColor: MM_Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: MM_Colors.white, fontSize: 17, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  clearModalContent: { backgroundColor: MM_Colors.white, borderRadius: 14, padding: 20, width: '100%', maxWidth: 280, alignItems: 'center', ...Shadows.soft },
  clearTitle: { ...Typography.title, fontSize: 17, marginBottom: 4 },
  clearSub: { ...Typography.body, fontSize: 13, textAlign: 'center', color: MM_Colors.textVariant, marginBottom: 20 },
  clearActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: MM_Colors.surfaceContainer, width: '100%' },
  clearCancelBtn: { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: MM_Colors.surfaceContainer },
  clearCancelText: { ...Typography.body, color: MM_Colors.primary, fontSize: 17 },
  clearConfirmBtn: { flex: 1, padding: 12, alignItems: 'center' },
  clearConfirmText: { ...Typography.body, color: MM_Colors.error, fontSize: 17, fontWeight: '600' },
});
