import { describe, expect, it } from 'vitest';
import { resolveEffectiveSelectedCupSizeId, resolveOptionDrivenCupSizeId } from './customizationCupSize';

describe('resolveOptionDrivenCupSizeId', () => {
  it('returns the selected option cup size id when present', () => {
    const groups = [
      {
        name: 'Milk',
        options: [
          { id: 'opt-1', cup_size_id: null },
          { id: 'opt-2', cup_size_id: 'cup-large' },
        ],
      },
    ];

    const result = resolveOptionDrivenCupSizeId(groups, { Milk: ['opt-2'] });
    expect(result).toBe('cup-large');
  });

  it('returns null when selected options have no linked cup size', () => {
    const groups = [
      {
        name: 'Sugar',
        options: [{ id: 'opt-1', cup_size_id: null }],
      },
    ];

    const result = resolveOptionDrivenCupSizeId(groups, { Sugar: ['opt-1'] });
    expect(result).toBeNull();
  });
});

describe('resolveEffectiveSelectedCupSizeId', () => {
  it('prioritizes option-driven cup size over manually selected cup size', () => {
    const result = resolveEffectiveSelectedCupSizeId('cup-xl', 'cup-medium');
    expect(result).toBe('cup-xl');
  });

  it('falls back to manually selected cup size when no option override exists', () => {
    const result = resolveEffectiveSelectedCupSizeId(null, 'cup-small');
    expect(result).toBe('cup-small');
  });
});
