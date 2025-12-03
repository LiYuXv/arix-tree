# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run dev` - Start Vite development server with HMR
- `npm run build` - TypeScript compilation followed by Vite production build
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Preview production build locally

## Architecture

This is a React Three.js application that renders an interactive 3D Christmas tree visualization.

### Core Components

**App.tsx** - Main scene orchestrator
- Sets up the Three.js Canvas with React Three Fiber
- Configures lighting (ambient, point, spot lights) and Environment preset
- Manages the `isTreeShape` state that toggles between scattered and tree formations
- Applies post-processing effects (Bloom, Noise, Vignette) for visual polish

**Foliage.tsx** - Particle system for tree needles (15,000 points)
- Uses custom GLSL shaders for particle rendering and animation
- Interpolates between scattered sphere positions and cone (tree) positions
- Shader uniforms control transition progress, time-based animation, and color gradients

**Ornaments.tsx** - Instanced mesh decorations (boxes and spheres)
- Uses `THREE.InstancedMesh` for efficient rendering of many objects
- Interactive: clicking a box ornament opens a fullscreen card overlay
- GiftCard component uses drei's `<Html>` with fullscreen mode for UI overlay

**utils.ts** - Geometry helpers
- `getConePosition()` - Random points on cone surface (tree shape)
- `getSpherePosition()` - Random points in sphere volume (scattered state)
- `TREE_HEIGHT` and `TREE_RADIUS` constants define tree dimensions

### Key Patterns

- All particle/ornament animations use `useFrame` with lerp-based interpolation
- The `isTreeShape` boolean prop drives the scattered-to-tree transition throughout
- Custom shader materials use TypedArrays (`Float32Array`) for buffer attributes
- Post-processing via `@react-three/postprocessing` for cinematic effects

### Dependencies

- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers (Environment, OrbitControls, Html, etc.)
- `@react-three/postprocessing` - Post-processing effects
- `three` - Core 3D library
