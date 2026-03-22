import { validateNumberField } from '../../scripts/model/validation-helpers';

describe('validateNumberField - validateRange coverage', () => {
  it('rejects value above max when minExclusive with both min and max', () => {
    const errors = validateNumberField(25, 'Score', { min: 0, max: 20, minExclusive: true });
    expect(errors).toEqual(['Score must be between 0 and 20']);
  });

  it('rejects value at min when minExclusive with both min and max', () => {
    const errors = validateNumberField(0, 'Score', { min: 0, max: 20, minExclusive: true });
    expect(errors).toEqual(['Score must be greater than 0']);
  });

  it('accepts value within range when minExclusive with both min and max', () => {
    const errors = validateNumberField(10, 'Score', { min: 0, max: 20, minExclusive: true });
    expect(errors).toEqual([]);
  });

  it('rejects value above max-only constraint', () => {
    const errors = validateNumberField(150, 'Percentage', { max: 100 });
    expect(errors).toEqual(['Percentage must be at most 100']);
  });

  it('accepts value at max-only constraint', () => {
    const errors = validateNumberField(100, 'Percentage', { max: 100 });
    expect(errors).toEqual([]);
  });

  it('rejects value below non-zero min', () => {
    const errors = validateNumberField(0, 'Level', { min: 1 });
    expect(errors).toEqual(['Level must be at least 1']);
  });

  it('rejects value below min with minExclusive and no max', () => {
    const errors = validateNumberField(0, 'Bonus', { min: 0, minExclusive: true });
    expect(errors).toEqual(['Bonus must be greater than 0']);
  });
});
