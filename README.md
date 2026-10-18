# 🎲 Wall-go AI — 3D Abstract Strategy Board Game Hub

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.21.04-success.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android-orange.svg)
![Engine](https://img.shields.io/badge/3D%20Engine-Three.js-black.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)

**A high-fidelity 3D tabletop gaming portal featuring legendary abstract strategy board games, custom heuristic AI engines, real-time online multiplayer, and pass-and-play.**

[📥 **Download Latest Android APK**](https://github.com/zioseb62/Wall-Go-AI/releases/latest) • [🎮 **Play Web Version**](https://ais-pre-nmt23mxb4hxlpx5nw7mzvm-26997898689.europe-west3.run.app)

</div>

---

## 🌟 Overview

**Wall-go AI** is a complete, modern recreation of timeless abstract strategy board games in an immersive **3D environment**. Built with **React 19**, **TypeScript**, and **Three.js**, it bridges centuries-old tactical challenges with smooth 60 FPS 3D graphics, dynamic lighting, customizable board themes, and intelligent computer opponents.

Whether playing locally with friends on a single screen, challenging remote opponents in real time, or sparring against adaptive AI opponents, Wall-go AI delivers a pure tactical board game experience.

---

## 🕹️ Featured Games

### 🧱 1. Wall-go (3D Quoridor Variant)
- **Goal**: Be the first player to guide your pawn to the opposite side of the grid.
- **Mechanics**: On each turn, choose between moving your pawn or placing wooden walls to construct mazes and block your opponent's path.
- **Special Power**: Utilize the tactical *Wall-breaker* to shatter obstacle barriers at critical junctures.

### ⚪ 2. Abalone 3D
- **Goal**: Be the first to push 6 of your opponent's marbles off the hexagonal board.
- **Mechanics**: Move single marbles or inline groups of 2 or 3 marbles. 
- **Sumito Rule**: You can push your opponent's marbles only when you have numerical superiority in line (3 vs 2, 3 vs 1, or 2 vs 1) into an adjacent empty space or off the perimeter.

### 🥋 3. Onitama
- **Goal**: Capture the enemy Master pawn, or move your own Master onto the opponent's starting Temple Archway space.
- **Mechanics**: Fast-paced 5x5 martial arts duel played with a rotating pool of 5 ancient animal movement cards. Playing a card passes it to your opponent, constantly shifting available tactics.

### 🚩 4. Stratego
- **Goal**: Find and capture the opponent's Flag while protecting your own.
- **Mechanics**: Battlefield tactics with hidden pieces (Fog of War). Command Marshals, Generals, Scouts, Spies, and Miners to defuse deadly landmines and unmask enemy ranks.

### 🌀 5. Abstract Classics & Modern Variants
- **Dominio**: Territorial control and spatial placement strategy.
- **Orbito**: Dynamic concentric shifting board mechanics.
- **Yinsh**: Ring placement and marker flipper mechanics.
- **Chain Triangle**: Geometric territory and connection game.

---

## ✨ Key Features

- 🧠 **Adaptive AI Engines**: Each game includes custom heuristic algorithms with multiple difficulty tiers (Novice, Tactical, Grandmaster).
- 🌐 **Real-Time Online Multiplayer**:
  - Instant matchmaking with random players.
  - Private room creation with custom room codes for inviting friends.
  - Simulated AI opponent fallback for offline or quick practice.
- 📱 **Pass & Play (Local Tabletop)**: Play two-player head-to-head on the same phone, tablet, or PC monitor.
- 🎨 **Immersive 3D Graphics**:
  - Full 360° orbit camera, pitch tilt, and smooth zoom.
  - Multiple aesthetic board themes: *Classic Walnut Wood*, *Polished Marble*, and *Cyberpunk Neon*.
  - Procedural piece animations, capture effects, and sound design.
- 📲 **Cross-Platform**:
  - **Android Native App**: High-performance Android build with gesture controls and vibration feedback.
  - **Web PWA**: Installable directly from Chrome, Edge, or Safari with offline capability.

---

## 🚀 Quick Start for Developers

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zioseb62/Wall-Go-AI.git
   cd Wall-Go-AI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📱 Building the Android APK

The project uses **Capacitor** to wrap the web application into a native Android project:

1. Build the web assets:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Open in Android Studio:
   ```bash
   npx cap open android
   ```

3. In Android Studio:
   - Select **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The compiled APK is located in `android/app/build/outputs/apk/release/`.

---

## 🛠️ Technology Stack

- **Core Framework**: React 19, TypeScript
- **Bundler & Tooling**: Vite, esbuild, TSX
- **3D Graphics & Math**: Three.js, Canvas 2D / WebGL
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Mobile Engine**: Capacitor (Android Native Wrapper)
- **Database & Sync**: Google Firebase Firestore (Lobbies & Room state)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Created with passion for classic tabletop strategy. Enjoy the games! ♟️</sub>
</div>
