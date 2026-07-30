const db = require('./db');

// Comprehensive image mapping by food category/type
const CATEGORY_IMAGES = {
  // Biryani
  'Biryani': [
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
    'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&q=80',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
    'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&q=80',
    'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&q=80',
  ],
  // Thali
  'Regular Thali': [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  ],
  'Special Thali': [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80',
  ],
  // Rice
  'Rice': [
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
    'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  ],
  // Noodles
  'Noodles': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80',
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80',
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80',
    'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&q=80',
  ],
  // Veg Starter
  'Veg Starter': [
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80',
    'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&q=80',
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  ],
  // Roll
  'Roll': [
    'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&q=80',
    'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=400&q=80',
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
    'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&q=80',
  ],
  // Roti/Paratha
  'Roti/Paratha': [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'https://images.unsplash.com/photo-1586444248879-bc604cbd555a?w=400&q=80',
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  ],
  // Veg Main Course
  'Veg Main Course': [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
  ],
  // Non Veg Main Course
  'Non Veg Main Course': [
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  ],
  // Combo/Meal
  'Combo/Meal for One': [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  ],
  // Fish
  'Fish Dishes': [
    'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&q=80',
    'https://images.unsplash.com/photo-1534604973900-c43ce4d7b3c7?w=400&q=80',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  ],
  // Momo
  'Momo': [
    'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&q=80',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  ],
  // Cold Drinks
  'Cold Drinks': [
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
    'https://images.unsplash.com/photo-1581006852262-e4307cf62839?w=400&q=80',
  ],
  // Soup
  'Soup': [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
  ],
  // Tandoor
  'Tandoor': [
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
  ],
  // Non Veg Starter
  'Non Veg Starter': [
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
    'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&q=80',
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80',
  ],
  // Salad & Sauce
  'Salad & Sauce & Raita': [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  ],
  // Fried Chicken
  "Flavour's Fried Chicken": [
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
    'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80',
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&q=80',
  ],
  // Pure Veg
  'Pure Veg Dishes': [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  ],
  // Rice Noodles
  'Rice Noodles / Mei-Foon': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80',
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80',
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80',
  ],
};

// Name-based overrides for more specific images
const NAME_OVERRIDES = {
  // Biryani specific
  'Chicken Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  'Mutton Biryani': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80',
  'Egg Biryani': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'Veg Biryani': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
  'Soya Biryani': 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&q=80',
  'Paneer Biryani': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80',
  'Mushroom Biryani': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Chicken Keema Biryani': 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&q=80',
  'Chicken Tikka Biryani': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&q=80',
  'Special Chicken Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  
  // Thali
  'Regular Veg Thali': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  'Regular Egg Thali': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
  'Regular Chicken Thali': 'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
  'Regular Mutton Thali': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
  'Regular Fish Thali': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&q=80',
  'Special Veg Thali - Roti': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  'Special Egg Thali - Roti': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
  'Special Fish Thali - Roti': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&q=80',
  'Special Chicken Thali - Roti': 'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
  'Regular Fish Thali': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&q=80',
  'Jhuri Alu Bhaja': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'Shabji Dal': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  'Regular Shabji': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',

  // Rice specific
  'Jeera Rice': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80',
  'Sweet Pulao': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
  'Veg Fried Rice': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&q=80',
  'Egg Fried Rice': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Chicken Fried Rice': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
  'Prawn Fried Rice': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  'Mixed Fried Rice': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',

  // Noodles specific
  'Veg Noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
  'Egg Noodles': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80',
  'Chicken Noodles': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80',
  'Mixed Noodles': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80',
  'Schezwan Veg Noodles': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&q=80',

  // Roti/Paratha
  'Lachha Paratha': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'Alu Paratha': 'https://images.unsplash.com/photo-1586444248879-bc604cbd555a?w=400&q=80',
  'Paneer Paratha': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'Egg Mughlai Paratha': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Chicken Mughlai Paratha': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
  'Butter Naan': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'Garlic Naan': 'https://images.unsplash.com/photo-1586444248879-bc604cbd555a?w=400&q=80',
  'Plain Naan': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',

  // Veg Main Course
  'Paneer Butter Masala (6 Pcs)': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  'Kadhai Paneer': 'https://images.unsplash.com/photo-1567364816519-cbc9c4fff6d7?w=400&q=80',
  'Paneer Chilli': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  'Dal Tadka': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  'Dal Fry': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  'Mixed Veg': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
  'Mushroom Masala': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',

  // Non Veg
  'Chicken Curry': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
  'Mutton Curry': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'Chicken Butter Masala': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
  'Chicken Tikka Masala': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'Chicken Chaap': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Mutton Chaap': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
  'Chicken Kasha': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'Mutton Kasha': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'Chicken Kosha': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
  'Mutton Kosha': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',

  // Tandoor
  'Tandoori Chicken (Full)': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'Tandoori Chicken (Half)': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'Chicken Tikka Kabab': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
  'Paneer Tikka': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',

  // Starter
  'Chicken Lollipop/Drums of Heaven': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
  'Chicken 65': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80',
  'Dry Chilli Chicken (6 Pcs)': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&q=80',

  // Fried Chicken
  'Chicken Popcorn': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
  'Chicken Strips': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80',
  'Crispy Chicken Wings': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&q=80',

  // Fish
  'Fish Curry': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&q=80',
  'Fish Fry': 'https://images.unsplash.com/photo-1534604973900-c43ce4d7b3c7?w=400&q=80',
  'Fish Finger': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80',
  'Prawn Malai Curry': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Prawn Masala': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',

  // Salad
  'Green Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'Tomato Ketchup': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Mayonnaise': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',

  // Drinks
  'Water 1 Ltr': 'https://images.unsplash.com/photo-1523362628745-0c100fc988a6?w=400&q=80',
  '750ML Coke': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',

  // Soup
  'Chicken Hot & Sour Soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  'Veg Hot & Sour Soup': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',

  // Momo
  'Chicken Momo Steamed (6 Pcs)': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&q=80',
  'Chicken Momo Fried (6 Pcs)': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80',
  'Chicken Momo Pan Fried (6 Pcs)': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  'Chicken Momo Tandoor': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&q=80',
};

const cats = db.prepare('SELECT id, name FROM categories ORDER BY sort_order').all();
const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

const items = db.prepare('SELECT id, name, category_id, image_url FROM menu_items').all();
const missing = items.filter(i => !i.image_url);

let updated = 0;
const stmt = db.prepare('UPDATE menu_items SET image_url = ? WHERE id = ?');

const updateAll = db.transaction(() => {
  for (const item of missing) {
    let imgUrl = null;

    // Check name override first
    if (NAME_OVERRIDES[item.name]) {
      imgUrl = NAME_OVERRIDES[item.name];
    } else {
      // Find category name
      const catName = Object.entries(catMap).find(([_, id]) => id === item.category_id)?.[0];
      if (catName && CATEGORY_IMAGES[catName]) {
        const imgs = CATEGORY_IMAGES[catName];
        // Use item ID to pick a consistent image
        imgUrl = imgs[item.id % imgs.length];
      }
    }

    if (imgUrl) {
      stmt.run(imgUrl, item.id);
      updated++;
    }
  }
});

updateAll();
console.log(`Updated ${updated} items with images`);
console.log(`Total items: ${items.length}, Previously had images: ${items.length - missing.length}, Now all have images: ${items.length - missing.length + updated}`);
