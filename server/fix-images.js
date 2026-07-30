const db = require('better-sqlite3')('../flavours_bob.db');

const UNSPLASH = w => `https://images.unsplash.com/${w}?w=400&q=80`;

const imageMap = {
  // Biryani (cat 1)
  'Biryani': UNSPLASH('photo-1505253758473-96b7015fcd40'),
  'Combo Egg Biryani + Chaap': UNSPLASH('photo-1596797038530-2c107229654b'),
  'Combo Chicken Biryani + Chaap': UNSPLASH('photo-1596797038530-2c107229654b'),
  'Tikka Handi Biryani': UNSPLASH('photo-1563379091339-03b21ab4a4f8'),
  'Mutton Handi Biryani': UNSPLASH('photo-1603133872878-684f208fb84b'),
  'Extra Chicken Piece': UNSPLASH('photo-1580476262798-bddd9f4b7369'),
  'Chicken Handi Biryani': UNSPLASH('photo-1563379091339-03b21ab4a4f8'),
  'Egg Handi Biryani': UNSPLASH('photo-1512058564366-18510be2db19'),
  'Raita': UNSPLASH('photo-1601050690597-df0568f70950'),
  'Onion Salad': UNSPLASH('photo-1512621776951-a57141f2eefd'),
  // Regular Thali (cat 2)
  'Regular Veg Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Egg Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Fish Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Chicken Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Mutton Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Pabda Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Prawn Thali': UNSPLASH('photo-1534422298391-e4f8c172dddb'),
  'Regular Veg Thali - Roti': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Regular Egg Thali - Roti': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Regular Chicken Thali - Roti': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Regular Fish Thali - Roti': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Regular Mutton Thali - Roti': UNSPLASH('photo-1604909052743-94e838986d24'),
  // Special Thali (cat 3)
  'Special Veg Thali': UNSPLASH('photo-1565299624946-b28f40a0ae38'),
  'Special Egg Thali': UNSPLASH('photo-1565299624946-b28f40a0ae38'),
  'Special Fish Thali': UNSPLASH('photo-1565299624946-b28f40a0ae38'),
  'Special Chicken Thali': UNSPLASH('photo-1565299624946-b28f40a0ae38'),
  // Rice (cat 4)
  'Steamed Rice': UNSPLASH('photo-1516684732162-798a0062be99'),
  // Veg Starter (cat 6)
  'Paneer Pakada': UNSPLASH('photo-1567188040759-fb8a883dc6d8'),
  'Dry Veg Manchurian': UNSPLASH('photo-1625398407796-82650a8c135f'),
  'Dry Chilli Veg Ball': UNSPLASH('photo-1625398407796-82650a8c135f'),
  'Crispy Baby Corn': UNSPLASH('photo-1555126634-323283e090fa'),
  'Dry Chilli Mushroom': UNSPLASH('photo-1622483767028-3f66f32aef97'),
  'Dry Chilli Paneer': UNSPLASH('photo-1567188040759-fb8a883dc6d8'),
  'Soya Chaap Pakada': UNSPLASH('photo-1601050690597-df0568f70950'),
  'Chilli Honey Potato': UNSPLASH('photo-1540189549336-e6e99c3679fe'),
  // Roll (cat 7)
  'Double Egg Roll': UNSPLASH('photo-1555126634-323283e090fa'),
  'Chicken Roll': UNSPLASH('photo-1586444248879-bc604cbd555a'),
  'Mushroom Roll': UNSPLASH('photo-1555126634-323283e090fa'),
  'Paneer Roll': UNSPLASH('photo-1565557623262-b51c2513a641'),
  'Egg Chicken Roll': UNSPLASH('photo-1586444248879-bc604cbd555a'),
  'Double Egg Chicken Roll': UNSPLASH('photo-1586444248879-bc604cbd555a'),
  'Chicken Healthy Wrap (Oil Free)': UNSPLASH('photo-1588166524941-3bf61a9c41db'),
  'Paneer Healthy Wrap (Veg)': UNSPLASH('photo-1565557623262-b51c2513a641'),
  // Non Veg Main Course (cat 10)
  'Egg Curry': UNSPLASH('photo-1512058564366-18510be2db19'),
  'Egg Tadka': UNSPLASH('photo-1512058564366-18510be2db19'),
  'Double Egg Tadka': UNSPLASH('photo-1512058564366-18510be2db19'),
  'Chicken Tadka': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Egg Chicken Tadka': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Chicken Kasa': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Chicken Curry': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Chicken Do Piyaza': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Kadhai Chicken': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Chicken Bhuna Masala': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Chicken Black Pepper': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Methi Chicken': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Chicken Bharta': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Chicken Butter Masala': UNSPLASH('photo-1603894584373-5ac82b2ae5b2'),
  'Chicken Tikka Masala': UNSPLASH('photo-1603894584373-5ac82b2ae5b2'),
  'Chicken Tikka Butter Masala': UNSPLASH('photo-1603894584373-5ac82b2ae5b2'),
  'Chicken Handi': UNSPLASH('photo-1567620832903-9fc6debc209f'),
  'Tandoori Chicken Masala': UNSPLASH('photo-1599487488170-d11ec9c172f0'),
  'Chilli Chicken': UNSPLASH('photo-1585032226651-759b368d7246'),
  'Garlic Chicken': UNSPLASH('photo-1585032226651-759b368d7246'),
  'Garlic Chicken Sweet': UNSPLASH('photo-1585032226651-759b368d7246'),
  'Garlic Chicken Hot': UNSPLASH('photo-1585032226651-759b368d7246'),
  'Chicken Manchurian': UNSPLASH('photo-1625398407796-82650a8c135f'),
  'Chicken Schezwan': UNSPLASH('photo-1625398407796-82650a8c135f'),
  'Mutton Kasa': UNSPLASH('photo-1519708227418-c8fd9a32b7a2'),
  'Mutton Curry': UNSPLASH('photo-1519708227418-c8fd9a32b7a2'),
  'Mutton Handi': UNSPLASH('photo-1519708227418-c8fd9a32b7a2'),
  'Kancha Lanka Murg': UNSPLASH('photo-1604909052743-94e838986d24'),
  'Omelette': UNSPLASH('photo-1512058564366-18510be2db19'),
};

const update = db.prepare('UPDATE menu_items SET image_url = ? WHERE id = ?');
let count = 0;
const items = db.prepare('SELECT id, name FROM menu_items WHERE image_url LIKE ?').all('%flavoursbattleofbuds%');
items.forEach(item => {
  const url = imageMap[item.name];
  if (url) {
    update.run(url, item.id);
    count++;
    console.log('OK', item.id, item.name);
  } else {
    console.log('MISSING mapping for:', item.name);
  }
});
console.log('Updated:', count);
