import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  businessOfferCatalog,
  businessServiceTypes,
} from '../data/business-profile';
import { decisionHandoffLanes } from '../data/decision-handoff';
import {
  marketSignals2026,
  resourceRecommendations2026,
  technologyRadar2026,
} from '../data/research-radar';
import {
  buyerPathLinks,
  footerSignals,
  homeRouteGuideLinks,
  researchProofLinks,
  supportLinks,
} from '../data/site-navigation';

const routeToPageFile = (href: string) => {
  const [route] = href.split(/[?#]/);
  const normalizedRoute = route === '/' ? 'index' : route?.replace(/\/$/, '');
  return join(
    process.cwd(),
    'src',
    'pages',
    `${normalizedRoute || 'index'}.astro`
  );
};

const getHash = (href: string) => href.match(/#([^?]+)/)?.[1] ?? '';

describe('Buyer journey data integrity', () => {
  it('keeps public navigation labels and route descriptions complete', () => {
    const allLinks = [
      ...buyerPathLinks,
      ...researchProofLinks,
      ...supportLinks,
    ];
    const labels = allLinks.map(link => link.label);

    expect(new Set(labels).size).toBe(labels.length);

    allLinks.forEach(link => {
      expect(link.label.trim().length).toBeGreaterThan(2);
      expect(link.href).not.toMatch(/^https?:\/\//);
      expect(link.href).not.toMatch(/^\/(?!$)/);
      expect(link.href).not.toContain('//');
    });

    [...buyerPathLinks, ...researchProofLinks].forEach(link => {
      expect(link.description?.trim().length ?? 0).toBeGreaterThan(24);
    });
  });

  it('keeps homepage guide links as a curated subset of public navigation', () => {
    const knownHrefs = new Set(
      [...buyerPathLinks, ...researchProofLinks].map(link => link.href)
    );

    expect(homeRouteGuideLinks).toHaveLength(6);
    homeRouteGuideLinks.forEach(link => {
      expect(knownHrefs.has(link.href)).toBe(true);
    });
  });

  it('keeps decision handoff links pointed at real route anchors', () => {
    const ids = decisionHandoffLanes.map(lane => lane.id);
    expect(new Set(ids).size).toBe(ids.length);

    decisionHandoffLanes.forEach(lane => {
      expect(lane.evidence).toHaveLength(3);
      expect(lane.pressure.length).toBeGreaterThan(60);
      expect(lane.firstOutput.length).toBeGreaterThan(60);

      const pageFile = routeToPageFile(lane.href);
      const pageSource = readFileSync(pageFile, 'utf8');
      const hash = getHash(lane.href);

      if (hash) {
        expect(pageSource).toContain(`id="${hash}"`);
      }
    });
  });

  it('keeps business offer catalog aligned with declared service types', () => {
    const catalogItems = businessOfferCatalog.itemListElement;

    expect(catalogItems).toHaveLength(businessServiceTypes.length);
    expect(
      catalogItems.map(item => item.itemOffered.serviceType)
    ).toStrictEqual([...businessServiceTypes]);
  });

  it('keeps footer signals specific enough to support buyer confidence', () => {
    expect(footerSignals).toHaveLength(3);

    footerSignals.forEach(signal => {
      expect(signal.label.trim().length).toBeGreaterThan(3);
      expect(signal.value.trim().length).toBeGreaterThan(8);
      expect(signal.detail.trim().length).toBeGreaterThan(70);
    });
  });

  it('keeps the 2026 research radar source-backed and production-specific', () => {
    const sourceSets = [
      ...marketSignals2026.map(item => item.sources),
      ...technologyRadar2026.map(item => item.sources),
      ...resourceRecommendations2026.map(item => item.sources),
    ];

    expect(marketSignals2026.length).toBeGreaterThanOrEqual(4);
    expect(technologyRadar2026.length).toBeGreaterThanOrEqual(5);
    expect(resourceRecommendations2026.length).toBeGreaterThanOrEqual(3);
    expect(
      resourceRecommendations2026.some(item => item.status === 'Downloaded now')
    ).toBe(true);

    sourceSets.flat().forEach(source => {
      expect(source.href).toMatch(/^https:\/\//);
      expect(source.label.length).toBeGreaterThan(8);
    });

    const radarCopy = JSON.stringify({
      marketSignals2026,
      technologyRadar2026,
      resourceRecommendations2026,
    }).toLowerCase();

    expect(radarCopy).not.toContain('placeholder');
    expect(radarCopy).not.toContain('lorem');
    expect(radarCopy).toContain('microsoft 365');
    expect(radarCopy).toContain('core web vitals');
  });
});
