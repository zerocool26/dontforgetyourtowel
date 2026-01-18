import { onReducedMotionChange, prefersReducedMotion } from '@/utils/a11y';

type HeroOptions = {
  interactive: boolean;
};

type HeroSettings = {
  intensity?: 'subtle' | 'medium' | 'intense';
  data?: boolean;
  perf?: boolean;
  preset?: 'signal' | 'cinematic' | 'clarity';
  tilt?: boolean;
  fx?: boolean;
};

const STORAGE_KEY = 'hero3d:settings:v1';

class Hero3DController {
  private container: HTMLElement;
  private scene: HTMLElement | null;
  private rafId = 0;
  private isInteractive = false;
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private pointerActive = false;
  private isDragging = false;
  private pointerLocked = false;
  private observer?: IntersectionObserver;
  private stopReducedMotion?: () => void;
  private options: HeroOptions;
  private storedSettings: HeroSettings = {};
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private lastFps = 0;
  private fpsSlowTicks = 0;
  private fpsRecoveryTicks = 0;
  private fpsRafId = 0;
  private autoPerfEnabled = true;
  private baseIntensity: 'subtle' | 'medium' | 'intense' = 'medium';
  private baseShowData = true;
  private basePerf = false;
  private baseTilt = true;
  private baseFx = true;
  private userIntensityOverride = false;
  private autoPerfTriggered = false;
  private telemetryNodes: Record<string, HTMLElement | null> = {};
  private sparkBars: HTMLElement[] = [];
  private fpsHistory = Array(24).fill(0);

  constructor(container: HTMLElement, options: HeroOptions) {
    this.container = container;
    this.scene = container.querySelector('.hero-3d-scene');
    this.options = options;
    this.init();
  }

