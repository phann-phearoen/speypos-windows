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

  const itemMapping = itemCupSizeMappings.find((mapping) => mapping.menu_item_id === menuItemId);
  if (itemMapping) {
    return sortCupSizes(cupSizes.filter((cupSize) => cupSize.id === itemMapping.cup_size_id));
  }

  for (const categoryId of categoryIds) {
    const categoryMapping = categoryCupSizeMappings.find(
      (mapping) => mapping.menu_category_id === categoryId
    );
    if (categoryMapping) {
      return sortCupSizes(cupSizes.filter((cupSize) => cupSize.id === categoryMapping.cup_size_id));
    }
  }

  return [];
}
