export const Brand = {
  cream: '#fff3de', panel: '#fff8eb', charcoal: '#211e1a', orange: '#c93910', muted: '#665a4b', lime: '#d2e344',
  display: 'Anton', body: 'Inter',
};

const foodImages: Record<string, number> = {
  'The Original Beef Roll': require('@/assets/food/hero.webp'),
  'Chicken Shawarma': require('@/assets/food/chicken.webp'),
  'Suya Shawarma': require('@/assets/food/suya.webp'),
  'Falafel Wrap': require('@/assets/food/falafel.webp'),
  'Spiced Fries': require('@/assets/food/fries.webp'),
  Zobo: require('@/assets/food/zobo.webp'),
};
export function productImage(name: string) { return foodImages[name]; }
