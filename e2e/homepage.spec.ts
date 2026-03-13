import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/(Astro Demo 2026|Olive Global Systems)/i);
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('./');
    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute(
      'data-olive-runtime',
      /(default|stability)/
    );
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(staging|booting|interactive|ambient|fallback)/
    );
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /creative technology/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: /story chapters/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /jump to creative technology studio/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /skip immersive intro/i })
    ).toBeVisible();
  });

  test('should let calm-mode users enable immersive scenes', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    const enableScenes = page.getByRole('button', {
      name: /enable immersive scenes/i,
    });
    await expect(enableScenes).toBeVisible();
    await enableScenes.click();

    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(staging|booting|interactive)/
    );
    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );

    await page
      .getByRole('button', { name: /jump to managed operations/i })
      .click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'signal');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
  });

  test('chapter navigation should auto-enable immersive scenes', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    await page
      .getByRole('button', { name: /jump to cloud engineering/i })
      .click();

    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');
    await expect(
      hero.getByRole('heading', { name: /infrastructure/i })
    ).toBeVisible();
    await expect(
      hero.getByRole('heading', { name: /creative technology/i })
    ).not.toBeVisible();

    await page.evaluate(() => {
      const heroElement = document.querySelector<HTMLElement>(
        '[data-olive-universe="ready"]'
      );

      if (!heroElement) return;

      const transitions: string[] = [];
      const observer = new MutationObserver(() => {
        const currentChapter = heroElement.getAttribute('data-current-chapter');

        if (currentChapter) {
          transitions.push(currentChapter);
        }
      });

      observer.observe(heroElement, {
        attributeFilter: ['data-current-chapter'],
      });

      (
        window as Window & {
          __heroChapterTransitionAudit?: {
            transitions: string[];
            observer: MutationObserver;
          };
        }
      ).__heroChapterTransitionAudit = { transitions, observer };
    });

    await page.getByRole('button', { name: /jump to ai systems/i }).click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'neural');
    await expect(
      hero.getByRole('heading', { name: /ai orchestration/i })
    ).toBeVisible();

    const transitions = await page.evaluate(() => {
      const audit = (
        window as Window & {
          __heroChapterTransitionAudit?: {
            transitions: string[];
            observer: MutationObserver;
          };
        }
      ).__heroChapterTransitionAudit;

      audit?.observer.disconnect();
      return audit?.transitions ?? [];
    });

    expect(transitions).not.toContain('vault');
    expect(transitions).not.toContain('cloud');
  });

  test('deep linked hero scenes should load directly', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./?scene=cloud');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');
    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
    await expect(
      hero.getByRole('heading', { name: /infrastructure/i })
    ).toBeVisible();
  });

  test('keyboard shortcuts should navigate hero chapters', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(
      page.getByText(/shortcuts: ← → chapters · home start · end finale/i)
    ).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    await page.keyboard.press('ArrowRight');
    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-current-chapter', 'neural');

    await page.keyboard.press('End');
    await expect(hero).toHaveAttribute('data-current-chapter', 'singularity');

    await page.keyboard.press('Home');
    await expect(hero).toHaveAttribute('data-current-chapter', 'genesis');
  });

  test('story panel scene controls should step through hero chapters', async ({
    page,
  }) => {
    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    const previousScene = page.getByRole('button', {
      name: /previous scene unavailable/i,
    });
    await expect(previousScene).toBeDisabled();

    await page
      .getByRole('button', {
        name: /go to next scene: ai systems/i,
      })
      .click();

    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-current-chapter', 'neural');

    await page
      .getByRole('button', {
        name: /go to previous scene: creative technology studio/i,
      })
      .click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'genesis');
  });

  test('story panel should surface scene progress and the next chapter cue', async ({
    page,
  }) => {
    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();

    await expect(
      page.getByRole('progressbar', {
        name: /creative technology studio scene progress/i,
      })
    ).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByText(/up next: ai systems/i)).toBeVisible();

    await page
      .getByRole('button', {
        name: /go to next scene: ai systems/i,
      })
      .click();

    await expect(
      page.getByRole('progressbar', { name: /ai systems scene progress/i })
    ).toBeVisible();
    await expect(page.getByText(/up next: cybersecurity/i)).toBeVisible();

    await page
      .getByRole('button', { name: /jump to start your project/i })
      .click();
    await expect(page.getByText(/final scene active/i)).toBeVisible();
  });

  test('guided tour should auto-play hero chapters', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-tour', 'idle');
    await expect(hero).toHaveAttribute('data-olive-tour-speed', 'standard');
    await expect(
      page.getByText(
        /guided tour paused · standard pace ready · play to auto-preview every hero chapter/i
      )
    ).toBeVisible();

    await page.getByRole('button', { name: /play guided tour/i }).click();

    await expect(hero).toHaveAttribute('data-olive-tour', 'playing');
    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(
      page.getByRole('button', { name: /pause guided tour/i })
    ).toBeVisible();
    await expect(
      page.getByText(
        /guided tour active · standard pace · next auto-jump: ai systems/i
      )
    ).toBeVisible();

    await expect
      .poll(async () => hero.getAttribute('data-current-chapter'), {
        timeout: 8000,
      })
      .toBe('neural');

    await expect(
      page.getByText(
        /guided tour active · standard pace · next auto-jump: cybersecurity/i
      )
    ).toBeVisible();

    await page.getByRole('button', { name: /pause guided tour/i }).click();
    await expect(hero).toHaveAttribute('data-olive-tour', 'idle');
  });

  test('runtime stability assist should trim the hero render profile when performance pressure is detected', async ({
    browser,
    baseURL,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      (
        window as Window & {
          __OLIVE_FORCE_STABILITY_ASSIST__?: boolean;
        }
      ).__OLIVE_FORCE_STABILITY_ASSIST__ = true;
    });

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-runtime', 'stability');
    await expect(
      page
        .getByLabel('Hero story status')
        .getByText(/performance pressure was detected/i)
    ).toBeVisible();
    await expect(
      hero.getByRole('button', { name: /retry cinematic render/i })
    ).toBeVisible();

    await context.close();
  });

  test('render profile controls should let users lock cinematic or stable 3D playback', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    const storyStatus = page.getByLabel('Hero story status');
    const cinematicProfileButton = storyStatus.getByRole('button', {
      name: /use cinematic render profile/i,
    });
    const stableProfileButton = storyStatus.getByRole('button', {
      name: /use stable render profile/i,
    });
    const adaptiveProfileButton = storyStatus.getByRole('button', {
      name: /use adaptive render profile/i,
    });
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-render-profile', 'adaptive');
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    await cinematicProfileButton.scrollIntoViewIfNeeded();
    await cinematicProfileButton.click();

    await expect(hero).toHaveAttribute(
      'data-olive-render-profile',
      'cinematic'
    );
    await expect(hero).toHaveAttribute('data-olive-mode', 'immersive');
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(staging|booting|interactive)/
    );
    await expect(
      storyStatus.getByText(/cinematic render profile is active/i)
    ).toBeVisible();

    await stableProfileButton.scrollIntoViewIfNeeded();
    await stableProfileButton.click();

    await expect(hero).toHaveAttribute('data-olive-render-profile', 'stable');
    await expect(hero).toHaveAttribute('data-olive-mode', 'lite');
    await expect(
      storyStatus.getByText(/stable render profile is active/i)
    ).toBeVisible();

    await adaptiveProfileButton.scrollIntoViewIfNeeded();
    await adaptiveProfileButton.click();

    await expect(hero).toHaveAttribute('data-olive-render-profile', 'adaptive');
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');
  });

  test('story panel should surface the active atmosphere signature for each chapter', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    const storyStatus = page.getByLabel('Hero story status');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-atmosphere', 'genesis');
    await expect(storyStatus.getByText(/atmosphere signature/i)).toBeVisible();
    await expect(storyStatus.getByText(/solar bloom/i)).toBeVisible();

    await page.getByRole('button', { name: /jump to cybersecurity/i }).click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'vault');
    await expect(hero).toHaveAttribute('data-olive-atmosphere', 'vault');
    await expect(storyStatus.getByText(/zero-trust prism/i)).toBeVisible();

    await page
      .getByRole('button', { name: /jump to managed operations/i })
      .click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'signal');
    await expect(hero).toHaveAttribute('data-olive-atmosphere', 'signal');
    await expect(storyStatus.getByText(/carrier grid/i)).toBeVisible();
  });

  test('scene cache should prime every hero chapter for cleaner scene jumps', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    const storyStatus = page.getByLabel('Hero story status');
    await expect(hero).toBeVisible();

    await page
      .getByRole('button', { name: /use cinematic render profile/i })
      .click();

    await expect(hero).toHaveAttribute(
      'data-olive-scene-cache',
      /(warming|primed)/
    );

    await expect
      .poll(async () => hero.getAttribute('data-olive-scene-ready-count'), {
        timeout: 5000,
      })
      .toBe('6');

    await expect(hero).toHaveAttribute('data-olive-scene-cache', 'primed');
    await expect(
      storyStatus.getByText(/every 3d chapter has been primed/i)
    ).toBeVisible();

    await page
      .getByRole('button', { name: /jump to start your project/i })
      .click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'singularity');
    await expect(hero.getByRole('heading', { name: /enter/i })).toBeVisible();
  });

  test('chapter jumps should surface a cinematic handoff state while the next scene syncs in', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    const storyStatus = page.getByLabel('Hero story status');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-handoff', 'idle');

    await page
      .getByRole('button', { name: /jump to cloud engineering/i })
      .click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');
    await expect(hero).toHaveAttribute('data-olive-handoff', 'syncing');
    await expect(
      storyStatus.getByText(/scene handoff active · cloud engineering scene/i)
    ).toBeVisible();

    await expect
      .poll(async () => hero.getAttribute('data-olive-handoff'), {
        timeout: 5000,
      })
      .toBe('idle');
  });

  test('manual chapter navigation should pause the guided tour and keep the selected speed', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();

    await page
      .getByRole('button', { name: /use fast guided tour speed/i })
      .click();

    await expect(hero).toHaveAttribute('data-olive-tour-speed', 'fast');
    await expect(
      page.getByText(
        /guided tour paused · fast pace ready · play to auto-preview every hero chapter/i
      )
    ).toBeVisible();

    await page.getByRole('button', { name: /play guided tour/i }).click();

    await expect(hero).toHaveAttribute('data-olive-tour', 'playing');
    await expect(
      page.getByText(
        /guided tour active · fast pace · next auto-jump: ai systems/i
      )
    ).toBeVisible();

    await page
      .getByRole('button', { name: /jump to cloud engineering/i })
      .click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');
    await expect(hero).toHaveAttribute('data-olive-tour', 'idle');
    await expect(hero).toHaveAttribute('data-olive-tour-speed', 'fast');
    await expect(
      page.getByText(
        /guided tour paused · fast pace ready · play to auto-preview every hero chapter/i
      )
    ).toBeVisible();
  });

  test('scene share controls should use native sharing when available', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: async (data: {
          title?: string;
          text?: string;
          url?: string;
        }) => {
          (
            window as Window & {
              __sharedScene?: { title?: string; text?: string; url?: string };
            }
          ).__sharedScene = data;
        },
      });

      Object.defineProperty(window.navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
    });

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-current-chapter', 'genesis');

    const shareScene = page.getByRole('button', {
      name: /share scene/i,
    });
    await shareScene.click();

    await expect(
      page.getByRole('button', { name: /scene shared/i })
    ).toBeVisible();

    const sharedScene = await page.evaluate(() => {
      return (
        (
          window as Window & {
            __sharedScene?: { title?: string; text?: string; url?: string };
          }
        ).__sharedScene ?? null
      );
    });

    expect(sharedScene).not.toBeNull();
    expect(sharedScene?.title).toMatch(/creative technology studio/i);
    expect(sharedScene?.text).toMatch(/creative technology studio/i);
    expect(sharedScene?.url).toContain('?scene=genesis');
    expect(sharedScene?.url).toContain('#hero-genesis');
  });

  test('scene share controls should expose the active chapter link', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: undefined,
      });

      Object.defineProperty(window.navigator, 'canShare', {
        configurable: true,
        value: undefined,
      });

      const clipboard = {
        writeText: async (text: string) => {
          (
            window as Window & { __copiedSceneLink?: string }
          ).__copiedSceneLink = text;
        },
      };

      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: clipboard,
      });
    });

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-current-chapter', 'genesis');
    await expect(
      page.getByRole('link', {
        name: /open scene link for creative technology studio/i,
      })
    ).toHaveAttribute('href', /\?scene=genesis#hero-genesis$/);

    await page.evaluate(() => {
      (
        window as Window & { __copiedSceneLink?: string | null }
      ).__copiedSceneLink = null;
    });

    const copySceneLink = page.getByRole('button', {
      name: /copy scene link/i,
    });
    await copySceneLink.click();
    await expect(
      page.getByRole('button', { name: /scene link copied/i })
    ).toBeVisible();

    const copiedSceneLink = await page.evaluate(() => {
      return (
        (window as Window & { __copiedSceneLink?: string }).__copiedSceneLink ??
        null
      );
    });

    expect(copiedSceneLink).toContain('?scene=genesis');
    expect(copiedSceneLink).toContain('#hero-genesis');

    await expect(
      page.getByRole('link', {
        name: /open scene link for creative technology studio/i,
      })
    ).toHaveAttribute('href', /\?scene=genesis#hero-genesis$/);
  });

  test('touch swipe should step through hero chapters', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 430, height: 932 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');
    await expect(hero).toHaveAttribute('data-olive-mobile-panel', 'closed');
    await expect(hero).toHaveAttribute('data-olive-mobile-3d', 'optimized');
    await expect(
      page.getByRole('button', {
        name: /show hero controls for creative technology studio/i,
      })
    ).toBeVisible();

    await hero.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      pointerId: 1,
      clientX: 340,
      clientY: 360,
      isPrimary: true,
      bubbles: true,
    });
    await hero.dispatchEvent('pointerup', {
      pointerType: 'touch',
      pointerId: 1,
      clientX: 120,
      clientY: 376,
      isPrimary: true,
      bubbles: true,
    });

    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-current-chapter', 'neural');
    await expect(hero).toHaveAttribute('data-olive-atmosphere', 'neural');

    await hero.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      pointerId: 2,
      clientX: 110,
      clientY: 360,
      isPrimary: true,
      bubbles: true,
    });
    await hero.dispatchEvent('pointerup', {
      pointerType: 'touch',
      pointerId: 2,
      clientX: 330,
      clientY: 372,
      isPrimary: true,
      bubbles: true,
    });

    await expect(hero).toHaveAttribute('data-current-chapter', 'genesis');
    await expect(hero).toHaveAttribute('data-olive-atmosphere', 'genesis');

    await context.close();
  });

  test('mobile hero controls should collapse into a compact dock without losing scene jumps', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 430, height: 932 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    const mobileToggle = page.getByRole('button', {
      name: /show hero controls for creative technology studio/i,
    });
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mobile-panel', 'closed');
    await expect(hero).toHaveAttribute('data-olive-mobile-3d', 'optimized');
    await expect(mobileToggle).toBeVisible();

    await mobileToggle.click();

    const storyStatus = page.getByLabel('Hero story status');
    await expect(hero).toHaveAttribute('data-olive-mobile-panel', 'open');
    await expect(storyStatus).toBeVisible();

    await storyStatus
      .getByRole('button', { name: /jump to cloud engineering/i })
      .click();

    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');
    await expect(hero).toHaveAttribute('data-olive-atmosphere', 'cloud');
    await expect(hero).toHaveAttribute('data-olive-mobile-panel', 'closed');
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(staging|booting|interactive)/
    );
    await expect(
      page.getByRole('button', {
        name: /show hero controls for cloud engineering/i,
      })
    ).toBeVisible();

    await context.close();
  });

  test('scrolling deeper should auto-enable immersive scenes', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    await page.evaluate(() => {
      const heroElement = document.querySelector<HTMLElement>(
        '[data-olive-universe="ready"]'
      );

      if (!heroElement) return;

      const heroTop = window.scrollY + heroElement.getBoundingClientRect().top;
      const total = heroElement.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: heroTop + total * 0.46,
        behavior: 'auto',
      });
    });

    await expect(hero).toHaveAttribute(
      'data-olive-motion-preference',
      'immersive'
    );
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
    await expect(hero).toHaveAttribute('data-current-chapter', 'vault');
  });

  test('should progress through immersive hero chapters', async ({
    browser,
    baseURL,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);

    await page
      .getByRole('button', { name: /jump to cloud engineering/i })
      .click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');

    await page
      .getByRole('button', { name: /jump to start your project/i })
      .click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'singularity');

    await context.close();
  });

  test('should have working navigation', async ({ page, isMobile }) => {
    await page.goto('./');

    const headerNav = page.getByRole('navigation', {
      name: /main navigation/i,
    });
    await expect(headerNav).toBeVisible();

    const openMobileMenuIfNeeded = async () => {
      if (!isMobile) return null;
      const menuButton = page.locator('#mobile-menu-button');
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toBeVisible();
      return mobileMenu;
    };

    // Spot-check primary links exist on desktop and mobile.
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await expect(
        mobileMenu!.getByRole('link', { name: /^services$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^contact$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^portfolio$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^home$/i })
      ).toBeVisible();
    } else {
      await expect(
        headerNav.getByRole('link', { name: /^services$/i })
      ).toBeVisible();
      await expect(
        headerNav.getByRole('link', { name: /^contact$/i })
      ).toBeVisible();
      await expect(
        headerNav.getByRole('link', { name: /^portfolio$/i })
      ).toBeVisible();
    }
  });

  test('should navigate using main links', async ({ page, isMobile }) => {
    await page.goto('./');

    if (isMobile) {
      test.skip();
    }

    const navigateFromHome = async (linkName: RegExp, target: RegExp) => {
      await page.goto('./');

      const headerNav = page.getByRole('navigation', {
        name: /main navigation/i,
      });

      const link = headerNav.getByRole('link', { name: linkName });
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(target);
    };

    await navigateFromHome(/^services$/i, /.*\/services\/?$/);
    await navigateFromHome(/^contact$/i, /.*\/contact-hq\/?$/);
    await navigateFromHome(/^portfolio$/i, /.*\/about\/?$/);
  });

  test('primary CTA should jump to consultation form', async () => {
    test.skip();
  });
});
