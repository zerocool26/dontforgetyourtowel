import { useEffect, useMemo, useState } from 'preact/hooks';
import { withBasePath } from '../../utils/helpers';
import {
  calculateStudioPlan,
  getStudioPresetById,
  studioMetricKeys,
  studioMetricLabels,
  studioModuleCategoryOrder,
  studioModules,
  studioPresets,
  studioUrgencyProfiles,
  type StudioModule,
  type StudioModuleCategory,
  type StudioUrgency,
} from '../../data/build-studio';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const scaleMin = 8;
const scaleMax = 40;
const scaleStep = 2;

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function groupModulesByCategory() {
  return studioModules.reduce((acc, module) => {
    const list = acc.get(module.category) ?? [];
    list.push(module);
    acc.set(module.category, list);
    return acc;
  }, new Map<StudioModuleCategory, StudioModule[]>());
}

function selectionFromUrl() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const preset = studioPresets.find(item => item.id === params.get('preset'));
  const urgency = studioUrgencyProfiles.find(
    item => item.id === params.get('urgency')
  );
  const modules = (params.get('modules') ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const scale = Number(params.get('scale'));

  return {
    presetId: preset?.id,
    urgency: urgency?.id,
    modules,
    scale: Number.isFinite(scale) ? scale : undefined,
  };
}

