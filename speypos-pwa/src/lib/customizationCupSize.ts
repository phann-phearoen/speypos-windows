type OptionLike = { id: string; cup_size_id?: string | null };
type GroupLike = { name: string; options: OptionLike[] };

export function resolveOptionDrivenCupSizeId(
  groups: GroupLike[],
  selections: Record<string, string[]>
): string | null {
  for (const group of groups) {
    const selectedIds = new Set(selections[group.name] || []);
    for (const option of group.options) {
      if (selectedIds.has(option.id) && option.cup_size_id) {
        return option.cup_size_id;
      }
    }
  }
  return null;
}

export function resolveEffectiveSelectedCupSizeId(
  optionDrivenCupSizeId: string | null,
  selectedCupSizeId: string | null
): string | null {
  return optionDrivenCupSizeId || selectedCupSizeId || null;
}
