import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import MainMenu from "./components/MainMenu";
import Lobby from "./components/Lobby";
import OnlineGame from "./components/OnlineGame";
import OfflineGame from "./components/OfflineGame";
import "./App.css";

// Server URL: Use environment variable or fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function App() {
  // Navigation state: menu | lobby | online | offline
  const [screen, setScreen] = useState("menu");
  
  // Socket connection
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  
  // Game data for online mode
  const [gameData, setGameData] = useState(null);

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

  // Handle back to menu
  const handleBack = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setGameData(null);
    setScreen("menu");
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