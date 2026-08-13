import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { STATUS_LABELS, colors } from '../theme';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderHistory() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) { navigation.replace('Login'); return; }
    api.getUserOrders(user.id)
      .then((o) => setOrders(o))
      .catch((err) => console.error('Order history error:', err))
      .finally(() => setLoading(false));
  }, [user, navigation]);

  const renderOrder = ({ item: order }) => {
    const expanded = expandedId === order.id;
    return (
      <View style={[styles.card, expanded && styles.cardExpanded]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(expanded ? null : order.id)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <Text style={styles.orderDate}>
              {formatDate(order.created_at)} • {formatTime(order.created_at)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.statusBadge, { color: statusColor(order.status) }]}>
              {STATUS_LABELS[order.status] || order.status}
            </Text>
            <Text style={styles.orderType}>{order.order_type.replace('_', ' ')}</Text>
            <Text style={styles.orderTotal}>₹{order.total_amount}</Text>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.details}>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name} × {item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
            {order.delivery_charge > 0 && (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Delivery Charge</Text>
                <Text style={styles.itemPrice}>₹{order.delivery_charge}</Text>
              </View>
            )}
            {order.area ? (
              <Text style={styles.note}>
                📍 {order.block}, {order.area}, Flat {order.flat_number}, Room {order.room_number}
              </Text>
            ) : null}
            {order.special_instructions ? (
              <Text style={styles.note}>💬 {order.special_instructions}</Text>
            ) : null}
            <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('Order', { id: order.id })}>
              <Text style={styles.trackBtnText}>Track Order</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerLink}>‹ Menu</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>
          Flavours <Text style={styles.logoAccent}>BOB</Text>
        </Text>
        <Text style={styles.headerLink} />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>Your Orders</Text>
        <Text style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.muted}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.muted}>Start by browsing our menu!</Text>
          <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.buttonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

function statusColor(status) {
  switch (status) {
    case 'completed': return '#2E7D32';
    case 'cancelled': return colors.danger;
    case 'preparing':
    case 'ready': return colors.warning;
    default: return colors.accent;
  }
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
  headerLink: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  logo: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 22, color: colors.textPrimary },
  logoAccent: { color: colors.accent },
  titleBlock: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 32, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardExpanded: { borderColor: colors.border },
  cardHeader: { flexDirection: 'row', padding: 16 },
  orderId: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  orderDate: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  statusBadge: { fontSize: 12, fontWeight: '700' },
  orderType: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', marginTop: 2 },
  orderTotal: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  details: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderLight },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { color: colors.textPrimary, fontSize: 14 },
  itemPrice: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  trackBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  trackBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyIcon: { fontSize: 64, opacity: 0.5 },
  emptyTitle: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 22, color: colors.textSecondary },
  button: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