  private init() {
    if (!this.scene) return;
    this.baseIntensity =
      (this.container.dataset.intensity as 'subtle' | 'medium' | 'intense') ??
      'medium';
    this.baseShowData = this.container.dataset.showData !== 'false';
    this.basePerf = this.container.dataset.heroPerf === 'true';
    this.baseTilt = this.container.dataset.heroTilt !== 'false';
    this.baseFx = this.container.dataset.heroFx !== 'false';
    this.loadStoredSettings();
    this.applyStoredSettings();
    this.updateReducedMotion(prefersReducedMotion());

    this.stopReducedMotion = onReducedMotionChange(prefers => {
      this.updateReducedMotion(prefers);
    });

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const paused = !entry.isIntersecting;
          this.container.setAttribute(
            'data-hero-paused',
            paused ? 'true' : 'false'
          );
          if (paused) this.stop();
          else this.start();
        });
      },
      { threshold: 0.15 }
    );

    this.observer.observe(this.container);

    this.initControls();
    this.initAutoPerf();
    this.initTelemetry();
    this.updateTelemetry();
  }

  private updateReducedMotion(prefers: boolean) {
    if (prefers) {
      this.container.setAttribute('data-hero-reduced', 'true');
      this.stop();
      this.updateTelemetry();
      return;
    }

    this.container.removeAttribute('data-hero-reduced');
    this.start();
    this.updateTelemetry();
  }

  private loadStoredSettings() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HeroSettings;
      this.storedSettings = parsed ?? {};
    } catch {
      this.storedSettings = {};
    }
  }

  private persistSettings() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.storedSettings)
      );
    } catch {
      // Ignore storage failures
    }
  }

  private applyStoredSettings() {
    if (this.storedSettings.intensity) {
      this.container.dataset.intensity = this.storedSettings.intensity;
      this.userIntensityOverride = true;
    }
    if (typeof this.storedSettings.data === 'boolean') {
      this.container.dataset.showData = this.storedSettings.data
        ? 'true'
        : 'false';
    }
    if (typeof this.storedSettings.perf === 'boolean') {
      this.container.dataset.heroPerf = this.storedSettings.perf
        ? 'true'
        : 'false';
      this.autoPerfEnabled = !this.storedSettings.perf;
    }
    if (this.storedSettings.preset) {
      this.container.dataset.heroPreset = this.storedSettings.preset;
    }
    if (typeof this.storedSettings.tilt === 'boolean') {
      this.container.dataset.heroTilt = this.storedSettings.tilt
        ? 'true'
        : 'false';
    }
    if (typeof this.storedSettings.fx === 'boolean') {
      this.container.dataset.heroFx = this.storedSettings.fx ? 'true' : 'false';
    }
    this.container.dataset.heroAutoPerf = this.autoPerfEnabled
      ? 'true'
      : 'false';
  }

  private initControls() {
    const intensityButtons = this.container.querySelectorAll<HTMLElement>(
      '[data-hero-intensity]'
    );
    const presetButtons =
      this.container.querySelectorAll<HTMLElement>('[data-hero-preset]');
    const toggleButtons =
      this.container.querySelectorAll<HTMLElement>('[data-hero-toggle]');
    const actionButtons =
      this.container.querySelectorAll<HTMLElement>('[data-hero-action]');

    intensityButtons.forEach(button => {
      const value = button.dataset.heroIntensity as
        | 'subtle'
        | 'medium'
        | 'intense'
        | undefined;
      if (!value) return;
      button.addEventListener('click', () => {
        this.container.dataset.intensity = value;
        this.container.removeAttribute('data-hero-preset');
        this.storedSettings.intensity = value;
        this.storedSettings.preset = undefined;
        this.userIntensityOverride = true;
        this.persistSettings();
        this.updateControlStates();
      });
    });

    presetButtons.forEach(button => {
      const preset = button.dataset.heroPreset as
        | 'signal'
        | 'cinematic'
        | 'clarity'
        | undefined;
      if (!preset) return;
      button.addEventListener('click', () => {
        this.applyPreset(preset);
      });
    });

    toggleButtons.forEach(button => {
      const toggle = button.dataset.heroToggle;
      if (!toggle) return;
      button.addEventListener('click', () => {
        if (toggle === 'data') {
          const next = this.container.dataset.showData !== 'true';
          this.container.dataset.showData = next ? 'true' : 'false';
          this.storedSettings.data = next;
          this.container.removeAttribute('data-hero-preset');
          this.storedSettings.preset = undefined;
        }
        if (toggle === 'perf') {
          const next = this.container.dataset.heroPerf !== 'true';
          this.container.dataset.heroPerf = next ? 'true' : 'false';
          this.storedSettings.perf = next;
          this.autoPerfEnabled = !next;
          this.container.dataset.heroAutoPerf = this.autoPerfEnabled
            ? 'true'
            : 'false';
          this.container.removeAttribute('data-hero-preset');
          this.storedSettings.preset = undefined;
          this.autoPerfTriggered = false;
          if (this.autoPerfEnabled) {
            this.initAutoPerf();
          }
        }
        if (toggle === 'tilt') {
          const next = this.container.dataset.heroTilt !== 'true';
          this.container.dataset.heroTilt = next ? 'true' : 'false';
          this.storedSettings.tilt = next;
          if (!next) {
            this.resetTilt();
          }
        }
        if (toggle === 'fx') {
          const next = this.container.dataset.heroFx !== 'true';
          this.container.dataset.heroFx = next ? 'true' : 'false';
          this.storedSettings.fx = next;
        }
        this.persistSettings();
        this.updateControlStates();
      });
    });

    actionButtons.forEach(button => {
      const action = button.dataset.heroAction;
      if (!action) return;
      button.addEventListener('click', () => {
        if (action === 'replay') {
          this.replayAnimations();
        }
        if (action === 'reset') {
          this.resetSettings();
        }
      });
    });

    this.updateControlStates();
  }

  private updateControlStates() {
    const intensityButtons = this.container.querySelectorAll<HTMLElement>(
      '[data-hero-intensity]'
    );
    const presetButtons =
      this.container.querySelectorAll<HTMLElement>('[data-hero-preset]');
    const toggleButtons =
      this.container.querySelectorAll<HTMLElement>('[data-hero-toggle]');

    intensityButtons.forEach(button => {
      const value = button.dataset.heroIntensity;
      const active = value === this.container.dataset.intensity;
      button.dataset.active = active ? 'true' : 'false';
    });

    presetButtons.forEach(button => {
      const preset = button.dataset.heroPreset;
      const active = preset === this.container.dataset.heroPreset;
      button.dataset.active = active ? 'true' : 'false';
    });

    toggleButtons.forEach(button => {
      const toggle = button.dataset.heroToggle;
      let active = false;
      if (toggle === 'data') {
        active = this.container.dataset.showData !== 'false';
      }
      if (toggle === 'perf') {
        active = this.container.dataset.heroPerf === 'true';
      }
      if (toggle === 'tilt') {
        active = this.container.dataset.heroTilt !== 'false';
      }
      if (toggle === 'fx') {
        active = this.container.dataset.heroFx !== 'false';
      }
      button.dataset.active = active ? 'true' : 'false';
    });

    this.updateTelemetry();
  }

  private applyPreset(preset: 'signal' | 'cinematic' | 'clarity') {
    const presets: Record<
      'signal' | 'cinematic' | 'clarity',
      {
        intensity: 'subtle' | 'medium' | 'intense';
        data: boolean;
        perf: boolean;
      }
    > = {
      signal: { intensity: 'medium', data: true, perf: false },
      cinematic: { intensity: 'intense', data: true, perf: false },
      clarity: { intensity: 'subtle', data: false, perf: true },
    };
    const target = presets[preset];
    this.container.dataset.heroPreset = preset;
    this.container.dataset.intensity = target.intensity;
    this.container.dataset.showData = target.data ? 'true' : 'false';
    this.container.dataset.heroPerf = target.perf ? 'true' : 'false';
    this.container.dataset.heroAutoPerf = target.perf ? 'false' : 'true';
    this.autoPerfEnabled = !target.perf;
    this.userIntensityOverride = true;
    this.baseIntensity = target.intensity;
    this.autoPerfTriggered = false;
    this.storedSettings = {
      intensity: target.intensity,
      data: target.data,
      perf: target.perf,
      preset,
      tilt: this.container.dataset.heroTilt !== 'false',
      fx: this.container.dataset.heroFx !== 'false',
    };
    this.persistSettings();
    this.updateControlStates();
  }

  private resetSettings() {
    this.container.removeAttribute('data-hero-preset');
    this.container.dataset.intensity = this.baseIntensity;
    this.container.dataset.showData = this.baseShowData ? 'true' : 'false';
    this.container.dataset.heroPerf = this.basePerf ? 'true' : 'false';
    this.container.dataset.heroTilt = this.baseTilt ? 'true' : 'false';
    this.container.dataset.heroFx = this.baseFx ? 'true' : 'false';
    this.autoPerfEnabled = !this.basePerf;
    this.container.dataset.heroAutoPerf = this.autoPerfEnabled
      ? 'true'
      : 'false';
    this.userIntensityOverride = false;
    this.autoPerfTriggered = false;
    this.storedSettings = {};
    this.persistSettings();
    if (this.autoPerfEnabled) {
      this.initAutoPerf();
    }
    if (!this.baseTilt) {
      this.resetTilt();
    }
    this.updateControlStates();
  }

  private initTelemetry() {
    this.telemetryNodes = {
      fps: this.container.querySelector<HTMLElement>(
        '[data-hero-telemetry="fps"]'
      ),
      mode: this.container.querySelector<HTMLElement>(
        '[data-hero-telemetry="mode"]'
      ),
      tier: this.container.querySelector<HTMLElement>(
        '[data-hero-telemetry="tier"]'
      ),
      intensity: this.container.querySelector<HTMLElement>(
        '[data-hero-telemetry="intensity"]'
      ),
      data: this.container.querySelector<HTMLElement>(
        '[data-hero-telemetry="data"]'
      ),
      cap: this.container.querySelector<HTMLElement>(
        '[data-hero-telemetry="cap"]'
      ),
    };
    this.sparkBars = Array.from(
      this.container.querySelectorAll<HTMLElement>('[data-hero-spark]')
    );
  }

  private updateTelemetry() {
    const { fps, mode, tier, intensity, data, cap } = this.telemetryNodes;
    if (fps) fps.textContent = this.lastFps ? String(this.lastFps) : '--';
    if (intensity) {
      intensity.textContent =
        this.container.dataset.intensity ?? this.baseIntensity;
    }
    if (data) {
      data.textContent =
        this.container.dataset.showData === 'false' ? 'Off' : 'On';
    }
    if (tier) {
      tier.textContent = this.getQualityTier();
    }
    if (cap) {
      cap.textContent =
        this.container.dataset.heroAutoPerf === 'true' ? 'Auto' : 'Manual';
    }
    if (mode) {
      const reduced = this.container.dataset.heroReduced === 'true';
      const paused = this.container.dataset.heroPaused === 'true';
      const perf = this.container.dataset.heroPerf === 'true';
      const auto = this.container.dataset.heroAutoPerf === 'true';
      if (reduced) mode.textContent = 'Reduced';
      else if (paused) mode.textContent = 'Paused';
      else if (perf && auto) mode.textContent = 'Calm Auto';
      else if (perf) mode.textContent = 'Calm';
      else mode.textContent = 'Active';
    }
  }

  private getQualityTier() {
    const perf = this.container.dataset.heroPerf === 'true';
    if (perf) return 'Calm';
    const intensity =
      (this.container.dataset.intensity as 'subtle' | 'medium' | 'intense') ??
      this.baseIntensity;
    if (intensity === 'intense') return 'Ultra';
    if (intensity === 'subtle') return 'Steady';
    return 'Balanced';
  }

  private pushFpsHistory(fps: number) {
    const normalized = Math.max(0, Math.min(1, fps / 60));
    this.fpsHistory.push(normalized);
    if (this.fpsHistory.length > 24) {
      this.fpsHistory.shift();
    }
    this.updateSparkline();
  }

  private updateSparkline() {
    if (!this.sparkBars.length) return;
    this.sparkBars.forEach((bar, index) => {
      const value = this.fpsHistory[index] ?? 0;
      bar.style.setProperty('--spark', value.toFixed(2));
      let level = 'low';
      if (value >= 0.8) level = 'high';
      else if (value >= 0.55) level = 'mid';
      bar.dataset.level = level;
    });
  }

  private replayAnimations() {
    if (prefersReducedMotion()) return;
    const animNodes =
      this.container.querySelectorAll<HTMLElement>('[data-hero-anim]');
    animNodes.forEach(node => {
      node.style.animation = 'none';
    });
    void this.container.getBoundingClientRect();
    animNodes.forEach(node => {
      node.style.animation = '';
    });
  }

  private initAutoPerf() {
    if (this.fpsRafId) return;
    if (prefersReducedMotion()) return;
    this.fpsLastTime = performance.now();
    const loop = (now: number) => {
      this.fpsFrames += 1;
      const delta = now - this.fpsLastTime;
      if (delta >= 1000) {
        const fps = (this.fpsFrames / delta) * 1000;
        this.lastFps = Math.round(fps);
        this.pushFpsHistory(fps);
        this.fpsFrames = 0;
        this.fpsLastTime = now;
        if (this.autoPerfEnabled && fps < 50) {
          this.fpsSlowTicks += 1;
          this.fpsRecoveryTicks = 0;
        } else {
          this.fpsSlowTicks = 0;
          this.fpsRecoveryTicks += 1;
        }
        if (this.autoPerfEnabled && this.fpsSlowTicks >= 2) {
          this.container.dataset.heroPerf = 'true';
          this.container.dataset.heroAutoPerf = 'true';
          if (!this.userIntensityOverride) {
            this.container.dataset.intensity = 'subtle';
          }
          this.autoPerfTriggered = true;
          this.updateControlStates();
        }
        if (
          this.autoPerfEnabled &&
          this.autoPerfTriggered &&
          this.fpsRecoveryTicks >= 4 &&
          !this.userIntensityOverride
        ) {
          this.container.dataset.heroPerf = 'false';
          this.container.dataset.heroAutoPerf = 'false';
          this.container.dataset.intensity = this.baseIntensity;
          this.autoPerfTriggered = false;
          this.updateControlStates();
        }
        this.updateTelemetry();
      }
      this.fpsRafId = window.requestAnimationFrame(loop);
    };
    this.fpsRafId = window.requestAnimationFrame(loop);
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.scene) return;
    if (this.container.dataset.heroTilt === 'false') return;
    this.container.dataset.heroActive = 'true';
    if (this.pointerLocked) {
      const rect = this.container.getBoundingClientRect();
      const deltaX = event.movementX / rect.width;
      const deltaY = event.movementY / rect.height;
      this.targetX = clamp(this.targetX + deltaX, -0.5, 0.5);
      this.targetY = clamp(this.targetY + deltaY, -0.5, 0.5);
    } else {
      const rect = this.container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      this.targetX = x;
      this.targetY = y;
    }
    this.pointerActive = true;
    this.requestTick();
  };

  private onPointerDown = (event: PointerEvent) => {
    if (!this.scene) return;
    if (this.container.dataset.heroTilt === 'false') return;
    this.isDragging = true;
    this.container.setAttribute('data-hero-drag', 'true');
    this.container.dataset.heroActive = 'true';
    this.container.setPointerCapture(event.pointerId);

    if (event.shiftKey && document.pointerLockElement !== this.container) {
      this.container.requestPointerLock?.();
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    this.isDragging = false;
    this.container.removeAttribute('data-hero-drag');
    this.container.dataset.heroActive = 'false';
    this.container.releasePointerCapture(event.pointerId);

    if (this.pointerLocked && document.pointerLockElement === this.container) {
      document.exitPointerLock?.();
    }
  };

  private onPointerCancel = (event: PointerEvent) => {
    this.isDragging = false;
    this.container.removeAttribute('data-hero-drag');
    this.container.releasePointerCapture(event.pointerId);
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.container;
    if (!this.pointerLocked && this.isDragging) {
      this.container.removeAttribute('data-hero-drag');
    }
  };

  private onPointerLeave = () => {
    this.pointerActive = false;
    this.container.dataset.heroActive = 'false';
    if (!this.pointerLocked) {
      this.targetX = 0;
      this.targetY = 0;
    }
    this.requestTick();
  };

  private resetTilt() {
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.container.style.setProperty('--hero-tilt-x', '0deg');
    this.container.style.setProperty('--hero-tilt-y', '0deg');
    this.container.style.setProperty('--cursor-x', '0');
    this.container.style.setProperty('--cursor-y', '0');
  }

  private requestTick() {
    if (this.rafId) return;
    this.rafId = window.requestAnimationFrame(() => this.tick());
  }

  private tick() {
    this.rafId = 0;
    if (!this.scene) return;

    this.currentX += (this.targetX - this.currentX) * 0.1;
    this.currentY += (this.targetY - this.currentY) * 0.1;

    this.container.style.setProperty(
      '--hero-tilt-x',
      `${this.currentY * -18}deg`
    );
    this.container.style.setProperty(
      '--hero-tilt-y',
      `${this.currentX * 18}deg`
    );
    this.container.style.setProperty(
      '--cursor-x',
      `${this.currentX.toFixed(3)}`
    );
    this.container.style.setProperty(
      '--cursor-y',
      `${this.currentY.toFixed(3)}`
    );

    if (
      this.pointerActive ||
      Math.abs(this.currentX) > 0.001 ||
      Math.abs(this.currentY) > 0.001
    ) {
      this.requestTick();
    }
  }

  private start() {
    if (!this.options.interactive) return;
    if (this.isInteractive) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (this.container.dataset.heroTilt === 'false') return;

    this.container.addEventListener('pointermove', this.onPointerMove, {
      passive: true,
    });
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('pointercancel', this.onPointerCancel);
    this.container.addEventListener('pointerleave', this.onPointerLeave, {
      passive: true,
    });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.isInteractive = true;
    this.updateTelemetry();
  }

  private stop() {
    if (!this.isInteractive) return;
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('pointercancel', this.onPointerCancel);
    this.container.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.isInteractive = false;
    this.pointerActive = false;
    this.isDragging = false;
    this.pointerLocked = false;
    this.container.removeAttribute('data-hero-drag');
    this.container.dataset.heroActive = 'false';
    this.resetTilt();
    this.updateTelemetry();
  }

  public destroy() {
    this.stop();
    if (this.fpsRafId) {
      window.cancelAnimationFrame(this.fpsRafId);
    }
    this.observer?.disconnect();
    this.stopReducedMotion?.();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const heroNodes = document.querySelectorAll<HTMLElement>('[data-hero-3d]');

heroNodes.forEach(node => {
  const interactive = node.dataset.interactive !== 'false';
  const controller = new Hero3DController(node, { interactive });

  window.addEventListener(
    'beforeunload',
    () => {
      controller.destroy();
    },
    { once: true }
  );
});
