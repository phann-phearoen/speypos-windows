import type { CupSize, CupSizeSummary } from '@/types/pos';

function numericSize(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareCupSizes(left: Pick<CupSize, 'size' | 'unit'>, right: Pick<CupSize, 'size' | 'unit'>) {
  const leftSize = numericSize(left.size);
  const rightSize = numericSize(right.size);

  if (leftSize !== null && rightSize !== null && leftSize !== rightSize) {
    return leftSize - rightSize;
  }
  if (leftSize !== null && rightSize === null) return -1;
  if (leftSize === null && rightSize !== null) return 1;

  return left.size.localeCompare(right.size) || left.unit.localeCompare(right.unit);
}

export function sortCupSizes(cupSizes: CupSize[]): CupSize[] {
  return [...cupSizes].sort(compareCupSizes);
}

export function sortCupSizeSummaries(summary: CupSizeSummary[]): CupSizeSummary[] {
  return [...summary].sort((left, right) => {
    if (!left.id || !right.id) {
      return !left.id === !right.id ? 0 : !left.id ? 1 : -1;
    }

    const leftSize = numericSize(left.name);
    const rightSize = numericSize(right.name);
    if (leftSize !== null && rightSize !== null && leftSize !== rightSize) {
      return leftSize - rightSize;
    }
    if (leftSize !== null && rightSize === null) return -1;
    if (leftSize === null && rightSize !== null) return 1;

    return left.name.localeCompare(right.name);
  });
}