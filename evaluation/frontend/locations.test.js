// This frontend test checks the province and district dropdown data.
import { describe, expect, test } from '@jest/globals';
import {
  districtsForProvince,
  NEPAL_DISTRICTS,
  NEPAL_PROVINCES,
  OPPORTUNITY_PROVINCES
} from '../../client/src/data/nepalLocations.js';

describe('Nepal location dropdowns', () => {
  test('contains all seven provinces', () => {
    expect(NEPAL_PROVINCES).toHaveLength(7);
    expect(NEPAL_PROVINCES).toEqual(Object.keys(NEPAL_DISTRICTS));
  });

  test('returns districts for the selected province', () => {
    expect(districtsForProvince('Bagmati')).toContain('Kathmandu');
    expect(districtsForProvince('Gandaki')).toContain('Kaski');
  });

  test('supports nationwide opportunities and invalid values safely', () => {
    expect(OPPORTUNITY_PROVINCES).toContain('Nationwide');
    expect(districtsForProvince('Nationwide')).toEqual(['Nationwide']);
    expect(districtsForProvince('Unknown')).toEqual([]);
  });
});
