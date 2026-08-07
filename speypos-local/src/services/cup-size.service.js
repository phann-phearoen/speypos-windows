import * as cupSizeRepo from '../storage/repositories/cup-size.repo.js';
import * as menuItemCupSizeMapRepo from '../storage/repositories/menu-item-cup-size-map.repo.js';
import * as menuCategoryCupSizeMapRepo from '../storage/repositories/menu-category-cup-size-map.repo.js';

export function getCupSizes() {
  return cupSizeRepo.getAllCupSizes();
}

export function getCupSizeById(id) {
  return cupSizeRepo.getCupSizeById(id);
}

export function createCupSize(data) {
  return cupSizeRepo.createCupSize({
    size: data.size.trim(),
    unit: data.unit.trim(),
  });
}

export function updateCupSize(id, data) {
  const patch = {};

  if (typeof data.size === 'string') {
    patch.size = data.size.trim();
  }
  if (typeof data.unit === 'string') {
    patch.unit = data.unit.trim();
  }

  return cupSizeRepo.updateCupSize(id, patch);
}

export function deleteCupSize(id) {
  return cupSizeRepo.deleteCupSize(id);
}

export function getMenuItemCupSizeMaps(filters = {}) {
  return menuItemCupSizeMapRepo.getMaps(filters);
}

export function createMenuItemCupSizeMap(data) {
  return menuItemCupSizeMapRepo.createMap(data);
}

export function deleteMenuItemCupSizeMap(id) {
  return menuItemCupSizeMapRepo.remove(id);
}

export function getMenuCategoryCupSizeMaps(filters = {}) {
  return menuCategoryCupSizeMapRepo.getMaps(filters);
}

export function createMenuCategoryCupSizeMap(data) {
  return menuCategoryCupSizeMapRepo.createMap(data);
}

export function deleteMenuCategoryCupSizeMap(id) {
  return menuCategoryCupSizeMapRepo.remove(id);
}

export function getEffectiveCupSizeIdsForItem(menuItemId, menuCategoryIds = []) {
  const itemMappings = menuItemCupSizeMapRepo.getMaps({ menu_item_id: menuItemId });
  if (itemMappings[0]) {
    return [itemMappings[0].cup_size_id];
  }

  if (!Array.isArray(menuCategoryIds) || menuCategoryIds.length === 0) {
    return [];
  }

  const categoryMappings = menuCategoryCupSizeMapRepo.getMappingsByCategoryIds(menuCategoryIds);
  for (const categoryId of menuCategoryIds) {
    const mapping = categoryMappings.find((candidate) => candidate.menu_category_id === categoryId);
    if (mapping) {
      return [mapping.cup_size_id];
    }
  }

  return [];
}
