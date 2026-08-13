import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../utils/api';
import { colors } from '../theme';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '✓' },
  { key: 'accepted', label: 'Accepted', icon: '✅' },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

const STATUS_TO_STEP = { pending: 0, accepted: 1, preparing: 1, ready: 1, completed: 2, cancelled: -1 };

export default function OrderTracking() {
  const navigation = useNavigation();
  const { id } = useRoute().params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    try {
      const o = await api.getOrder(id);
      setOrder(o);
      setLoading(false);
    } catch (err) {
      console.error('Order tracking error:', err);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    pollRef.current = setInterval(fetchOrder, 10000);
    return () => clearInterval(pollRef.current);
  }, [fetchOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.muted}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentIdx = STATUS_TO_STEP[order.status] ?? -1;
  const isCancelled = order.status === 'cancelled';
  const orderAge = order.created_at ? (Date.now() - new Date(order.created_at).getTime()) / 60000 : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
            <Text style={styles.navLink}>← Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.navLink}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.navLink}>My Orders</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Order Tracking</Text>
        <Text style={styles.orderIdText}>#{order.id} • {order.order_type.replace('_', ' ').toUpperCase()}</Text>

        {isCancelled ? (
          <View style={styles.cancelledBox}>
            <Text style={styles.cancelledIcon}>❌</Text>
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.muted}>Your order has been cancelled by the restaurant.</Text>
          </View>
        ) : (
          <>
            {order.status === 'pending' && orderAge > 5 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⏳ Restaurant hasn't confirmed your order yet. Please contact them directly.
                </Text>
              </View>
            )}

            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, idx) => {
                let status = 'pending';
                if (idx < currentIdx) status = 'completed';
                else if (idx === currentIdx) status = 'active';
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={[styles.stepDot, status === 'completed' && styles.stepDotCompleted, status === 'active' && styles.stepDotActive]}>
                      <Text style={[styles.stepDotText, (status === 'completed' || status === 'active') && { color: '#fff' }]}>
                        {status === 'completed' ? '✓' : step.icon}
                      </Text>
                    </View>
                    <Text style={[styles.stepLabel, status === 'active' && styles.stepLabelActive, status === 'completed' && styles.stepLabelCompleted]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Details</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{item.name} × {item.quantity}</Text>
              <Text style={styles.summaryValue}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          {order.delivery_charge > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charge</Text>
              <Text style={styles.summaryValue}>₹{order.delivery_charge}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>₹{order.total_amount}</Text>
          </View>
        </View>

        {order.area ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Delivery Address</Text>
            <Text style={styles.infoText}>
              {order.block}, {order.area}, Flat {order.flat_number}, Room {order.room_number}
            </Text>
          </View>
        ) : null}

        {order.special_instructions ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Special Instructions</Text>
            <Text style={styles.infoText}>{order.special_instructions}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.buttonGhostText}>Order More</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.buttonText}>My Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: { padding: 20, paddingBottom: 40 },
  navRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  navLink: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  title: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 36, color: colors.textPrimary, marginBottom: 8 },
  orderIdText: { color: colors.textMuted, fontSize: 14, marginBottom: 28 },
  cancelledBox: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  cancelledIcon: { fontSize: 48 },
  cancelledTitle: { fontSize: 18, fontWeight: '700', color: colors.danger },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: 'rgba(230,81,0,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  warningText: { color: colors.warning, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  timeline: { gap: 0, marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgWarm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepDotCompleted: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepDotActive: { backgroundColor: colors.accent, borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  stepDotText: { fontSize: 14 },
  stepLabel: { fontSize: 15, color: colors.textSecondary },
  stepLabelActive: { color: colors.accent, fontWeight: '700' },
  stepLabelCompleted: { color: colors.textPrimary, fontWeight: '600' },
  summary: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 24,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { color: colors.textPrimary, fontSize: 14 },
  summaryValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  summaryTotal: { borderTopWidth: 1.5, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 },
  summaryTotalLabel: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  summaryTotalValue: { fontSize: 18, fontWeight: '700', color: colors.accent },
  infoBox: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  infoText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  button: { flex: 1, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonGhost: { backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonGhostText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
