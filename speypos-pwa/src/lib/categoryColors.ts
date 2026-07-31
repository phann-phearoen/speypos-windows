const CATEGORY_HUES = [210, 160, 45, 15, 280, 330, 120, 190] as const;

export function normalizeCategoryId(categoryId: string) {
  return categoryId.trim().toLowerCase();
}

export function getCategoryHueFromId(categoryId: string) {
  const normalizedCategoryId = normalizeCategoryId(categoryId);
  let hash = 0;

  for (let index = 0; index < normalizedCategoryId.length; index += 1) {
    const charCode = normalizedCategoryId.charCodeAt(index);
    hash = charCode + ((hash << 5) - hash);
    hash |= 0;
  }

  const hueIndex = Math.abs(hash) % CATEGORY_HUES.length;
  return CATEGORY_HUES[hueIndex];
}

export function getCategorySurfaceColors(categoryId: string) {
  const hue = getCategoryHueFromId(categoryId);

  return {
    hue,
    light: `hsl(${hue} 70% 96%)`,
    dark: `hsl(${hue} 30% 12%)`,
  };
}