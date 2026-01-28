import type { SceneDirector } from './scene-director';

export class UIControls {
  private director: SceneDirector;
  private container: HTMLElement;
  private panel: HTMLElement;
  private visible = false;

  constructor(director: SceneDirector, root: HTMLElement) {
    this.director = director;

    // Main Container (Bottom Right)
    this.container = document.createElement('div');
    this.container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 1000;
        font-family: 'JetBrains Mono', 'Menlo', monospace;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        pointer-events: none; /* Let clicks pass through empty space */
        gap: 8px;
    `;

    // Toggle Button (Cyberpunk Style)
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '/// SYSTEM_CTRL';
    toggleBtn.style.cssText = `
        pointer-events: auto;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(0, 255, 136, 0.4);
        color: rgba(0, 255, 136, 0.9);
        padding: 8px 16px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        backdrop-filter: blur(8px);
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 2px;
        clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
    `;
    toggleBtn.onmouseover = () => {
      toggleBtn.style.borderColor = '#00ff88';
      toggleBtn.style.background = 'rgba(0, 255, 136, 0.1)';
      toggleBtn.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.3)';
    };
    toggleBtn.onmouseout = () => {
      toggleBtn.style.borderColor = 'rgba(0, 255, 136, 0.4)';
      toggleBtn.style.background = 'rgba(0,0,0,0.6)';
      toggleBtn.style.boxShadow = 'none';
    };
    toggleBtn.onclick = () => this.toggle();

    // Panel
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
        pointer-events: auto;
        background: rgba(5, 5, 8, 0.95);
        border: 1px solid rgba(255,255,255,0.1);
        border-right: 2px solid rgba(0, 255, 136, 0.5);
        padding: 20px;
        width: 260px;
        display: none; /* Hidden by default */
        flex-direction: column;
        gap: 16px;
        backdrop-filter: blur(16px);
        box-shadow: -10px 10px 30px rgba(0,0,0,0.8);
        border-radius: 4px;
        margin-bottom: 8px;
    `;

    // Header
    const title = document.createElement('div');
    title.textContent = 'VISUAL DIRECTOR v2.0';
    title.style.cssText =
      'color: #fff; font-size: 12px; font-weight: bold; letter-spacing: 1px; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 4px;';
    this.panel.appendChild(title);

    // --- CONTROLS ---

    // 1. Simulation Speed
    this.addSlider('Sim Speed', 0, 2.0, 1.0, 0.1, v => {
      this.director.timeScale = v;
    });

    // 2. Interaction Intensity (Manual Press)
    this.addSlider('Intensity (Press)', 0, 1.0, 0.0, 0.05, v => {
      this.director.manualPress = v;
    });

    // 3. Glitch / Trails
    this.addSlider('Glitch Damp', 0.0, 0.98, 0.0, 0.01, v => {
      this.director.afterimagePass.uniforms['damp'].value = v;
    });

    // 4. Focus (Aperture)
    this.addSlider('Focus Blur', 0.0001, 0.05, 0.001, 0.0001, v => {
      // 0.05 is very blurry, 0.0001 is crisp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.director.bokehPass.uniforms as any)['aperture'].value = v;
    });

    // 5. Exposure
    this.addSlider('Exposure', 0.1, 3.0, 0.9, 0.1, v => {
      this.director.renderer.toneMappingExposure = v;
    });

    // 6. Bloom Strength
    this.addSlider('Bloom', 0.0, 3.0, 0.6, 0.1, v => {
      this.director.bloomPass.strength = v;
    });

    this.addToggle('Auto-Rotate', false, v => {
      this.director.autoRotate = v;
    });

    // Randomize Button
    const rndBtn = document.createElement('button');
    rndBtn.textContent = 'RANDOMIZE PARAMS';
    rndBtn.style.cssText = `
        background: #333; color: #ccc; border: 1px solid #555;
        padding: 6px; font-size: 10px; cursor: pointer;
        margin-top: 8px; width: 100%;
    `;
    rndBtn.onclick = () => {
      // Random visual params
      const bloom = 0.2 + Math.random() * 2.0;
      const speed = 0.5 + Math.random() * 1.5;
      const focus = 0.0001 + Math.random() * 0.01;

      this.director.bloomPass.strength = bloom;
      this.director.timeScale = speed;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.director.bokehPass.uniforms as any)['aperture'].value = focus;

      // Update UI? (Simple way: force reload checks... not implemented, but user sees effect)
    };
    this.panel.appendChild(rndBtn);

    const sceneSelect = this.createSceneSelect();
    this.panel.appendChild(sceneSelect);

    this.container.appendChild(this.panel);
    this.container.appendChild(toggleBtn);
    root.appendChild(this.container);
  }

  toggle() {
    this.visible = !this.visible;
    this.panel.style.display = this.visible ? 'flex' : 'none';
  }

  addSlider(
    label: string,
    min: number,
    max: number,
    initial: number,
    step: number,
    callback: (val: number) => void
  ) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    const header = document.createElement('div');
    header.style.cssText =
      'display: flex; justify-content: space-between; color: #888; font-size: 10px; text-transform: uppercase;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = label;
    const valSpan = document.createElement('span');
    valSpan.textContent = initial.toFixed(2);
    valSpan.style.color = '#00ff88';

    header.appendChild(nameSpan);
    header.appendChild(valSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = initial.toString();
    input.style.cssText = `
        width: 100%; cursor: pointer; accent-color: #00ff88;
        background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px;
        appearance: none;
    `;

    input.oninput = e => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      valSpan.textContent = val.toFixed(2);
      callback(val);
    };

    row.appendChild(header);
    row.appendChild(input);
    this.panel.appendChild(row);
  }

  addToggle(label: string, initial: boolean, callback: (val: boolean) => void) {
    const row = document.createElement('div');
    row.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; color: #aaa; font-size: 11px;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = initial;
    input.style.cursor = 'pointer';
    input.style.accentColor = '#00ff88';

    input.onchange = e => callback((e.target as HTMLInputElement).checked);

    row.appendChild(nameSpan);
    row.appendChild(input);
    this.panel.appendChild(row);
  }

  createSceneSelect() {
    const container = document.createElement('div');
    container.style.cssText =
      'display: flex; flex-direction: column; gap: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; margin-top: 4px;';

    const label = document.createElement('div');
    label.textContent = 'JUMP TO SECTOR';
    label.style.cssText =
      'color: #888; font-size: 10px; text-transform: uppercase;';

    const select = document.createElement('select');
    select.style.cssText =
      'background: #111; color: #fff; border: 1px solid #333; padding: 6px; font-family: inherit; font-size: 11px; width: 100%; border-radius: 2px;';

    // Populate indices based on actual scene count
    const maxIndex = Math.max(0, this.director.getSceneCount() - 1);
    for (let i = 0; i <= maxIndex; i++) {
      const opt = document.createElement('option');
      opt.value = i.toString();
      // Describe them briefly if possible, but IDs are fine for now
      let label = `SCENE ${i.toString().padStart(2, '0')}`;
      if (i === 9) label += ' (SHARDS)';
      if (i === 10) label += ' (MOIRE)';
      if (i === 13) label += ' (ABYSS)';

      opt.textContent = label;
      select.appendChild(opt);
    }

    select.onchange = e => {
      const idx = parseInt((e.target as HTMLSelectElement).value);
      const count = Math.max(1, this.director.getSceneCount());
      const t = count <= 1 ? 0 : idx / (count - 1);
      this.director.setProgress(t);
    };

    container.appendChild(label);
    container.appendChild(select);
    return container;
  }
}
