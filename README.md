# 🐍 Snake — Neon Arcade

This is a modern web-based Snake game featuring a premium dark neon visual style and glassmorphism design.

## (1) Game Instructions

1. **Login & Guest Mode**:
   - Upon opening the game, you can enter a username and password to log in, or register a new account.
   - If you want a quick experience, you can also click "Play as Guest" to enter the game directly.
2. **How to Start**:
   - After successfully entering the main interface, click the "Start" button to launch the game.
3. **Controls**:
   - **Desktop**: It is recommended to use the keyboard **arrow keys** (or standard key mappings) to control the snake's up, down, left, and right movements.
   - **Mobile**: Use the on-screen directional pad (D-pad) provided at the bottom of the interface for touch control.
4. **Game Objective**:
   - Control the snake to eat the randomly appearing prey on the screen.
   - Every time food is eaten, not only will the score increase, but the snake's body will also grow longer (the snake's body features a visual gradient effect that gradually becomes transparent from head to tail).
5. **Game Over & Restart**:
   - Be careful to avoid walls and the snake's own body. If you hit a wall or bite yourself, a vibration effect will be triggered at the edges of the screen, and the game will end.
   - During the game, you can always click the "Pause" button to take a break.
   - After death, you can reset the game state (such as score, length, and position) and choose to play again to challenge for the highest score.
6. **Leaderboards & Game Records**:
   - Click the "Records" button to enter the data panel.
   - Here you can view the **Leaderboard** (highest scores of all players), your **My History**, and your **Login Log**.

## (2) Technology Stack

This project is developed using purely client-side technologies, making it lightweight and high-performing:

- **Page Structure**: **HTML5**
  - Built the structural system for the login screen, main game screen, and records screen, using the `<canvas>` element as the main rendering area for the game.
- **Visual Design & Styling**: **CSS3 (Vanilla CSS)**
  - Utilized vanilla CSS to implement a premium and modern UI design. This includes dark mode, neon glow effects, glassmorphic panels, smooth micro-animations, and background orb effects. Incorporates the `Outfit` font from Google Fonts.
- **Core Logic & System Interaction**: **Vanilla JavaScript**
  - Responsible for driving the core game engine: covering the game loop rendering, coordinate calculations for the grid system, collision detection algorithms, and UI state management.
- **Graphics Rendering Engine**: **HTML5 Canvas API**
  - Uses the 2D drawing context to efficiently render the snake's movement path and transparency gradients, as well as directly render various in-game elements like food.
- **Data Persistence**: **Web LocalStorage**
  - Uses the browser's local storage capability to implement user registration, login verification, high score persistence, and game history tracking without any backend or database.
