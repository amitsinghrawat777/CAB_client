# 🎮 Protocol 4 - Cows & Bulls Game Client

A modern, real-time multiplayer implementation of the classic Cows and Bulls (also known as Bulls and Cows or Mastermind with numbers) guessing game. Built with React and Socket.IO for seamless real-time gameplay.

[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2.5-646cff?logo=vite)](https://vitejs.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-010101?logo=socket.io)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1.18-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Server Component](#️-server-component)
- [Game Modes](#-game-modes)
- [How to Play](#-how-to-play)
- [Development](#-development)

---

## 🎯 Overview

Protocol 4 is a digital adaptation of the classic code-breaking game where players try to guess their opponent's secret 4-digit code. Each guess receives feedback in the form of "Bulls" (correct digits in correct positions) and "Cows" (correct digits in wrong positions). The game features multiple modes including offline local play, online 1v1 matches, and a battle royale mode for multiple players.

---

## ✨ Key Features

- **🎲 Multiple Game Modes**
  - **Offline Mode**: Local hotseat gameplay for two players
  - **Online 1v1**: Real-time multiplayer matches with room codes
  - **Battle Royale**: Multi-player elimination tournament (supports up to 20 players)
  
- **⚡ Real-time Gameplay**
  - WebSocket-based communication via Socket.IO
  - Instant game state synchronization
  - Live chat system during matches
  
- **🎨 Modern UI/UX**
  - Cyberpunk-inspired design with glitch effects
  - Responsive layout optimized for mobile and desktop
  - Animated backgrounds and smooth transitions
  - Toast notifications for game events
  
- **💾 State Persistence**
  - SessionStorage-based game state recovery
  - Resume games after page refresh
  - Match history tracking
  
- **🏆 Advanced Features**
  - Leaderboard system (Battle Royale mode)
  - eSports mode integration
  - Time-limited "Blitz" mode
  - Supabase integration for data persistence
  
- **♿ Accessibility**
  - Mobile-optimized controls
  - Pull-to-refresh prevention
  - PWA-ready configuration

---

## 🛠 Tech Stack

### Frontend Framework
- **React 19.2.0** - UI library with hooks
- **Vite 7.2.5** - Build tool and dev server (using Rolldown)

### Styling
- **TailwindCSS 4.1.18** - Utility-first CSS framework
- **PostCSS 8.5.6** - CSS processing
- **Autoprefixer 10.4.23** - CSS vendor prefixing

### Real-time Communication
- **Socket.IO Client 4.8.3** - WebSocket library for real-time bidirectional communication

### Backend Services
- **Supabase 2.90.1** - Backend-as-a-Service for data persistence and authentication

### Development Tools
- **ESLint 9.39.1** - Code linting
- **@vitejs/plugin-react 5.1.1** - React support for Vite

---

## 📁 Project Structure

```
CAB_client/
├── public/                 # Static assets
│   └── vite.svg           # Vite logo
│
├── server/                # Backend server
│   ├── index.js           # Server entry point & Socket.IO logic
│   └── package.json       # Server dependencies
│
├── src/                   # Source code
│   ├── components/        # React components
│   │   ├── MainMenu.jsx          # Landing page with mode selection
│   │   ├── Lobby.jsx             # Room creation/joining interface
│   │   ├── OnlineGame.jsx        # 1v1 online gameplay component
│   │   ├── OfflineGame.jsx       # Local hotseat gameplay
│   │   └── BattleRoyale.jsx      # Multi-player battle royale mode
│   │
│   ├── lib/               # Utility libraries
│   │   └── supabaseClient.js     # Supabase configuration
│   │
│   ├── assets/            # Images, fonts, etc.
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Application entry point
│   └── index.css          # Global styles
│
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── eslint.config.js       # ESLint configuration
├── package.json           # Dependencies and scripts
└── README.md              # This file

```

---

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/amitsinghrawat777/CAB_client.git
   cd CAB_client
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SERVER_URL=your_backend_server_url
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in terminal)

6. **(Optional) Set up the backend server**
   
   For online game modes, you need to run the included backend server. See the [Server Component](#️-server-component) section for detailed setup instructions.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SERVER_URL` | Backend Socket.IO server URL | Yes (for online modes) |
| `VITE_SUPABASE_URL` | Supabase project URL | No (optional for persistence) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | No (optional for persistence) |

**Example:**
```env
VITE_SERVER_URL=https://your-backend-server.com
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

---

## 🎮 Game Modes

### 1. **Offline Mode** (Local Hotseat)
- Two players on the same device
- Turn-based gameplay
- Each player sets a secret code
- Players take turns guessing
- No server connection required

### 2. **Online 1v1 Mode**
- Real-time multiplayer via Socket.IO
- Create a room or join with a 4-character code
- Two game variants:
  - **Standard**: No time limit, play at your own pace
  - **Blitz**: Time-limited matches for quick games
- Live chat with opponent
- Attack/Defense logs to track progress

### 3. **Battle Royale Mode**
- Multi-player elimination tournament
- Support for up to 20 players
- Multiple game modes:
  - **Normal**: Standard rules
  - **eSports**: Competitive settings
- Real-time leaderboard
- Persistent match history via Supabase
- View other players' progress

---

## 📖 How to Play

### Game Rules

1. **Setup Phase**
   - Each player creates a secret 4-digit code
   - All digits must be unique (e.g., 1234 is valid, 1123 is not)

2. **Guessing Phase**
   - Players take turns guessing the opponent's code
   - After each guess, receive feedback:
     - **Bulls (Locked)**: Correct digits in correct positions
     - **Cows (Found)**: Correct digits in wrong positions

3. **Winning**
   - First player to guess all 4 digits correctly (4 Bulls) wins
   - In Battle Royale, fastest solvers advance

### Example Round

```
Secret Code: 5274
Your Guess:  5678
Feedback:    1 Bull, 1 Cow

Explanation:
- "5" is in correct position (Bull)
- "7" is in the code but wrong position (Cow)
- "6" and "8" are not in the code
```

---

## 🖥️ Server Component

The project includes a **Node.js backend server** that handles all real-time multiplayer functionality using Socket.IO. This server is essential for online game modes (1v1 and Battle Royale).

### Server Features

- **Real-time Communication**: WebSocket-based bidirectional communication via Socket.IO
- **Room Management**: Create and join game rooms with unique 4-character codes
- **Game State Management**: Server-side validation and synchronization
- **Multiple Game Modes**:
  - **1v1 Duel**: Standard and Blitz modes with chat support
  - **Battle Royale**: Multi-player tournaments with up to 100 players
  - **eSports Mode**: Spectator-friendly competitive mode
- **Timer Management**: Blitz mode with countdown timers
- **Reconnection Handling**: 30-second grace period for disconnected players
- **Rematch System**: Quick rematch functionality for 1v1 games
- **Leaderboard**: Real-time score tracking and sorting

### Server Installation

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install server dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   
   **Development mode (with auto-restart):**
   ```bash
   npm run dev
   ```
   
   **Production mode:**
   ```bash
   npm start
   ```

4. **Server will run on** `http://localhost:3001` (or the port specified in `PORT` environment variable)

### Server Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | `3001` |

**Example:**
```bash
PORT=8080 npm start
```

### Server Dependencies

- **Express 5.2.1** - Web framework for HTTP endpoints
- **Socket.IO 4.8.3** - Real-time WebSocket library
- **CORS 2.8.5** - Cross-Origin Resource Sharing middleware
- **Nodemon 3.1.11** - Development auto-reload tool

### Server Architecture

The server implements a stateful architecture with in-memory storage:

- **Global State Management**:
  - `rooms{}` - 1v1 duel rooms
  - `battleRooms{}` - Battle Royale rooms
  - `socketToRoom{}` - Fast socket-to-room lookup
  - `timers{}` - Blitz mode countdown timers
  - `reconnectTimers{}` - Grace period for disconnections

- **Core Functions**:
  - `generateRoomCode()` - Creates unique 4-character room codes
  - `generateDigitCode()` - Generates random 4-digit secret codes
  - `computeCowsBulls()` - Validates guesses and calculates feedback
  - `sortLeaderboard()` - Sorts Battle Royale players by score

- **Socket Events**:
  - **Duel Mode**: `create_room`, `join_room`, `set_secret`, `send_guess`, `chat_message`, `rematch_request`
  - **Battle Royale**: `battle_create`, `battle_join`, `battle_start`, `battle_guess`, `battle_history_request`
  - **Lifecycle**: `rejoin_room`, `leave_room`, `disconnect`

### Connecting Client to Server

Ensure the client's `.env` file points to your server:

```env
VITE_SERVER_URL=http://localhost:3001
```

For production deployments, update this to your hosted server URL.

### Server Deployment

The server can be deployed to any Node.js hosting platform:

- **Heroku**: Set `PORT` environment variable (automatically provided)
- **Railway**: Auto-detects Node.js apps
- **Render**: Specify `npm start` as the start command
- **DigitalOcean App Platform**: Configure buildpack for Node.js
- **AWS/GCP/Azure**: Deploy as containerized application

**Important**: Ensure WebSocket support is enabled on your hosting platform.

---

## 💻 Development

### Project Architecture

The application uses a component-based architecture with React:

- **App.jsx**: Main router handling screen navigation and socket management
- **Components**: Isolated, reusable UI components for each game mode
- **State Management**: React hooks (useState, useEffect, useRef) for local state
- **Persistence**: SessionStorage for game state recovery
- **Real-time**: Socket.IO events for multiplayer synchronization

### Key Technologies

- **Vite with Rolldown**: Ultra-fast build tool using Rolldown bundler
- **TailwindCSS v4**: Latest version with improved performance
- **Socket.IO**: Reliable WebSocket communication with fallback
- **Supabase**: Optional BaaS for match history and leaderboards

### Code Style

- ESLint configured with React-specific rules
- React Hooks best practices enforced
- Component-based file organization
- Descriptive variable and function naming

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 Related

- **Backend Server**: This repository includes a full-featured Socket.IO backend server in the `server/` directory
- **Game Logic**: All game logic is implemented client-side for offline mode
- **Real-time Sync**: Server validates moves and synchronizes state for online modes
- **Repository**: [github.com/amitsinghrawat777/CAB_client](https://github.com/amitsinghrawat777/CAB_client)

---

<div align="center">
  
**Built with ❤️ using React and Socket.IO**

</div>
