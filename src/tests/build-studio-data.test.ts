import { describe, expect, it } from 'vitest';
import {
  calculateStudioPlan,
  getStudioPresetById,
  studioModules,
  studioPresets,
} from '../data/build-studio';

describe('build studio data', () => {
  it('exposes stable preset and module identifiers', () => {
    expect(studioPresets).toHaveLength(4);
    expect(new Set(studioPresets.map(preset => preset.id)).size).toBe(
      studioPresets.length
    );
    expect(new Set(studioModules.map(module => module.id)).size).toBe(
      studioModules.length
    );
  });

  it('falls back to the first preset when an unknown preset id is used', () => {
    expect(getStudioPresetById('missing-preset').id).toBe(studioPresets[0].id);
  });

  it('calculates coherent plans with deduped modules and bounded readiness', () => {
    const plan = calculateStudioPlan({
      presetId: 'ai-operations-room',
      moduleIds: [
        'ai-workflow-orchestrator',
        'ai-workflow-orchestrator',
        'observability-wall',
      ],
      scale: 26,
      urgency: 'flagship',
    });

    expect(plan.modules.map(module => module.id)).toEqual([
      'ai-workflow-orchestrator',
      'observability-wall',
    ]);
    expect(plan.investmentHigh).toBeGreaterThan(plan.investmentLow);
    expect(plan.totalWeeks).toBeGreaterThanOrEqual(4);
    expect(plan.score).toBeGreaterThan(0);
    expect(plan.crew.length).toBeGreaterThan(0);
    expect(plan.surfaces.length).toBeGreaterThan(0);
    expect(plan.phases.reduce((sum, phase) => sum + phase.weeks, 0)).toBe(
      plan.totalWeeks
    );
    expect(
      Object.values(plan.readiness).every(value => value >= 0 && value <= 100)
    ).toBe(true);
  });

  it('increases investment and overall readiness for larger flagship configurations', () => {
    const baseline = calculateStudioPlan({
      presetId: 'launch-control',
      scale: 12,
      urgency: 'balanced',
    });
    const flagship = calculateStudioPlan({
      presetId: 'launch-control',
      scale: 28,
      urgency: 'flagship',
    });

    expect(flagship.investmentLow).toBeGreaterThan(baseline.investmentLow);
    expect(flagship.totalWeeks).toBeGreaterThanOrEqual(baseline.totalWeeks);
    expect(flagship.score).toBeGreaterThanOrEqual(baseline.score);
  });
});
