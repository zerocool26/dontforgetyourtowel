import * as THREE from 'three';

export class AudioController {
  private listener: THREE.AudioListener;
  public audio: THREE.Audio;
  private analyser: THREE.AudioAnalyser | null = null;
  private isPlaying = false;
  private loaded = false;

  // Analysis Data
  public level = 0;
  public bass = 0;
  public high = 0;

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.audio = new THREE.Audio(this.listener);
  }

  load(url: string) {
    const loader = new THREE.AudioLoader();
    loader.load(url, buffer => {
      this.audio.setBuffer(buffer);
      this.audio.setLoop(true);
      this.audio.setVolume(0.5);

      this.analyser = new THREE.AudioAnalyser(this.audio, 64);
      this.loaded = true;
    });
  }

  toggle() {
    if (!this.loaded) return;
    if (this.audio.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play();
      this.isPlaying = true;
    }
  }

  update(dt: number) {
    if (!this.analyser) {
      // Simulated heartbeat if no audio
      const t = performance.now() / 1000;
      const beat = Math.sin(t * 8.0) > 0.9 ? 1.0 : 0.0;
      this.level = this.level * 0.9 + beat * 0.1;
      return;
    }

    const data = this.analyser.getFrequencyData();
    // Simple average
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length;

    // Normalize roughly 0..1
    const targetLevel = avg / 128.0;

    // Smooth
    this.level += (targetLevel - this.level) * 10.0 * dt;
    this.bass = data[2] / 255.0; // Low freq
    this.high = data[50] / 255.0; // High freq
  }
}
