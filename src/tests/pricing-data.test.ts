import { describe, expect, it } from 'vitest';
import {
  pricingFaqs,
  pricingSignals,
  pricingTiers,
  servicesFaqs,
  slaComparisonRows,
} from '../data/pricing';

describe('pricing data', () => {
  it('exposes four pricing tiers with stable ids', () => {
    expect(pricingTiers).toHaveLength(4);
    expect(new Set(pricingTiers.map(tier => tier.id)).size).toBe(
      pricingTiers.length
    );
  });

  it('includes non-empty pricing and services FAQs', () => {
    expect(pricingFaqs.length).toBeGreaterThan(0);
    expect(servicesFaqs.length).toBeGreaterThan(0);
    expect(pricingFaqs.every(item => item.title && item.content)).toBe(true);
    expect(servicesFaqs.every(item => item.title && item.content)).toBe(true);
  });

  it('keeps trust signals and SLA comparison rows aligned', () => {
    expect(pricingSignals.length).toBeGreaterThanOrEqual(4);
    expect(slaComparisonRows.length).toBeGreaterThanOrEqual(5);
    expect(
      slaComparisonRows.every(
        row =>
          row.capability &&
          row.essentials &&
          row.growth &&
          row.securePlus &&
          row.custom
      )
    ).toBe(true);
  });
});
