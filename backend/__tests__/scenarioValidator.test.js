/**
 * Unit tests for backend/utils/scenarioValidator.js
 *
 * Tests the two entry points:
 *   - validateCanonical(data, toolType) — validates already-canonical payloads
 *   - canonicalizeFromRows(rows, toolType) — transforms parsed CSV/Excel rows
 *     into canonical form and validates them
 *
 * These are pure functions with no I/O dependencies.
 */

const {
  VALID_TOOL_TYPES,
  validateCanonical,
  canonicalizeFromRows,
} = require('../utils/scenarioValidator');

// ═══════════════════════════════════════════════════════════════════════════
// VALID_TOOL_TYPES
// ═══════════════════════════════════════════════════════════════════════════

describe('VALID_TOOL_TYPES', () => {
  test('contains exactly minitool1, minitool2, minitool3', () => {
    expect(VALID_TOOL_TYPES).toEqual(['minitool1', 'minitool2', 'minitool3']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateCanonical
// ═══════════════════════════════════════════════════════════════════════════

describe('validateCanonical', () => {
  test('throws for null data', () => {
    expect(() => validateCanonical(null, 'minitool1')).toThrow('Data must be an object');
  });

  test('throws for invalid toolType', () => {
    expect(() => validateCanonical({}, 'invalid')).toThrow('Invalid toolType');
  });

  // --- minitool1 ---
  describe('minitool1', () => {
    const validData = {
      bars: [{ brand: 'Duracell', lifespan: 80 }],
      minLifespan: 80,
      maxLifespan: 80,
    };

    test('accepts valid minitool1 data', () => {
      expect(validateCanonical(validData, 'minitool1')).toBe(true);
    });

    test('throws when bars is not an array', () => {
      expect(() =>
        validateCanonical({ ...validData, bars: 'not-array' }, 'minitool1'),
      ).toThrow('data.bars must be an array');
    });

    test('throws when minLifespan is not a finite number', () => {
      expect(() =>
        validateCanonical({ ...validData, minLifespan: NaN }, 'minitool1'),
      ).toThrow('minLifespan');
    });

    test('throws when a bar has no brand', () => {
      expect(() =>
        validateCanonical(
          { ...validData, bars: [{ lifespan: 50 }] },
          'minitool1',
        ),
      ).toThrow('string brand');
    });

    test('throws when lifespan is out of [1, 130] range', () => {
      expect(() =>
        validateCanonical(
          { ...validData, bars: [{ brand: 'X', lifespan: 0 }] },
          'minitool1',
        ),
      ).toThrow('lifespan in [1, 130]');
    });
  });

  // --- minitool2 ---
  describe('minitool2', () => {
    const validData = { dataBefore: [100, 200], dataAfter: [90, 180] };

    test('accepts valid minitool2 data', () => {
      expect(validateCanonical(validData, 'minitool2')).toBe(true);
    });

    test('throws when dataBefore is missing', () => {
      expect(() =>
        validateCanonical({ dataAfter: [1] }, 'minitool2'),
      ).toThrow('data.dataBefore and data.dataAfter must be arrays');
    });

    test('throws when dataAfter is missing', () => {
      expect(() =>
        validateCanonical({ dataBefore: [1] }, 'minitool2'),
      ).toThrow('data.dataBefore and data.dataAfter must be arrays');
    });

    test('throws when dataBefore contains non-numbers', () => {
      expect(() =>
        validateCanonical(
          { dataBefore: ['abc'], dataAfter: [1] },
          'minitool2',
        ),
      ).toThrow('must contain only numbers');
    });
  });

  // --- minitool3 ---
  describe('minitool3', () => {
    const validData = { currentData: [{ x: 1, y: 2 }, { x: 3, y: 4 }] };

    test('accepts valid minitool3 data', () => {
      expect(validateCanonical(validData, 'minitool3')).toBe(true);
    });

    test('throws when currentData is not an array', () => {
      expect(() =>
        validateCanonical({ currentData: 'not-array' }, 'minitool3'),
      ).toThrow('currentData must be an array');
    });

    test('throws when a point is missing y', () => {
      expect(() =>
        validateCanonical({ currentData: [{ x: 1 }] }, 'minitool3'),
      ).toThrow('numeric x and y');
    });

    test('throws when a point has Infinity', () => {
      expect(() =>
        validateCanonical(
          { currentData: [{ x: Infinity, y: 1 }] },
          'minitool3',
        ),
      ).toThrow('numeric x and y');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// canonicalizeFromRows
// ═══════════════════════════════════════════════════════════════════════════

describe('canonicalizeFromRows', () => {
  test('throws for empty rows', () => {
    expect(() => canonicalizeFromRows([], 'minitool1')).toThrow('empty');
  });

  test('throws for null rows', () => {
    expect(() => canonicalizeFromRows(null, 'minitool2')).toThrow('empty');
  });

  test('throws for invalid toolType', () => {
    expect(() =>
      canonicalizeFromRows([{ x: 1, y: 2 }], 'unknown'),
    ).toThrow('Invalid toolType');
  });

  // --- minitool1 ---
  describe('minitool1', () => {
    test('converts rows with brand and lifespan columns', () => {
      const rows = [
        { brand: 'Duracell', lifespan: 80 },
        { brand: 'Energizer', lifespan: 100 },
      ];
      const result = canonicalizeFromRows(rows, 'minitool1');
      expect(result.bars).toHaveLength(2);
      expect(result.minLifespan).toBe(80);
      expect(result.maxLifespan).toBe(100);
    });

    test('handles case-insensitive column names', () => {
      const rows = [{ Brand: 'X', Lifespan: 50 }];
      const result = canonicalizeFromRows(rows, 'minitool1');
      expect(result.bars[0]).toEqual({ brand: 'X', lifespan: 50 });
    });

    test('throws when required columns are missing', () => {
      const rows = [{ name: 'X', value: 50 }];
      expect(() => canonicalizeFromRows(rows, 'minitool1')).toThrow(
        "expects columns 'brand' and 'lifespan'",
      );
    });

    test('throws when lifespan is not a valid number', () => {
      const rows = [{ brand: 'X', lifespan: 'abc' }];
      expect(() => canonicalizeFromRows(rows, 'minitool1')).toThrow(
        'not a valid number',
      );
    });

    test('coerces numeric strings to numbers', () => {
      const rows = [{ brand: 'X', lifespan: '75' }];
      const result = canonicalizeFromRows(rows, 'minitool1');
      expect(result.bars[0].lifespan).toBe(75);
    });
  });

  // --- minitool2 ---
  describe('minitool2', () => {
    test('converts rows with before and after columns', () => {
      const rows = [
        { before: 200, after: 180 },
        { before: 210, after: 190 },
      ];
      const result = canonicalizeFromRows(rows, 'minitool2');
      expect(result.dataBefore).toEqual([200, 210]);
      expect(result.dataAfter).toEqual([180, 190]);
    });

    test('handles case-insensitive column names', () => {
      const rows = [{ Before: 100, After: 90 }];
      const result = canonicalizeFromRows(rows, 'minitool2');
      expect(result.dataBefore).toEqual([100]);
    });

    test('skips null values in one column but keeps the other', () => {
      const rows = [
        { before: 100, after: null },
        { before: 200, after: 180 },
      ];
      const result = canonicalizeFromRows(rows, 'minitool2');
      expect(result.dataBefore).toEqual([100, 200]);
      expect(result.dataAfter).toEqual([180]);
    });

    test('throws when both columns are empty in a row', () => {
      const rows = [{ before: null, after: null }];
      expect(() => canonicalizeFromRows(rows, 'minitool2')).toThrow(
        "both 'before' and 'after' are empty",
      );
    });

    test('throws when required columns are missing', () => {
      const rows = [{ x: 1, y: 2 }];
      expect(() => canonicalizeFromRows(rows, 'minitool2')).toThrow(
        "expects columns 'before' and 'after'",
      );
    });
  });

  // --- minitool3 ---
  describe('minitool3', () => {
    test('converts rows with x and y columns', () => {
      const rows = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      const result = canonicalizeFromRows(rows, 'minitool3');
      expect(result.currentData).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]);
    });

    test('coerces string values to numbers', () => {
      const rows = [{ x: '5.5', y: '10' }];
      const result = canonicalizeFromRows(rows, 'minitool3');
      expect(result.currentData[0]).toEqual({ x: 5.5, y: 10 });
    });

    test('throws when x or y is not a valid number', () => {
      const rows = [{ x: 'abc', y: 2 }];
      expect(() => canonicalizeFromRows(rows, 'minitool3')).toThrow(
        'not a valid number',
      );
    });

    test('throws when required columns are missing', () => {
      const rows = [{ before: 1, after: 2 }];
      expect(() => canonicalizeFromRows(rows, 'minitool3')).toThrow(
        "expects columns 'x' and 'y'",
      );
    });
  });
});
