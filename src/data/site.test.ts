import { describe, expect, it } from 'vitest';

import { chicagoServices, navLinks, pricingTiers, services } from './site';

describe('public site data', () => {
  it('keeps navigation focused on buyer routes', () => {
    expect(navLinks.map(link => link.label)).toEqual([
      'Services',
      'Software',
      'Pricing',
      'Trust',
      'About',
    ]);
  });

  it('uses unique service identifiers and complete service copy', () => {
    expect(new Set(services.map(service => service.id)).size).toBe(
      services.length
    );
    for (const service of services) {
      expect(service.summary.length).toBeGreaterThan(40);
      expect(service.includes.length).toBeGreaterThanOrEqual(4);
    }
    expect(services).toHaveLength(6);
  });

  it('keeps pricing ranges ordered and local routes unique', () => {
    for (const tier of pricingTiers) expect(tier.low).toBeLessThan(tier.high);
    expect(new Set(chicagoServices.map(service => service.slug)).size).toBe(
      chicagoServices.length
    );
  });
});
