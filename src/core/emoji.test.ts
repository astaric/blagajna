import { describe, expect, it } from 'vitest';
import { emojiForCategories } from './emoji';

// Tag lists taken from real Open Food Facts products (Slovenian market).
const cases: [string, string[], string][] = [
  ['Donat mineral water', ['en:beverages-and-beverages-preparations', 'en:beverages', 'en:waters'], '💧'],
  ['Radenska', ['en:beverages', 'en:waters', 'en:spring-waters', 'en:mineral-waters'], '💧'],
  ['Nutella', ['en:breakfasts', 'en:spreads', 'en:sweet-spreads', 'en:chocolate-spreads', 'en:hazelnut-spreads'], '🍫'],
  ['Dark chocolate', ['en:cocoa-and-its-products', 'en:chocolates', 'en:dark-chocolates'], '🍫'],
  ['Milk', ['en:dairies', 'en:milks-liquid-and-powder', 'en:milks'], '🥛'],
  ['Yogurt', ['en:dairies', 'en:fermented-foods', 'en:fermented-milk-products', 'en:yogurts'], '🥛'],
  ['Mascarpone', ['en:dairies', 'en:fermented-milk-products', 'en:cheeses', 'en:cream-cheeses'], '🧀'],
  ['Butter', ['en:dairies', 'en:milkfat', 'en:dairy-spreads', 'en:butters'], '🧈'],
  ['Oat drink', ['en:plant-based-beverages', 'en:dairy-substitutes', 'en:milk-substitutes', 'en:oat-based-drinks'], '🥛'],
  ['Rice drink', ['en:beverages', 'en:unsweetened-beverages', 'en:rice-based-drinks'], '🥛'],
  ['Lager', ['en:beverages', 'en:alcoholic-beverages', 'en:beers', 'en:lagers'], '🍺'],
  ['Liqueur', ['en:beverages', 'en:alcoholic-beverages', 'en:liqueurs'], '🥃'],
  ['Cockta', ['en:beverages', 'en:non-alcoholic-beverages', 'en:carbonated-drinks', 'en:sodas'], '🥤'],
  ['Ice tea', ['en:beverages', 'en:tea-based-beverages', 'en:iced-teas', 'en:sweetened-beverages'], '🥤'],
  ['Apple juice', ['en:beverages', 'en:fruit-based-beverages', 'en:juices-and-nectars', 'en:apple-juices'], '🧃'],
  ['Coffee', ['en:beverages', 'en:hot-beverages', 'en:coffees'], '☕'],
  ['Biscuits', ['en:snacks', 'en:sweet-snacks', 'en:biscuits-and-cakes', 'en:biscuits'], '🍪'],
  ['Muesli', ['en:plant-based-foods', 'en:cereals-and-potatoes', 'en:breakfast-cereals', 'en:mueslis'], '🥣'],
  ['Chocolate muesli', ['en:breakfast-cereals', 'en:chocolate-cereals', 'en:mueslis-with-chocolate'], '🥣'],
  ['Bread', ['en:cereals-and-potatoes', 'en:breads', 'en:white-breads', 'en:sliced-breads'], '🍞'],
  ['Wrap', ['en:breads', 'en:flatbreads', 'en:wheat-breads', 'en:wheat-flatbreads'], '🫓'],
  ['Noodles', ['en:cereals-and-potatoes', 'en:pastas-and-dumplings', 'en:pastas', 'en:noodles'], '🍝'],
  ['Rice', ['en:cereal-grains', 'en:seeds', 'en:rices'], '🍚'],
  ['Passata', ['en:condiments', 'en:sauces', 'en:tomatoes-and-their-products', 'en:tomato-sauces'], '🍅'],
  ['Tuna pate', ['en:canned-foods', 'en:fishes-and-their-products', 'en:canned-tunas', 'en:salted-spreads'], '🐟'],
  ['Sunflower oil', ['en:fats', 'en:vegetable-fats', 'en:vegetable-oils', 'en:sunflower-oils'], '🫒'],
  ['Ice cream bar', ['en:frozen-foods', 'en:desserts', 'en:ice-cream-bars', 'en:ice-creams-and-sorbets'], '🍦'],
  ['Lentils', ['en:plant-based-foods', 'en:canned-plant-based-foods', 'en:legumes'], '🌱'],
  ['Meat substitute', ['en:meats-and-their-products', 'en:meat-alternatives', 'en:meat-analogues'], '🌱'],
  ['Salty snack', ['en:snacks', 'en:salty-snacks', 'en:appetizers'], '🥨'],
  ['Crisps', ['en:snacks', 'en:salty-snacks', 'en:chips-and-fries', 'en:crisps'], '🍟'],
  ['Pizza', ['en:meals', 'en:pizzas-pies-and-quiches', 'en:pizzas'], '🍱'],
  ['Pudding mix', ['en:desserts', 'en:dairy-desserts', 'en:puddings'], '🍰'],
];

describe('emojiForCategories', () => {
  it.each(cases)('%s', (_name, tags, emoji) => {
    expect(emojiForCategories(tags)).toBe(emoji);
  });

  it('prefers the specific rule over the general one regardless of tag order', () => {
    expect(emojiForCategories(['en:waters', 'en:beverages'])).toBe('💧');
    expect(emojiForCategories(['en:beverages', 'en:waters'])).toBe('💧');
  });

  it('matches at the start of a word only', () => {
    expect(emojiForCategories(['en:barley'])).toBeNull(); // not "bars"
    expect(emojiForCategories(['en:pearl-barley'])).toBeNull(); // not "pears"
    expect(emojiForCategories(['en:eggplants'])).toBe('🍆'); // not an egg
  });

  it('ignores non-English tags, odd values and unknown categories', () => {
    expect(emojiForCategories(['fr:eaux', 'de:Wasser'])).toBeNull();
    expect(emojiForCategories([42, null, undefined, {}])).toBeNull();
    expect(emojiForCategories([])).toBeNull();
    expect(emojiForCategories(['en:non-food-products', 'en:sun-screen'])).toBeNull();
  });
});
