import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { AREAS, TYPE_ICONS, TYPE_LABELS, colors } from '../theme';

function isItemAvailable(item, orderType) {
  const key = `available_${orderType}`;
  if (item[key] !== undefined) return !!item[key];
  return !!item.available;
}

export default function Menu() {
  const navigation = useNavigation();
  const { user, orderType, logout } = useAuth();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [failedImages, setFailedImages] = useState(new Set());

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);

  const [block, setBlock] = useState('');
  const [area, setArea] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');

  const started = useRef(false);

  const loadMenu = useCallback(() => {
    setLoading(true);
    setLoadError('');
    return Promise.all([api.getCategories(), api.getMenuItems()])
      .then(([cats, allItems]) => {
        setCategories(cats);
        setItems(allItems);
        if (cats.length > 0) setActiveCategory((prev) => prev ?? cats[0].id);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Menu API error:', err);
        setLoadError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (started.current) return;
    if (!user) { navigation.replace('Login'); return; }
    if (!orderType) { navigation.replace('Landing'); return; }
    started.current = true;
    loadMenu();
  }, [user, orderType, navigation, loadMenu]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      const price = orderType === 'delivery' ? item.price + 10 : item.price;
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id: item.id, name: item.name, price, basePrice: item.price, qty: 1 }];
    });
  };

  const updateQty = (itemId, delta) => {
    setCart((prev) => prev
      .map((c) => (c.id === itemId ? { ...c, qty: c.qty + delta } : c))
      .filter((c) => c.qty > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const deliveryCharge = orderType === 'delivery' ? 20 : 0;

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory ? item.category_id === activeCategory : true;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));
    return matchesCategory && matchesSearch && isItemAvailable(item, orderType);
  });

  const placeOrder = async () => {
    if (orderType === 'delivery' && (!block || !area || !flatNumber || !roomNumber)) {
      setOrderError('Please fill in all delivery address fields');
      return;
    }
    setOrderError('');
    setOrdering(true);
    try {
      const orderData = {
        order_type: orderType,
        items: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })),
        special_instructions: instructions,
      };
      if (orderType === 'delivery') {
        orderData.block = block;
        orderData.area = area;
        orderData.flat_number = flatNumber;
        orderData.room_number = roomNumber;
      }
      const order = await api.createOrder(orderData);
      setPlacedOrderId(order.id);
      setShowSuccess(true);
      setCart([]);
      setCartOpen(false);
      setBlock(''); setArea(''); setFlatNumber(''); setRoomNumber(''); setInstructions('');
    } catch (err) {
      setOrderError(err.message);
    }
    setOrdering(false);
  };

  const markImageFailed = (id) => {
    setFailedImages((prev) => new Set(prev).add(id));
  };

  const renderItem = ({ item }) => {
    const cartItem = cart.find((c) => c.id === item.id);
    const displayPrice = orderType === 'delivery' ? item.price + 10 : item.price;
    const showImage = item.image_url && !failedImages.has(item.id);
    return (
      <View style={styles.itemCard}>
        {showImage ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.itemImage}
            onError={() => markImageFailed(item.id)}
          />
        ) : null}
        <View style={styles.itemBody}>
          <View style={styles.itemTop}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPrice}>
              ₹{displayPrice}
              {orderType === 'delivery' && <Text style={styles.itemOriginal}> ₹{item.price}</Text>}
            </Text>
          </View>
          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {orderType === 'delivery' ? (
            <Text style={styles.deliveryNote}>+₹10 delivery markup</Text>
          ) : null}
          <View style={styles.itemActions}>
            {cartItem ? (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{cartItem.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.lineTotal}>₹{cartItem.price * cartItem.qty}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                <Text style={styles.addBtnText}>Add to Cart</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const categoriesWithItems = categories
    .map((cat) => ({
      ...cat,
      count: items.filter((i) => i.category_id === cat.id && isItemAvailable(i, orderType)).length,
    }))
    .filter((cat) => cat.count > 0);

  const header = (
    <View>
      <View style={styles.heroBar}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {TYPE_ICONS[orderType]} {TYPE_LABELS[orderType]}
          </Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search our menu..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        <TouchableOpacity
          style={[styles.catChip, activeCategory === null && styles.catChipActive]}
          onPress={() => { setActiveCategory(null); setSearch(''); }}
        >
          <Text style={[styles.catChipText, activeCategory === null && styles.catChipTextActive]}>
            All ({items.filter((i) => isItemAvailable(i, orderType)).length})
          </Text>
        </TouchableOpacity>
        {categoriesWithItems.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
            onPress={() => { setActiveCategory(cat.id); setSearch(''); }}
          >
            <Text style={[styles.catChipText, activeCategory === cat.id && styles.catChipTextActive]}>
              {cat.name} ({cat.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successWrap}>
          <View style={styles.successCheck}>
            <Text style={styles.successCheckIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successMsg}>Your order has been received and is being prepared.</Text>
          <Text style={styles.successOrderId}>#{placedOrderId}</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Order', { id: placedOrderId })}>
            <Text style={styles.buttonText}>Track Your Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghost} onPress={() => { setShowSuccess(false); navigation.navigate('Landing'); }}>
            <Text style={styles.ghostText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          Flavours <Text style={styles.logoAccent}>BOB</Text>
        </Text>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.headerLink}>My Orders</Text>
          </TouchableOpacity>
          <Text style={styles.userBadge}>{user?.name}</Text>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.headerLink}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.muted}>Loading menu...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={loadMenu}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🍽</Text>
              <Text style={styles.muted}>
                No items available for {TYPE_LABELS[orderType]} in this category
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {cartCount > 0 && !showSuccess ? (
        <TouchableOpacity style={styles.cartBar} onPress={() => setCartOpen(true)} activeOpacity={0.9}>
          <Text style={styles.cartBarIcon}>🛒 {cartCount}</Text>
          <Text style={styles.cartBarTotal}>₹{cartTotal + deliveryCharge}</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={styles.drawerWrap}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setCartOpen(false)} activeOpacity={1} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Your Order</Text>
              <TouchableOpacity onPress={() => setCartOpen(false)}>
                <Text style={styles.drawerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
              {cart.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🛒</Text>
                  <Text style={styles.muted}>Your cart is empty</Text>
                </View>
              ) : (
                <>
                  {cart.map((item) => (
                    <View key={item.id} style={styles.drawerItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.drawerItemName}>{item.name}</Text>
                        <Text style={styles.drawerItemPrice}>
                          ₹{item.price} × {item.qty} = ₹{item.price * item.qty}
                        </Text>
                      </View>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qty}>{item.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={styles.summary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>₹{cartTotal}</Text>
                    </View>
                    {deliveryCharge > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Delivery Charge</Text>
                        <Text style={styles.summaryValue}>₹{deliveryCharge}</Text>
                      </View>
                    )}
                    {orderType === 'delivery' && (
                      <Text style={styles.deliveryNote}>₹10 per item markup added for delivery</Text>
                    )}
                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                      <Text style={styles.summaryTotalLabel}>Total</Text>
                      <Text style={styles.summaryTotalValue}>₹{cartTotal + deliveryCharge}</Text>
                    </View>
                  </View>

                  {orderType === 'delivery' && (
                    <>
                      <Text style={styles.sectionTitle}>Delivery Address</Text>
                      <TextInput style={styles.input} placeholder="Block (e.g. C Block)" value={block} onChangeText={setBlock} placeholderTextColor={colors.textMuted} />
                      <View style={styles.areaRow}>
                        {AREAS.map((a) => (
                          <TouchableOpacity
                            key={a}
                            style={[styles.areaChip, area === a && styles.areaChipActive]}
                            onPress={() => setArea(a)}
                          >
                            <Text style={[styles.areaChipText, area === a && styles.areaChipTextActive]}>{a}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Flat number" value={flatNumber} onChangeText={setFlatNumber} placeholderTextColor={colors.textMuted} />
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Room number" value={roomNumber} onChangeText={setRoomNumber} placeholderTextColor={colors.textMuted} />
                      </View>
                    </>
                  )}

                  <Text style={styles.sectionTitle}>Special Instructions</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Any special requests..."
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    placeholderTextColor={colors.textMuted}
                  />

                  {!!orderError && <Text style={styles.errorText}>{orderError}</Text>}
                </>
              )}
            </ScrollView>

            {cart.length > 0 && (
              <View style={styles.drawerFooter}>
                <TouchableOpacity
                  style={[styles.button, ordering && styles.buttonDisabled]}
                  onPress={placeOrder}
                  disabled={ordering}
                  activeOpacity={0.85}
                >
                  {ordering ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Place Order — ₹{cartTotal + deliveryCharge}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logo: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 22, color: colors.textPrimary },
  logoAccent: { color: colors.accent },
  headerNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLink: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  userBadge: {
    backgroundColor: colors.bgWarm,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  heroBar: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  typeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textOnDark,
    fontSize: 14,
  },
  catScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  catChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  catChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  catChipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  itemCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    overflow: 'hidden',
  },
  itemImage: { width: '100%', height: 140, backgroundColor: colors.bgWarm },
  itemBody: { padding: 14 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 16, fontWeight: '700', color: colors.accent },
  itemOriginal: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'line-through', fontWeight: '400' },
  itemDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  deliveryNote: { fontSize: 11, color: colors.warning, marginTop: 6, fontWeight: '600' },
  itemActions: { marginTop: 12, alignItems: 'flex-end' },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    backgroundColor: colors.bgWarm,
    borderRadius: 8,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  qty: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  lineTotal: { fontSize: 14, fontWeight: '700', color: colors.accent },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cartBarIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cartBarTotal: { color: '#fff', fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  errorText: {
    backgroundColor: colors.danger,
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  empty: { alignItems: 'center', padding: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  drawerWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,18,16,0.5)' },
  drawer: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  drawerTitle: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 22, color: colors.textPrimary },
  drawerClose: { fontSize: 20, color: colors.textSecondary },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  drawerItemName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  drawerItemPrice: { fontSize: 13, color: colors.accent, fontWeight: '600', marginTop: 2 },
  summary: { marginTop: 16, paddingTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { color: colors.textSecondary, fontSize: 14 },
  summaryValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  summaryTotal: { borderTopWidth: 1.5, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 },
  summaryTotalLabel: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  summaryTotalValue: { fontSize: 18, fontWeight: '700', color: colors.accent },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 18, marginBottom: 10 },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  areaChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  areaChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  areaChipTextActive: { color: '#fff' },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  ghost: { alignItems: 'center', padding: 14, marginTop: 8 },
  ghostText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successCheck: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successCheckIcon: { color: '#fff', fontSize: 40, fontWeight: '700' },
  successTitle: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 32, color: colors.textPrimary, marginBottom: 8 },
  successMsg: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 12 },
  successOrderId: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 24 },
});
