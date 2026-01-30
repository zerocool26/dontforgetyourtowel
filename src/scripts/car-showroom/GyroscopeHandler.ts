/**
 * Gyroscope/Device Orientation handler for immersive mobile viewing
 * Tilt your phone to rotate the camera around the model
 */

export interface GyroscopeCallbacks {
  onRotate: (yaw: number, pitch: number) => void;
}

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export class GyroscopeHandler {
  private callbacks: GyroscopeCallbacks;
  private isActive = false;
  private hasPermission = false;

  private baseAlpha = 0;
  private baseBeta = 0;
  private baseGamma = 0;

  private smoothedAlpha = 0;
  private smoothedBeta = 0;
  private smoothedGamma = 0;

  private smoothing = 0.15; // Lower = smoother but slower response

  constructor(callbacks: GyroscopeCallbacks) {
    this.callbacks = callbacks;
  }

  public async requestPermission(): Promise<boolean> {
    // For iOS 13+ we need to request permission
    const DeviceOrientationEventTyped =
      DeviceOrientationEvent as unknown as typeof DeviceOrientationEventiOS;

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEventTyped.requestPermission === 'function'
    ) {
      try {
        const permission =
          await DeviceOrientationEventTyped.requestPermission!();
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
      } catch (error) {
        console.warn('DeviceOrientation permission denied:', error);
        return false;
      }
    }

    // For Android and older iOS, no permission needed
    this.hasPermission = true;
    return true;
  }

  public async start() {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Gyroscope permission not granted');
        return false;
      }
    }

    this.isActive = true;
    window.addEventListener('deviceorientation', this.handleOrientation, true);
    return true;
  }

  public stop() {
    this.isActive = false;
    window.removeEventListener(
      'deviceorientation',
      this.handleOrientation,
      true
    );
  }

  public calibrate() {
    // Reset base position to current orientation
    this.baseAlpha = this.smoothedAlpha;
    this.baseBeta = this.smoothedBeta;
    this.baseGamma = this.smoothedGamma;
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (!this.isActive) return;

    const alpha = event.alpha || 0; // Z-axis (compass direction) 0-360
    const beta = event.beta || 0; // X-axis (front-back tilt) -180 to 180
    const gamma = event.gamma || 0; // Y-axis (left-right tilt) -90 to 90

    // Initialize base position on first reading
    if (this.baseAlpha === 0 && this.baseBeta === 0 && this.baseGamma === 0) {
      this.baseAlpha = alpha;
      this.baseBeta = beta;
      this.baseGamma = gamma;
      this.smoothedAlpha = alpha;
      this.smoothedBeta = beta;
      this.smoothedGamma = gamma;
      return;
    }

    // Apply exponential smoothing
    this.smoothedAlpha = this.lerp(this.smoothedAlpha, alpha, this.smoothing);
    this.smoothedBeta = this.lerp(this.smoothedBeta, beta, this.smoothing);
    this.smoothedGamma = this.lerp(this.smoothedGamma, gamma, this.smoothing);

    // Calculate relative rotation from base position
    const _deltaAlpha = this.normalizeAngle(
      this.smoothedAlpha - this.baseAlpha
    );
    const deltaBeta = this.smoothedBeta - this.baseBeta;
    const deltaGamma = this.smoothedGamma - this.baseGamma;

    // Convert to camera rotation
    // In portrait mode: gamma = yaw (horizontal), beta = pitch (vertical)
    // Sensitivity multipliers (adjust these for preference)
    const yawSensitivity = 0.015;
    const pitchSensitivity = 0.01;

    const yaw = deltaGamma * yawSensitivity;
    const pitch = -deltaBeta * pitchSensitivity; // Negative because tilting up should look up

    this.callbacks.onRotate(yaw, pitch);
  };

  private lerp(current: number, target: number, alpha: number): number {
    return current + (target - current) * alpha;
  }

  private normalizeAngle(angle: number): number {
    // Normalize angle to -180 to 180 range
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  public isSupported(): boolean {
    return (
      typeof DeviceOrientationEvent !== 'undefined' && 'ontouchstart' in window
    );
  }

  public getStatus(): {
    supported: boolean;
    active: boolean;
    hasPermission: boolean;
  } {
    return {
      supported: this.isSupported(),
      active: this.isActive,
      hasPermission: this.hasPermission,
    };
  }
}
