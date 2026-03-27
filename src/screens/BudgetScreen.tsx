import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MM_Colors, Typography, Shadows, Spacing } from '../theme/Theme';

const { width } = Dimensions.get('window');

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  comment?: string;
}

const CATEGORIES = {
  expense: [
    { name: 'Food', icon: 'fast-food-outline' },
    { name: 'Transport', icon: 'car-outline' },
    { name: 'Shopping', icon: 'cart-outline' },
    { name: 'Bills', icon: 'receipt-outline' },
    { name: 'Entertainment', icon: 'game-controller-outline' },
    { name: 'Others', icon: 'ellipsis-horizontal-outline' }
  ],
  income: [
    { name: 'Salary', icon: 'cash-outline' },
    { name: 'Freelance', icon: 'laptop-outline' },
    { name: 'Gift', icon: 'gift-outline' },
    { name: 'Others', icon: 'ellipsis-horizontal-outline' }
  ]
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate years from 2020 to current year + 1
const START_YEAR = 2020;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - START_YEAR + 2 }, (_, i) => (START_YEAR + i).toString()).reverse();

export default function BudgetScreen() {
  const isFocused = useIsFocused();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // New Transaction State
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Others');
  const [comment, setComment] = useState('');

  const currentBudgetLimit = budgets[`${selectedMonth}-${selectedYear}`] || 4500;

  useEffect(() => {
    loadData();
  }, [isFocused]);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem('@daily_expenses_v2');
      const storedBudgets = await AsyncStorage.getItem('@budget_limits_v3');
      const oldLimit = await AsyncStorage.getItem('@budget_limit_v2');

      if (stored) setTransactions(JSON.parse(stored));

      let budgetsObj: Record<string, number> = {};
      if (storedBudgets) {
        budgetsObj = JSON.parse(storedBudgets);
      } else if (oldLimit) {
        // Migrate old limit to current month if no budgets exist
        const currentKey = `${MONTHS[new Date().getMonth()]}-${new Date().getFullYear()}`;
        budgetsObj[currentKey] = parseFloat(oldLimit);
      }
      setBudgets(budgetsObj);
    } catch (e) {}
  };

  const saveData = async (newT: Transaction[], newBudgets?: Record<string, number>) => {
    try {
      await AsyncStorage.setItem('@daily_expenses_v2', JSON.stringify(newT));
      if (newBudgets) {
        await AsyncStorage.setItem('@budget_limits_v3', JSON.stringify(newBudgets));
      }
    } catch (e) {}
  };

  const addTransaction = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid number.');
      return;
    }

    const newT: Transaction = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      type,
      date: new Date().toDateString(),
      comment: comment.trim() || undefined
    };

    const updated = [newT, ...transactions];
    setTransactions(updated);
    saveData(updated);
    setAmount('');
    setComment('');
    setCategory('Others');
    setIsAdding(false);
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveData(updated);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return MONTHS[d.getMonth()] === selectedMonth && d.getFullYear().toString() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = currentBudgetLimit - totalExpenses + totalIncome;
  const progress = Math.min(totalExpenses / currentBudgetLimit, 1);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc: any, t) => {
      const found = acc.find((g: any) => g.title === t.date);
      if (found) found.data.push(t);
      else acc.push({ title: t.date, data: [t] });
      return acc;
    }, []);
  }, [filteredTransactions]);

  const updateBudgetLimit = (limit: number) => {
    const key = `${selectedMonth}-${selectedYear}`;
    const newBudgets = { ...budgets, [key]: limit };
    setBudgets(newBudgets);
    saveData(transactions, newBudgets);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* iOS Style Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{selectedYear}</Text>
          <Pressable onPress={() => setIsPickerOpen(true)} style={styles.monthSelector}>
            <Text style={styles.headerTitle}>{selectedMonth}</Text>
            <Ionicons name="chevron-down" size={20} color={MM_Colors.text} style={{ marginLeft: 4, marginTop: 4 }} />
          </Pressable>
        </View>
        <Pressable onPress={() => setIsSettingsOpen(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <View style={styles.settingsBtn}>
            <Ionicons name="options-outline" size={22} color={MM_Colors.primary} />
          </View>
        </Pressable>
      </View>

      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.overviewCard}>
            <LinearGradient
              colors={[MM_Colors.primary, '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balanceLabel}>Remaining Budget</Text>
                  <Text style={styles.balanceAmount}>₹{balance.toLocaleString()}</Text>
                </View>
                <View style={styles.cardIconBg}>
                  <MaterialCommunityIcons name="wallet-outline" size={28} color={MM_Colors.white} />
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Spending</Text>
                  <Text style={styles.progressValue}>
                    ₹{totalExpenses.toLocaleString()} / ₹{currentBudgetLimit.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: progress > 0.9 ? MM_Colors.error : MM_Colors.white }]} />
                </View>
              </View>
            </LinearGradient>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#E5F9E7' }]}>
                  <Ionicons name="arrow-down" size={18} color={MM_Colors.tertiary} />
                </View>
                <View>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text style={[styles.statAmount, { color: MM_Colors.tertiary }]}>+₹{totalIncome.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#FFEBEB' }]}>
                  <Ionicons name="arrow-up" size={18} color={MM_Colors.error} />
                </View>
                <View>
                  <Text style={styles.statLabel}>Expense</Text>
                  <Text style={[styles.statAmount, { color: MM_Colors.error }]}>-₹{totalExpenses.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transactions</Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHeader}>
            <Text style={styles.sectionDate}>{title === new Date().toDateString() ? 'Today' : title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.transactionItem, { opacity: pressed ? 0.7 : 1 }]}
            onLongPress={() => {
              Alert.alert('Delete Entry', 'Remove this transaction?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(item.id) }
              ]);
            }}
          >
            <View style={[styles.itemIcon, { backgroundColor: item.type === 'income' ? '#E5F9E7' : '#F2F2F7' }]}>
              <Ionicons
                name={
                  item.type === 'income'
                    ? (CATEGORIES.income.find(c => c.name === item.category)?.icon as any || 'add')
                    : (CATEGORIES.expense.find(c => c.name === item.category)?.icon as any || 'cart-outline')
                }
                size={20}
                color={item.type === 'income' ? MM_Colors.tertiary : MM_Colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemCategory}>{item.category}</Text>
              {item.comment ? (
                <Text style={styles.itemComment} numberOfLines={1}>{item.comment}</Text>
              ) : (
                <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
              )}
            </View>
            <Text style={[styles.itemAmount, { color: item.type === 'income' ? MM_Colors.tertiary : MM_Colors.text }]}>
              {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString()}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={48} color={MM_Colors.surfaceContainerHigh} />
            </View>
            <Text style={styles.emptyText}>No transactions this month</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first entry</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.8 : 1 }]}
        onPress={() => setIsAdding(true)}
      >
        <LinearGradient colors={[MM_Colors.primary, '#6366F1']} style={styles.fabGradient}>
         <Ionicons name="add" size={30} color="#FFF" />
        </LinearGradient>
      </Pressable>

      {/* Period Picker Modal */}
      <Modal visible={isPickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsPickerOpen(false)} />
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Period</Text>
              <Pressable onPress={() => setIsPickerOpen(false)}>
                <Ionicons name="close-circle" size={24} color={MM_Colors.surfaceContainerHigh} />
              </Pressable>
            </View>

            <View style={styles.pickerBody}>
              <View style={styles.yearListContainer}>
                <Text style={styles.pickerLabel}>YEAR</Text>
                <FlatList
                  data={YEARS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setSelectedYear(item)}
                      style={[styles.yearItem, selectedYear === item && styles.yearItemActive]}
                    >
                      <Text style={[styles.yearItemText, selectedYear === item && styles.yearItemTextActive]}>{item}</Text>
                    </Pressable>
                  )}
                  style={{ height: 240 }}
                />
              </View>

              <View style={styles.monthGridContainer}>
                <Text style={styles.pickerLabel}>MONTH</Text>
                <View style={styles.monthGrid}>
                  {MONTHS.map(m => (
                    <Pressable
                      key={m}
                      onPress={() => {
                        setSelectedMonth(m);
                        setIsPickerOpen(false);
                      }}
                      style={[styles.monthGridItem, selectedMonth === m && styles.monthGridItemActive]}
                    >
                      <Text style={[styles.monthItemText, selectedMonth === m && styles.monthItemTextActive]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal visible={isAdding} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAdding(false)} />
          <View style={styles.addSheet}>
            <View style={styles.sheetIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Entry</Text>
              <Pressable onPress={() => setIsAdding(false)} hitSlop={10}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.typeToggle}>
                <Pressable
                  onPress={() => { setType('expense'); setCategory(CATEGORIES.expense[0].name); }}
                  style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
                >
                  <Text style={[styles.typeBtnText, type === 'expense' && { color: '#FFF' }]}>Expense</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setType('income'); setCategory(CATEGORIES.income[0].name); }}
                  style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
                >
                  <Text style={[styles.typeBtnText, type === 'income' && { color: '#FFF' }]}>Income</Text>
                </Pressable>
              </View>

              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                  placeholderTextColor={MM_Colors.surfaceContainerHigh}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {(type === 'expense' ? CATEGORIES.expense : CATEGORIES.income).map(cat => (
                    <Pressable
                      key={cat.name}
                      onPress={() => setCategory(cat.name)}
                      style={[styles.categoryGridItem, category === cat.name && styles.categoryGridItemActive]}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={22}
                        color={category === cat.name ? MM_Colors.white : MM_Colors.textVariant}
                      />
                      <Text style={[styles.categoryGridText, category === cat.name && { color: '#FFF' }]}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>COMMENT (OPTIONAL)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="What was this for?"
                  value={comment}
                  onChangeText={setComment}
                  placeholderTextColor={MM_Colors.surfaceContainerHigh}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={addTransaction}>
                <Text style={styles.submitBtnText}>Add</Text>
              </Pressable>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSettingsOpen(false)} />
          <View style={styles.settingsContent}>
            <Text style={styles.modalTitle}>Monthly Budget</Text>
            <Text style={styles.settingsSubtitle}>Set your limit for {selectedMonth} {selectedYear}</Text>

            <View style={styles.settingsInputContainer}>
              <Text style={styles.settingsCurrency}>₹</Text>
              <TextInput
                style={styles.settingsInput}
                keyboardType="number-pad"
                defaultValue={currentBudgetLimit.toString()}
                onEndEditing={(e) => {
                  const val = parseFloat(e.nativeEvent.text);
                  if (!isNaN(val)) {
                    updateBudgetLimit(val);
                  }
                }}
                autoFocus
              />
            </View>

            <Pressable style={styles.submitBtn} onPress={() => setIsSettingsOpen(false)}>
              <Text style={styles.submitBtnText}>Save Limit</Text>
            </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.padding,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: MM_Colors.background
  },
  headerSubtitle: { ...Typography.caption, fontWeight: '600', color: MM_Colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { ...Typography.header, fontSize: 28 },
  monthSelector: { flexDirection: 'row', alignItems: 'center' },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: MM_Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.soft },

  listContent: { paddingHorizontal: Spacing.padding },
  overviewCard: { marginBottom: 20 },
  cardGradient: { padding: 20, borderRadius: 24, ...Shadows.soft },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  balanceLabel: { ...Typography.caption, color: MM_Colors.white, opacity: 0.8, fontWeight: '600' },
  balanceAmount: { ...Typography.header, color: MM_Colors.white, fontSize: 32 },
  cardIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  progressContainer: {},
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { ...Typography.caption, color: MM_Colors.white, opacity: 0.8, fontWeight: '600' },
  progressValue: { ...Typography.caption, color: MM_Colors.white, fontWeight: '700' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
  progressBarFill: { height: 8, borderRadius: 4 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statItem: { flex: 1, backgroundColor: MM_Colors.white, padding: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, ...Shadows.soft },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statLabel: { ...Typography.caption, color: MM_Colors.textVariant, fontWeight: '600' },
  statAmount: { ...Typography.body, fontWeight: '700', fontSize: 16 },

  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { ...Typography.title, fontSize: 22, fontWeight: '700' },
  dateHeader: { backgroundColor: MM_Colors.background, paddingVertical: 8 },
  sectionDate: { ...Typography.caption, fontWeight: '700', color: MM_Colors.textVariant, textTransform: 'uppercase', letterSpacing: 0.5 },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MM_Colors.white,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    ...Shadows.soft
  },
  itemIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemCategory: { ...Typography.body, fontWeight: '600', fontSize: 16 },
  itemType: { ...Typography.caption, fontSize: 11, fontWeight: '600', color: MM_Colors.textVariant },
  itemComment: { ...Typography.caption, fontSize: 13, color: MM_Colors.textVariant },
  itemAmount: { ...Typography.body, fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: MM_Colors.white, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...Shadows.soft },
  emptyText: { ...Typography.title, fontSize: 18, color: MM_Colors.text, textAlign: 'center' },
  emptySubtext: { ...Typography.caption, color: MM_Colors.textVariant, textAlign: 'center', marginTop: 4 },

  fab: { position: 'absolute', right: 20, bottom: 30, borderRadius: 30, ...Shadows.soft },
  fabGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },

  // Picker Styles
  pickerContent: { backgroundColor: MM_Colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '80%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickerTitle: { ...Typography.title, fontSize: 22 },
  pickerBody: { flexDirection: 'row', gap: 20 },
  yearListContainer: { flex: 1 },
  monthGridContainer: { flex: 2 },
  pickerLabel: { ...Typography.caption, fontWeight: '700', color: MM_Colors.textVariant, marginBottom: 16, letterSpacing: 1 },
  yearList: {},
  yearItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  yearItemActive: { backgroundColor: MM_Colors.primary + '15' },
  yearItemText: { ...Typography.body, color: MM_Colors.textVariant, fontWeight: '500' },
  yearItemTextActive: { color: MM_Colors.primary, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  monthGridItem: { width: '30%', aspectRatio: 1.2, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: MM_Colors.background },
  monthGridItemActive: { backgroundColor: MM_Colors.primary, ...Shadows.soft },
  monthItemText: { ...Typography.body, fontSize: 15, fontWeight: '600', color: MM_Colors.textVariant },
  monthItemTextActive: { color: MM_Colors.white, fontWeight: '700' },

  // Add Sheet Styles
  addSheet: { backgroundColor: MM_Colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '90%' },
  sheetIndicator: { width: 40, height: 5, backgroundColor: MM_Colors.surfaceContainerHigh, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { ...Typography.title, fontSize: 24 },
  cancelText: { color: MM_Colors.primary, fontSize: 17, fontWeight: '600' },

  typeToggle: { flexDirection: 'row', backgroundColor: MM_Colors.background, borderRadius: 14, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeBtnActiveExpense: { backgroundColor: MM_Colors.error },
  typeBtnActiveIncome: { backgroundColor: MM_Colors.tertiary },
  typeBtnText: { ...Typography.caption, fontWeight: '700', color: MM_Colors.textVariant },

  amountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  currencySymbol: { ...Typography.header, fontSize: 40, color: MM_Colors.textVariant, marginRight: 4, marginTop: 8 },
  amountInput: { ...Typography.header, fontSize: 56, textAlign: 'center', minWidth: 150 },

  inputGroup: { marginBottom: 24 },
  inputLabel: { ...Typography.caption, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryGridItem: {
    width: (width - 48 - 20) / 3,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: MM_Colors.background,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  categoryGridItemActive: { backgroundColor: MM_Colors.primary, borderColor: MM_Colors.primary },
  categoryGridText: { ...Typography.caption, fontWeight: '600', marginTop: 4, fontSize: 11 },

  commentInput: {
    backgroundColor: MM_Colors.background,
    borderRadius: 12,
    padding: 16,
    ...Typography.body,
    fontSize: 16
  },

  submitBtn: {
    backgroundColor: MM_Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    ...Shadows.soft
  },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 18 },

  settingsContent: { backgroundColor: MM_Colors.white, margin: 20, padding: 24, borderRadius: 30, ...Shadows.soft },
  modalTitle: { ...Typography.title, marginBottom: 8, textAlign: 'center', fontSize: 24 },
  settingsSubtitle: { ...Typography.caption, textAlign: 'center', marginBottom: 24 },
  settingsInputContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  settingsCurrency: { ...Typography.header, fontSize: 32, color: MM_Colors.textVariant, marginRight: 8 },
  settingsInput: { ...Typography.header, fontSize: 48, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: MM_Colors.primary, paddingHorizontal: 10 },
});
