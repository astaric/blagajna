// Picks a product emoji from Open Food Facts category tags (e.g. ["en:beverages", "en:waters"]).
//
// The table is hand-written from the categories that are most common among Slovenian products in Open Food Facts.
// Rules are tried in order and the FIRST rule matching ANY tag wins, so specific rules must come before general ones
// ("chocolate-spreads" before "spreads", "cheeses" before "milk", "waters" before "beverages").
//
// A stem matches where a tag token starts: "chees" matches "cheeses" and "cream-cheeses", "breakfast-cereal"
// matches "breakfast-cereals", but "bars" does not match "barley". Extend the table by adding a stem to a rule.
// Emoji must exist on iPadOS 14.2+ (no 🫘 etc.).

type Rule = readonly [emoji: string, stems: readonly string[]];

const RULES: readonly Rule[] = [
  // drinks with a clear identity
  ['🍺', ['beer', 'lager']],
  ['🍷', ['wine']],
  ['🥃', ['liqueur', 'spirits', 'whisk', 'vodka', 'brandy']],
  ['🍦', ['ice-cream', 'sorbet', 'frozen-dessert']],
  ['🥤', ['iced-tea', 'ice-tea']],
  ['🧃', ['juice', 'nectar', 'fruit-based-beverage', 'smoothie']],
  ['🍪', ['biscuit', 'cookie', 'wafer']],
  ['🥣', ['muesli', 'breakfast-cereal', 'cereal-flake', 'oat-flake', 'porridge', 'granola']],
  ['🍫', ['chocolat', 'cocoa', 'bars', 'protein-bar']],
  ['🍬', ['candi', 'gummi', 'lollipop', 'marshmallow']],
  ['🧈', ['butter', 'margarine', 'milkfat', 'spreadable-fat']],
  ['🧀', ['chees', 'mozzarella', 'mascarpone', 'parmesan']],
  ['🍆', ['eggplant', 'aubergine']],
  ['🥚', ['egg']],
  ['🥛', ['milk', 'based-drink', 'yogurt', 'yoghurt', 'skyr', 'kefir', 'dairy-substitute']],
  ['🫓', ['flatbread', 'tortilla']],
  ['🍞', ['bread', 'toast', 'bakery', 'baguette']],
  ['🍝', ['pasta', 'noodle', 'spaghetti']],
  ['🍚', ['rice']],
  ['🍅', ['tomato']],
  ['🐟', ['fish', 'tuna', 'salmon', 'seafood', 'sardine']],
  ['🌱', ['meat-analogue', 'meat-alternative']],
  ['🍗', ['chicken', 'poultry', 'turkey']],
  ['🥩', ['meat', 'sausage', 'salami', 'ham', 'bacon']],
  ['🥜', ['peanut', 'cashew', 'walnut', 'pistachio']],
  ['🥥', ['coconut']],
  ['🍉', ['watermelon', 'melon']],
  ['🍎', ['apple']],
  ['🍌', ['banana']],
  ['🍊', ['orange', 'citrus', 'mandarin', 'lemon']],
  ['🍇', ['grape']],
  ['🍓', ['strawberr', 'berries', 'raspberr']],
  ['🍑', ['peach', 'apricot']],
  ['🍒', ['cherr']],
  ['🍍', ['pineapple']],
  ['🍐', ['pears']],
  ['🥔', ['potato']],
  ['🍟', ['chips', 'crisps', 'fries']],
  ['🫒', ['olive', 'oils']],
  ['🌱', ['legume', 'lentil', 'bean', 'chickpea', 'seeds']],
  ['🥫', ['canned', 'sauce', 'condiment', 'mayonnaise', 'ketchup', 'soup', 'bouillon', 'broth']],
  ['🍯', ['honey', 'jam', 'marmalade', 'sweet-spread']],
  ['🍰', ['cake', 'pastr', 'pudding', 'dessert']],
  ['🥨', ['salty-snack', 'appetizer', 'pretzel']],
  ['🌾', ['grain', 'flour']],
  ['🥕', ['vegetable', 'salad']],
  ['🍼', ['baby']],
  // drinks, from specific to general
  ['💧', ['water']],
  ['☕', ['coffee']],
  ['🍵', ['tea']],
  ['🥤', ['soda', 'cola', 'carbonated', 'soft-drink', 'energy-drink', 'instant-beverage', 'beverage']],
  // very general
  ['🍬', ['confectioner', 'sweet-snack']],
  ['🥛', ['dairies', 'dairy']],
  ['🧊', ['frozen']],
  ['🍱', ['meals']],
  ['💪', ['supplement']],
  ['🍿', ['snack']],
];

/** Emoji for the most fitting category, or null when no rule matches (the caller keeps its default). */
export function emojiForCategories(tags: readonly unknown[]): string | null {
  const names = tags
    .filter((t): t is string => typeof t === 'string' && t.startsWith('en:'))
    .map((t) => `-${t.slice(3).toLowerCase()}`);
  for (const [emoji, stems] of RULES) {
    if (names.some((n) => stems.some((s) => n.includes(`-${s}`)))) return emoji;
  }
  return null;
}
