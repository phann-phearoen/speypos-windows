import type { CupSize, MenuCategoryCupSizeMap, MenuItemCupSizeMap } from '@/types/pos';
import { sortCupSizes } from './cupSizeSort';

export function resolveEffectiveCupSizesForItem(params: {
  menuItemId: string;
  categoryIds: string[];
  cupSizes: CupSize[];
  itemCupSizeMappings: MenuItemCupSizeMap[];
  categoryCupSizeMappings: MenuCategoryCupSizeMap[];
}): CupSize[] {
  const { menuItemId, categoryIds, cupSizes, itemCupSizeMappings, categoryCupSizeMappings } = params;

  const itemCupSizeIds = itemCupSizeMappings
    .filter((mapping) => mapping.menu_item_id === menuItemId)
    .map((mapping) => mapping.cup_size_id);

  const categoryCupSizeIds = categoryCupSizeMappings
    .filter((mapping) => categoryIds.includes(mapping.menu_category_id))
    .map((mapping) => mapping.cup_size_id);

  const effectiveCupSizeIds = itemCupSizeIds.length > 0
    ? Array.from(new Set(itemCupSizeIds))
    : Array.from(new Set(categoryCupSizeIds));

  return sortCupSizes(cupSizes.filter((cupSize) => effectiveCupSizeIds.includes(cupSize.id)));
}
