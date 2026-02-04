# Visual Showroom Evolution: Phase 4 & Platinum Concepts

Following the successful implementation of Pro-Level Layout and Advanced UI systems, these prompts focus on **Visual Fidelity (VFX)**, **Physics Simulation**, and **Professional Visualization**.

---

## 💎 Platinum Evolution Prompts (11-20)

### 11. The "Sound of Speed" (Acoustic Depth)

> **Prompt:** "Integrate a procedural audio engine using the Web Audio API. Implement an `EngineNoise` class that generates a synthetic rumble. Link the `pitch` and `volume` of the engine and wind resistance sounds to the `Motion Speed` slider, creating an immersive sense of velocity as the car 'spins' its wheels or the floor 'scrolls' beneath it."

### 12. "Lidar / Digital Twin" Visualization

> **Prompt:** "Create a custom shader pass that renders the car as a high-density point cloud or a technical holographic wireframe. Use the `distance` from the camera to color-code the points (Depth-based Heatmap). This 'Digital Twin' mode should include floating technical readouts of the mesh's vertex count and bounding box dimensions."

### 13. "Thermal Signature" Mode

> **Prompt:** "Implement a 'Thermal Vision' post-processing effect. Use a custom `ShaderMaterial` to map surface temperatures: Brakes and Exhaust areas should glow 'White Hot' (emissive) when `Motion Speed` is high, while the rest of the body transitions from 'Blue' (cold) to 'Yellow' (ambient). Slowly dissipate the heat when the motion stops."

### 14. "Augmented Reality" Data Overlay

> **Prompt:** "Implement a 'Specs Anchor' system. Using `CSS2DRenderer`, project manufacturer specifications (Horsepower, 0-60mph, Weight) onto the 3D ground plane next to the car. As the car rotates or the camera moves, these labels should remain fixed in 3D space but always face the viewer, creating an AR-style showroom experience."

### 15. "Exploded View" (Kinematic Disassembly)

> **Prompt:** "Add a 'Disassemble' slider that offsets all primary mesh groups (Doors, Hood, Trunk, Wheels, Panels) along their local 'Normal' vectors or a predetermined axis. This allows the user to see 'inside' the model structure. Ensure the transition is interpolated smoothly in the `tick` loop."

### 16. "Dynamic License Plate" Generator

> **Prompt:** "Create a 'Plate Lab' UI section. Implement a `CanvasTexture` that renders custom user text, a background color, and a region logo (e.g., EU/USA styles) onto the car's license plate geometry. Update the texture in real-time as the user types in the settings panel."

### 17. "Kinetic Brake Glow" Simulation

> **Prompt:** "Enhance the `isCaliper / isBrake` mesh detection. When `Wheel Spin` is enabled and then suddenly disabled (simulating braking), increase the `emissive` color of the brake discs to a bright orange/red and slowly fade it back to black, mimicking the heat dissipation of ceramic brakes."

### 18. "First-Person Interior" Tour

> **Prompt:** "Implement a 'Cockpit View' button that smoothly animates the `OrbitControls` target and position into the driver's seat. Lock the camera movement to the interior coordinates but allow a 360-degree rotation. Adjust the `camera.near` plane to 0.001 to prevent 'self-clipping' within the cabin."

### 19. "Metallic Flake" Paint Shader

> **Prompt:** "Upgrade the body paint material with a procedural flake effect. Use a small, high-frequency tiled normal map (or an on-the-fly shader) on the `clearcoatNormalMap` layer of a `MeshPhysicalMaterial`. This should create the 'sparkle' effect seen in metallic luxury paints when hit by strong rim lighting."

### 20. "Studio Master" Presets

> **Prompt:** "Implement a 'Look Presets' system that goes beyond colors. Create named presets like **'The Commercial'** (High Bloom, Slow Orbit, 2.35:1 Letterbox), **'Technical Blueprint'** (Wireframe, Light-Gray background, Top-down camera), and **'Midnight Run'** (Blue lighting, Grime enabled, Headlights at 5.0 intensity)."

---

## 🛠 Active Technical Inventory (Phase 3 Completed)

- [x] **PBR Advanced**: Sheen, Iridescence, and Clearcoat Roughness integrated.
- [x] **Physics Look**: Wheel rotation and Floor texture scrolling implemented.
- [x] **Automation**: Motion Factor now controls all rotation/scrolling speeds globally.
- [x] **Procedural Assets**: Floor Grid generated on-demand for motion reference.
