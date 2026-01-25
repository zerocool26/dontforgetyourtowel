# High-Level 3D Advancements Roadmap

## 1. Post-Processing Stack (The "Wow" Factor)

Currently, scenes are rendered raw. To push into "wow territory", we need a global post-processing pipeline.

- **Unreal Bloom**: High quality glow for neon cities, fireflies, and data streams.
- **Chromatic Aberration**: Adds cinematic lens imperfections, essential for "glitch" and "entropy" scenes.
- **Depth of Field (Bokeh)**: Cinematic focus pulling (e.g., focus on the foreground firefly while the background blurs).
- **Film Grain**: Subtle texture to remove the "clean CGI" look.

## 2. Advanced Material Systems

- **Matcap/PBR Enhancements**: Use HDRI environment maps for realistic reflections in "Liquid Metal" and "Glass" scenes.
- **Transmission Shaders**: Real-time refraction for crystals and glass shards (simulated via offscreen render targets for performance).
- **Volumetrics**: Fake volumetric rays (God Rays) using radial blur or raymarching for the "Aurora" and "Abyss" scenes.

## 3. Interactive Physics

- **Rapier/Main Thread Physics**: Integrate a lightweight physics engine so when you scroll or touch, objects don't just move away, they _collide_ and tumble.
- **Fluid Simulation**: For "Liquid Metal", replace vertex noise with a localized GPGPU fluid calculation.

## 4. Audio-Reactive Elements

- **FFT Analysis**: Hook up a microphone or music track. Make the "Visualizer", "Cyber City", and "Pulse" scenes react to bass/treble.

## 5. Performance Optimization (GPU Instancing)

- **GPGPU Particles**: Move particle position updates from CPU (current loop) to GPU (Compute Shaders or Texture Transform Feedback). This allows shifting from 40k particles to 1,000,000+ particles for the "Aurora" and "Fireflies".

## 6. Transitions

- **Morph Targets**: Instead of fading out scene A and fading in scene B, _morph_ the particles of scene A into the shape of scene B.
