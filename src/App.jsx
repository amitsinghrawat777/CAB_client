import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import MainMenu from "./components/MainMenu";
import Lobby from "./components/Lobby";
import OnlineGame from "./components/OnlineGame";
import OfflineGame from "./components/OfflineGame";
import "./App.css";

// Server URL: Use environment variable or fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// LocalStorage keys
const STORAGE_KEYS = {
  SCREEN: "protocol4_screen",
  GAME_DATA: "protocol4_gameData",
};

function App() {
  // Initialize state from localStorage
  const getInitialScreen = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCREEN);
    // Only restore online/lobby screens - menu and offline don't need persistence
    if (saved === "online" || saved === "lobby") {
      return saved;
    }
    return "menu";
  };

  const getInitialGameData = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_DATA);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Navigation state: menu | lobby | online | offline
  const [screen, setScreen] = useState(getInitialScreen);
  
  // Socket connection
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  
  // Game data for online mode
  const [gameData, setGameData] = useState(getInitialGameData);

  // Persist screen state
  useEffect(() => {
    if (screen === "online" || screen === "lobby") {
      localStorage.setItem(STORAGE_KEYS.SCREEN, screen);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SCREEN);
    }
  }, [screen]);

  // Persist game data
  useEffect(() => {
    if (gameData) {
      localStorage.setItem(STORAGE_KEYS.GAME_DATA, JSON.stringify(gameData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.GAME_DATA);
    }
  }, [gameData]);

  // Initialize socket connection when needed
  useEffect(() => {
    if (screen === "lobby" || screen === "online") {
      if (!socketRef.current) {
        socketRef.current = io.connect(SERVER_URL, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current.on("connect", () => {
          console.log("Connected to server:", socketRef.current.id);
          setConnected(true);
        });

        socketRef.current.on("disconnect", () => {
          console.log("Disconnected from server");
          setConnected(false);
        });

        socketRef.current.on("connect_error", (error) => {
          console.error("Connection error:", error);
          setConnected(false);
        });
      }
    }

    return () => {
      // Clean up socket when leaving online modes
      if (screen === "menu" && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
    };
  }, [screen]);

  // Handle navigation
  const handleNavigate = (destination) => {
    setScreen(destination);
  };

  // Handle game start from lobby
  const handleGameStart = (data) => {
    setGameData(data);
    setScreen("online");
  };

  // Handle back to menu - clears all stored data
  const handleBack = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setGameData(null);
    setScreen("menu");
    // Clear all game-related localStorage
    localStorage.removeItem(STORAGE_KEYS.SCREEN);
    localStorage.removeItem(STORAGE_KEYS.GAME_DATA);
    localStorage.removeItem("protocol4_gameState");
  };

  // Render current screen
  switch (screen) {
    case "menu":
      return <MainMenu onNavigate={handleNavigate} />;
    
    case "lobby":
      return (
        <Lobby 
          socket={socketRef.current}
          connected={connected}
          onGameStart={handleGameStart}
          onBack={handleBack}
        />
      );
    
    case "online":
      return (
        <OnlineGame 
          socket={socketRef.current}
          gameData={gameData}
          onBack={handleBack}
        />
      );
    
    case "offline":
      return <OfflineGame onBack={handleBack} />;
    
    default:
      return <MainMenu onNavigate={handleNavigate} />;
  }
}

export default App;