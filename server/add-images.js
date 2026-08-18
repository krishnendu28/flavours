const db = require('./db');

const IMG = 'https://www.flavoursbattleofbuds.in/uploads/product_images';

const NAME_OVERRIDES = {
  // ── BIRYANI (confirmed from /home/items?id=6) ──
  'Combo Egg Biryani +Chaap': `${IMG}/images20253.jpeg`,
  'Combo Chicken Biryani + Chaap': `${IMG}/images (1)34849.jpeg`,
  'Tikka Handi Biryani': `${IMG}/Tikka h18649.jpg`,
  'Mutton Handi Biryani': `${IMG}/Mut Handi B46214.jpg`,
  'Chicken Handi Biryani': `${IMG}/Biryani16651.jpeg`,
  'Egg Handi Biryani': `${IMG}/Egg72854.jpeg`,
  'Extra Chicken Piece': `${IMG}/default.png`,

  // ── REGULAR THALI (confirmed from home page) ──
  'Regular Veg Thali': `${IMG}/Thali94759.jpg`,
  'Regular Egg Thali': `${IMG}/Thali78349.jpg`,
  'Regular Fish Thali': `${IMG}/Thali63185.jpg`,
  'Regular Chicken Thali': `${IMG}/Thali56447.jpg`,
  'Regular Mutton Thali': `${IMG}/IMG_20231228_10222246259.jpg`,
  'Regular Pabda Thali': `${IMG}/Thali40895.jpg`,
  'Regular Prawn Thali': `${IMG}/Thali7759.jpg`,

  // ── SPECIAL THALI (confirmed from home page) ──
  'Special Veg Thali': `${IMG}/Thali81297.jpg`,
  'Special Egg Thali': `${IMG}/Thali87486.jpg`,
  'Special Fish Thali': `${IMG}/Thali11256.jpg`,
  'Special Chicken Thali': `${IMG}/Thali57244.jpg`,

  // ── RICE (confirmed from /home/items?id=9) ──
  'Steamed Rice': `${IMG}/Steamed-Rice-Basmati50949.jpg`,
  'Jeera Rice': `${IMG}/jeera-rice-recipe73760.jpg`,
  'Sweet Pulao': `${IMG}/Mishti-Pulao-2-1-1200x180040511.jpg`,
  'Veg Fried Rice': `${IMG}/Veg-Fried-Rice-482077.jpg`,
  'Egg Fried Rice': `${IMG}/Veg-Fried-Rice-442689.jpg`,
  'Chicken Fried Rice': `${IMG}/Veg-Fried-Rice-429623.jpg`,
  'Egg Chicken Fried Rice': `${IMG}/Veg-Fried-Rice-43458.jpg`,
  'Mushroom Fried Rice': `${IMG}/Veg-Fried-Rice-466996.jpg`,
  'Paneer Fried Rice': `${IMG}/Veg-Fried-Rice-495279.jpg`,
  'Prawn Fried Rice': `${IMG}/Veg-Fried-Rice-466570.jpg`,
  'Mixed Fried Rice': `${IMG}/Veg-Fried-Rice-460540.jpg`,
  'Schezwan Veg Fried Rice': `${IMG}/Veg-Fried-Rice-469818.jpg`,
  'Schezwan Egg Fried Rice': `${IMG}/Veg-Fried-Rice-494923.jpg`,
  'Schezwan Chicken Fried Rice': `${IMG}/Veg-Fried-Rice-486649.jpg`,
  'Schezwan Egg Chicken Fried Rice': `${IMG}/Veg-Fried-Rice-410782.jpg`,
  'Schezwan Mushroom Fried Rice': `${IMG}/Veg-Fried-Rice-434556.jpg`,
  'Schezwan Paneer Fried Rice': `${IMG}/Veg-Fried-Rice-482615.jpg`,
  'Schezwan Prawn Fried Rice': `${IMG}/Veg-Fried-Rice-410070.jpg`,
  'Schezwan Mixed Fried Rice': `${IMG}/Veg-Fried-Rice-437859.jpg`,

  // ── NOODLES (confirmed from /home/items?id=10) ──
  'Veg Noodles': `${IMG}/veg-noodles-vegetable-noodles52788.jpg`,
  'Egg Noodles': `${IMG}/veg-noodles-vegetable-noodles47774.jpg`,
  'Chicken Noodles': `${IMG}/veg-noodles-vegetable-noodles49313.jpg`,
  'Egg Chicken Noodles': `${IMG}/veg-noodles-vegetable-noodles47715.jpg`,
  'Mushroom Noodles': `${IMG}/veg-noodles-vegetable-noodles70220.jpg`,
  'Paneer Noodles': `${IMG}/veg-noodles-vegetable-noodles19847.jpg`,
  'Prawn Noodles': `${IMG}/veg-noodles-vegetable-noodles1715.jpg`,
  'Mixed Noodles': `${IMG}/veg-noodles-vegetable-noodles10873.jpg`,
  'Schezwan Veg Noodles': `${IMG}/veg-noodles-vegetable-noodles27050.jpg`,
  'Schezwan Egg Noodles': `${IMG}/veg-noodles-vegetable-noodles47826.jpg`,
  'Schezwan Chicken Noodles': `${IMG}/veg-noodles-vegetable-noodles16774.jpg`,
  'Schezwan Egg Chicken Noodles': `${IMG}/veg-noodles-vegetable-noodles59247.jpg`,
  'Schezwan Mushroom Noodles': `${IMG}/veg-noodles-vegetable-noodles77220.jpg`,
  'Schezwan Paneer Noodles': `${IMG}/veg-noodles-vegetable-noodles83923.jpg`,
  'Schezwan Prawn Noodles': `${IMG}/veg-noodles-vegetable-noodles25701.jpg`,
  'Schezwan Mixed Noodles': `${IMG}/veg-noodles-vegetable-noodles17243.jpg`,
  'Chilli Garlic Egg Noodles': `${IMG}/images (2)46905.jpg`,
  'Chilli Garlic Veg Noodles': `${IMG}/images (2)74842.jpg`,
  'Chilli Garlic Chicken Noodles': `${IMG}/images (2)42977.jpg`,
  'Chilli Garlic Egg Chicken Noodles': `${IMG}/images (2)3319.jpg`,
  'Chilli Garlic Mixed Noodles': `${IMG}/images (2)5656.jpg`,

  // ── VEG MAIN COURSE (confirmed from /home/items?id=14) ──
  'Alu Bhaja': `${IMG}/Alu Bhaja48074.jpg`,
  'Alu Dum': `${IMG}/Aludum88760.jpg`,
  'Dal Tadka': `${IMG}/Screenshot 2024-02-18 12294075678.jpg`,
  'Dal Fry': `${IMG}/dal-fry-with-makhana-recipe-main-photo91793.jpg`,
  'Chana Masala': `${IMG}/chana-masala-recipe-500x37542924.jpg`,
  'Mixed Veg': `${IMG}/sddefault (1)60920.jpg`,
  'Veg Manchurian': `${IMG}/Screenshot 2024-02-18 12025435032.jpg`,
  'Baby Corn Chilli (Gravy)': `${IMG}/baby corn chilli gr75268.jpg`,
  'Baby Corn Manchurian': `${IMG}/baby corn94884.jpg`,
  'Paneer Chilli': `${IMG}/Paneer Chilli Chk8007.jpg`,
  'Paneer Manchurian': `${IMG}/Paneer Man48656.jpg`,
  'Garlic Paneer': `${IMG}/Garlic93871.jpg`,
  'Paneer Do Piyaza': `${IMG}/images (15)79983.jpg`,
  'Kadhai Paneer': `${IMG}/images (14)61487.jpg`,
  'Paneer Bhuna Masala': `${IMG}/images (13)36522.jpg`,
  'Paneer Kashmiri': `${IMG}/images (12)42197.jpg`,
  'Matar Paneer': `${IMG}/images (11)21725.jpg`,
  'Paneer Butter Masala (6Pcs)': `${IMG}/images (10)85496.jpg`,
  'Paneer Butter Masala (6 Pcs)': `${IMG}/images (10)85496.jpg`,
  'Mushrom Chilii': `${IMG}/mushroom-chilly-gravy11542.png`,
  'Mushroom Chilli': `${IMG}/mushroom-chilly-gravy11542.png`,
  'Mushroom Manchurian': `${IMG}/images (9)27392.jpg`,
  'Mushroom Masala': `${IMG}/mushroom-masala-curry90644.jpg`,
  'Kadhai Mushroom': `${IMG}/images (8)13283.jpg`,
  'Mushroom Do Piyaza': `${IMG}/images (7)46188.jpg`,
  'Matar Mushroom Masala': `${IMG}/mushroom-matar-masala77502.jpg`,
  'Soya Chaap Curry': `${IMG}/Screen+Shot+2021-11-05+at+7.31.57+AM75288.jpg`,
  'Soya Chaap Chilli(Soyabin)': `${IMG}/images (2) (12)51673.jpeg`,
  'Soya Chaap Chilli (Soyabin)': `${IMG}/images (2) (12)51673.jpeg`,
  'Soya Chaap Manchurian': `${IMG}/Soya95451.jpg`,
  'Jhuri Alu Bhaja': `${IMG}/Polish_20241113_20514567326542.jpg`,
  'Veg Dal(Mung/Arhar)': `${IMG}/default.png`,
  'Hot Garlic Paneer': `${IMG}/Garlic9387133453.jpg`,
  'Garlic Paneer Sweet': `${IMG}/Garlic9387176234.jpg`,

  // ── RAITA / SALAD (from Biryani page) ──
  'Raita': `${IMG}/Raita97236.jpg`,
  'Onion Salad': `${IMG}/Onion588611069.jpg`,
};

const cats = db.prepare('SELECT id, name FROM categories ORDER BY sort_order').all();
const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

const items = db.prepare('SELECT id, name, category_id, image_url FROM menu_items').all();

let updated = 0;
let matched = 0;
let noMatch = 0;
const stmt = db.prepare('UPDATE menu_items SET image_url = ? WHERE id = ?');

const updateAll = db.transaction(() => {
  for (const item of items) {
    const imgUrl = NAME_OVERRIDES[item.name] || null;
    if (imgUrl && imgUrl !== item.image_url) {
      stmt.run(imgUrl, item.id);
      updated++;
      matched++;
    } else if (imgUrl) {
      matched++;
    } else {
      noMatch++;
    }
  }
});

updateAll();
console.log(`Updated ${updated} items (replaced Unsplash with real BOB images)`);
console.log(`Matched: ${matched}, No match: ${noMatch}, Total: ${items.length}`);