export default function BuildStudio() {
  const fallbackPreset = studioPresets[0];
  const [presetId, setPresetId] = useState(fallbackPreset.id);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    fallbackPreset.defaultModules
  );
  const [urgency, setUrgency] = useState<StudioUrgency>('balanced');
  const [scale, setScale] = useState(fallbackPreset.recommendedScale);
  const [copied, setCopied] = useState(false);

  const modulesByCategory = useMemo(groupModulesByCategory, []);
  const selectedPreset = useMemo(
    () => getStudioPresetById(presetId),
    [presetId]
  );
  const plan = useMemo(
    () =>
      calculateStudioPlan({
        presetId,
        moduleIds: selectedModuleIds,
        scale,
        urgency,
      }),
    [presetId, scale, selectedModuleIds, urgency]
  );

  const primarySurface = plan.surfaces[0];
  const buildBrief = useMemo(() => {
    const moduleSummary = plan.modules.map(module => module.title).join(', ');
    return `${plan.preset.name} | ${plan.urgency.label} | scale ${plan.scale} | modules: ${moduleSummary}`;
  }, [plan]);

  const intakeHref = useMemo(() => {
    const params = new URLSearchParams({
      service: plan.preset.contactService,
      solution: plan.preset.id,
      brief: buildBrief,
    });

    return withBasePath(`contact-hq/?${params.toString()}`);
  }, [buildBrief, plan.preset.contactService, plan.preset.id]);

  useEffect(() => {
    const urlSelection = selectionFromUrl();
    if (!urlSelection) return;

    const nextPreset = getStudioPresetById(urlSelection.presetId);
    setPresetId(nextPreset.id);
    setSelectedModuleIds(
      urlSelection.modules.length
        ? urlSelection.modules
        : nextPreset.defaultModules
    );
    setUrgency(urlSelection.urgency ?? 'balanced');
    setScale(urlSelection.scale ?? nextPreset.recommendedScale);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('preset', presetId);
    params.set('urgency', urgency);
    params.set('scale', String(scale));
    params.set('modules', selectedModuleIds.join(','));

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nextUrl);
  }, [presetId, scale, selectedModuleIds, urgency]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds(current => {
      if (current.includes(moduleId)) {
        const next = current.filter(id => id !== moduleId);
        return next.length ? next : current;
      }

      return [...current, moduleId];
    });
  };

  const applyPreset = (nextPresetId: string) => {
    const nextPreset = getStudioPresetById(nextPresetId);
    setPresetId(nextPreset.id);
    setSelectedModuleIds(nextPreset.defaultModules);
    setScale(nextPreset.recommendedScale);
    setUrgency('balanced');
  };

  const copyShareLink = async () => {
    if (typeof window === 'undefined') return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      window.prompt('Copy this Build Studio link', window.location.href);
    }
  };

  return (
    <section
      class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
      data-testid="build-studio"
    >
      <div class="space-y-6">
        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Studio presets
              </p>
              <h2 class="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Configure the initial brief
              </h2>
            </div>
            <p class="max-w-[26rem] text-sm leading-relaxed text-zinc-300">
              Start with the planning direction, then add the modules that best
              match the system you actually want to discuss.
            </p>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            {studioPresets.map(preset => {
              const active = preset.id === selectedPreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  class={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f75b] ${
                    active
                      ? 'border-[#d7f75b]/50 bg-[#d7f75b]/10 text-white'
                      : 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => applyPreset(preset.id)}
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                    {preset.kicker}
                  </p>
                  <p class="mt-2 text-base font-semibold">{preset.name}</p>
                  <p class="mt-2 text-sm leading-relaxed text-zinc-300">
                    {preset.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Delivery pace
                </p>
                <p class="mt-2 text-lg font-semibold text-white">
                  Choose the rollout tempo
                </p>
              </div>
              <p class="text-xs text-zinc-500">{scale} scope points</p>
            </div>

            <div class="mt-5 grid gap-3">
              {studioUrgencyProfiles.map(profile => {
                const active = profile.id === urgency;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    class={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f75b] ${
                      active
                        ? 'border-[#d7f75b]/50 bg-[#d7f75b]/10 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'
                    }`}
                    onClick={() => setUrgency(profile.id)}
                  >
                    <p class="text-sm font-semibold">{profile.label}</p>
                    <p class="mt-1 text-sm text-zinc-300">{profile.summary}</p>
                  </button>
                );
              })}
            </div>

            <label class="mt-6 block" for="studio-scale">
              <span class="text-sm font-semibold text-white">
                Scale the scope
              </span>
              <span class="mt-2 block text-sm text-zinc-400">
                Higher scale increases delivery depth, supporting roles, and
                implementation range.
              </span>
            </label>
            <input
              id="studio-scale"
              data-testid="build-studio-scale"
              class="mt-4 w-full accent-[#12b5a6]"
              type="range"
              min={scaleMin}
              max={scaleMax}
              step={scaleStep}
              value={scale}
              onInput={event =>
                setScale(
                  Number((event.currentTarget as HTMLInputElement).value)
                )
              }
            />
            <div class="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Lean proof</span>
              <span>Flagship estate</span>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Best suited for
            </p>
            <h3 class="mt-2 text-xl font-semibold text-white">
              {selectedPreset.audience}
            </h3>
            <p class="mt-4 text-sm leading-relaxed text-zinc-300">
              {selectedPreset.summary}
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              {selectedPreset.outcomes.slice(0, 3).map(outcome => (
                <span
                  key={outcome}
                  class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200"
                >
                  {outcome}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Capability modules
              </p>
              <h3 class="mt-2 text-2xl font-semibold text-white">
                Select the capabilities that shape the brief
              </h3>
            </div>
            <p class="max-w-[28rem] text-sm leading-relaxed text-zinc-300">
              Each module maps to a real capability already present in the
              codebase or clearly represented by a linked live route.
            </p>
          </div>

          <div class="mt-6 space-y-6">
            {studioModuleCategoryOrder.map(category => {
              const modules = modulesByCategory.get(category) ?? [];
              return (
                <div key={category} class="space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-white">{category}</p>
                    <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {modules.length} modules
                    </p>
                  </div>

                  <div class="grid gap-3 md:grid-cols-2">
                    {modules.map(module => {
                      const selected = selectedModuleIds.includes(module.id);
                      const recommended =
                        selectedPreset.defaultModules.includes(module.id);

                      return (
                        <button
                          key={module.id}
                          type="button"
                          class={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f75b] ${
                            selected
                              ? 'border-[#d7f75b]/50 bg-[#d7f75b]/10 text-white'
                              : 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'
                          }`}
                          onClick={() => toggleModule(module.id)}
                          data-testid="build-studio-module"
                          aria-pressed={selected}
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div>
                              <p class="text-sm font-semibold">
                                {module.title}
                              </p>
                              <p class="mt-2 text-sm leading-relaxed text-zinc-300">
                                {module.description}
                              </p>
                            </div>
                            {recommended ? (
                              <span class="rounded-full border border-[#d7f75b]/30 bg-[#d7f75b]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7f75b]">
                                preset
                              </span>
                            ) : null}
                          </div>

                          <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <span class="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                              {formatCurrency(module.investment)}
                            </span>
                            <span class="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                              +{module.weeks} wk depth
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside class="space-y-4">
        <div class="sticky top-24 space-y-4">
          <div class="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(215,247,91,0.12),rgba(8,12,20,0.96))] p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Current planning brief
                </p>
                <h3 class="mt-2 text-2xl font-semibold text-white">
                  {plan.preset.name}
                </h3>
                <p class="mt-3 text-sm leading-relaxed text-zinc-200">
                  {plan.urgency.label} • {plan.scale} scope points •{' '}
                  {plan.modules.length} active modules
                </p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-right">
                <p class="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                  Readiness score
                </p>
                <p class="mt-1 text-2xl font-semibold text-white">
                  {plan.score}
                </p>
              </div>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Investment range
                </p>
                <p class="mt-2 text-lg font-semibold text-white">
                  {formatCurrency(plan.investmentLow)}–
                  {formatCurrency(plan.investmentHigh)}
                </p>
                <p class="mt-2 text-xs text-zinc-500">
                  Includes planning depth, interaction scope, delivery support,
                  and implementation hardening.
                </p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Launch window
                </p>
                <p class="mt-2 text-lg font-semibold text-white">
                  {plan.totalWeeks} weeks
                </p>
                <p class="mt-2 text-xs text-zinc-500">
                  Sized to stay commercially realistic while leaving room for
                  meaningful implementation depth.
                </p>
              </div>
            </div>

            <div class="mt-6 space-y-3">
              {studioMetricKeys.map(key => (
                <div key={key}>
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="text-zinc-200">{studioMetricLabels[key]}</span>
                    <span class="font-semibold text-white">
                      {plan.readiness[key]}
                    </span>
                  </div>
                  <div class="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      class="h-2 rounded-full bg-gradient-to-r from-[#d7f75b] via-[#12b5a6] to-[#7dd3fc]"
                      style={{ width: `${plan.readiness[key]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={
                  primarySurface
                    ? withBasePath(primarySurface.href)
                    : withBasePath('about/')
                }
                class="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f75b]"
              >
                Open closest live route
              </a>
              <a
                href={intakeHref}
                class="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#d7f75b] px-4 text-sm font-semibold text-slate-950 transition hover:bg-[#e7ff8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Send build brief to intake
              </a>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                class="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-black/25 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f75b]"
                onClick={copyShareLink}
              >
                {copied ? 'Share link copied' : 'Copy share link'}
              </button>
              <span class="text-xs text-zinc-500">
                URL stays synced with the current build.
              </span>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Included outcomes
            </p>
            <ul class="mt-4 space-y-3 text-sm text-zinc-200">
              {plan.outcomes.map(outcome => (
                <li key={outcome} class="flex items-start gap-2">
                  <span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#12b5a6]" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Suggested roles
              </p>
              <p class="text-xs text-zinc-500">{plan.crew.length} roles</p>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              {plan.crew.map(member => (
                <span
                  key={member}
                  class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Delivery arc
            </p>
            <div class="mt-4 space-y-3">
              {plan.phases.map(phase => (
                <div
                  key={phase.label}
                  class="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-white">
                      {phase.label}
                    </p>
                    <span class="text-xs uppercase tracking-[0.18em] text-[#d7f75b]">
                      {phase.weeks} wk
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-zinc-300">{phase.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Related live routes
            </p>
            <div class="mt-4 space-y-3">
              {plan.surfaces.map(surface => (
                <a
                  key={surface.id}
                  href={withBasePath(surface.href)}
                  class="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f75b]"
                >
                  <p class="text-sm font-semibold text-white">
                    {surface.title}
                  </p>
                  <p class="mt-2 text-sm text-zinc-300">
                    {surface.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
