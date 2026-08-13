import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

const CARDS = [
  {
    type: 'dine_in',
    icon: '🍽',
    title: 'Dine In',
    subtitle: 'Enjoy the restaurant experience',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  },
  {
    type: 'takeaway',
    icon: '📦',
    title: 'Takeaway',
    subtitle: 'Pack it fresh, pick it up',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  },
  {
    type: 'delivery',
    icon: '🛵',
    title: 'Delivery',
    subtitle: 'We bring it to your door',
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&q=80',
  },
];

export default function Landing() {
  const navigation = useNavigation();
  const { user, selectOrderType } = useAuth();

  const handleSelect = (type) => {
    selectOrderType(type);
    if (user) navigation.navigate('Menu');
    else navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            Flavours <Text style={styles.logoAccent}>BOB</Text>
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Newtown, Kolkata</Text>
          </View>
          <Text style={styles.title}>
            Battle <Text style={styles.titleItalic}>of</Text> Buds
          </Text>
          <Text style={styles.subtitle}>
            Authentic Biryani, Thali, Starters & more — crafted with love, delivered fresh to your
            doorstep or savoured at our place.
          </Text>
        </View>

        <View style={styles.cards}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.type}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => handleSelect(card.type)}
            >
              <Image source={{ uri: card.image }} style={styles.cardImage} />
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>C Block Gate, Shapoorji Complex, Newtown</Text>
          <Text style={styles.footerText}>12:30 PM to 11:00 PM · 9330759429</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: { padding: 20, paddingBottom: 32 },
  header: { marginBottom: 28 },
  logo: { fontFamily: 'Georgia', fontSize: 26, fontStyle: 'italic', color: colors.textPrimary },
  logoAccent: { color: colors.accent },
  hero: { marginBottom: 32 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentLight, marginRight: 8 },
  badgeText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  title: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 56,
    lineHeight: 60,
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 12,
  },
  titleItalic: { color: colors.accent },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, maxWidth: 320 },
  cards: { gap: 16 },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 150,
    backgroundColor: colors.bgDark,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,18,16,0.55)' },
  cardContent: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  cardIcon: { fontSize: 22, marginBottom: 4 },
  cardTitle: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 26,
    color: colors.textOnDark,
  },
  cardSubtitle: { color: 'rgba(253,246,238,0.85)', fontSize: 13, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 32, gap: 4 },
  footerText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
