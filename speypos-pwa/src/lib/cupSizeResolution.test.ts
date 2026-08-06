import { describe, expect, it } from 'vitest';
import { resolveEffectiveCupSizesForItem } from './cupSizeResolution';

describe('resolveEffectiveCupSizesForItem', () => {
  const cupSizes = [
    { id: 's', size: 'Small', unit: 'oz' },
    { id: 'm', size: 'Medium', unit: 'oz' },
    { id: 'l', size: 'Large', unit: 'oz' },
  ];

  it('falls back to category cup sizes when item has no direct mappings', () => {
    const result = resolveEffectiveCupSizesForItem({
      menuItemId: 'item-1',
      categoryIds: ['cat-1'],
      cupSizes,
      itemCupSizeMappings: [],
      categoryCupSizeMappings: [
        { id: 'map-1', menu_category_id: 'cat-1', cup_size_id: 's' },
        { id: 'map-2', menu_category_id: 'cat-1', cup_size_id: 'm' },
      ],
    });

    expect(result.map((item) => item.id)).toEqual(['s', 'm']);
  });

  it('uses only item cup sizes when item mappings exist', () => {
    const result = resolveEffectiveCupSizesForItem({
      menuItemId: 'item-1',
      categoryIds: ['cat-1'],
      cupSizes,
      itemCupSizeMappings: [
        { id: 'imap-1', menu_item_id: 'item-1', cup_size_id: 'l' },
      ],
      categoryCupSizeMappings: [
        { id: 'cmap-1', menu_category_id: 'cat-1', cup_size_id: 's' },
        { id: 'cmap-2', menu_category_id: 'cat-1', cup_size_id: 'm' },
      ],
    });

    expect(result.map((item) => item.id)).toEqual(['l']);
  });

  it('deduplicates mapped cup sizes', () => {
    const result = resolveEffectiveCupSizesForItem({
      menuItemId: 'item-1',
      categoryIds: ['cat-1', 'cat-2'],
      cupSizes,
      itemCupSizeMappings: [],
      categoryCupSizeMappings: [
        { id: 'cmap-1', menu_category_id: 'cat-1', cup_size_id: 'm' },
        { id: 'cmap-2', menu_category_id: 'cat-2', cup_size_id: 'm' },
        { id: 'cmap-3', menu_category_id: 'cat-2', cup_size_id: 'l' },
      ],
    });

    expect(result.map((item) => item.id)).toEqual(['m', 'l']);
  });
});
