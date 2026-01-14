import React, { useState, useEffect } from "react";
import "./MainMenu.css";

function MainMenu({ onNavigate }) {
  const [glitchText, setGlitchText] = useState("PROTOCOL 4");
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    // Glitch effect on title
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?0123456789";
    let iterations = 0;
    const maxIterations = 10;
    
    const interval = setInterval(() => {
      if (iterations < maxIterations) {
        setGlitchText(
          "PROTOCOL 4".split("").map((char, i) => {
            if (i < iterations) return "PROTOCOL 4"[i];
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }).join("")
        );
        iterations++;
      } else {
        clearInterval(interval);
        setGlitchText("PROTOCOL 4");
        setShowSubtitle(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="main-menu">
      {/* Animated background grid */}
      <div className="grid-bg"></div>
      
      {/* Scanlines effect */}
      <div className="scanlines"></div>

      {/* Main content */}
      <div className="menu-content">
        {/* Logo/Title */}
        <div className="logo-section">
          <div className="logo-icon">
            <span className="bracket">[</span>
            <span className="icon-text">P4</span>
            <span className="bracket">]</span>
          </div>
          <h1 className="title glitch" data-text={glitchText}>
            {glitchText}
          </h1>
          <p className={`subtitle ${showSubtitle ? "visible" : ""}`}>
            &gt; DECODE THE SEQUENCE_
          </p>
        </div>

        {/* Menu buttons */}
        <div className="menu-buttons">
          <button 
            className="menu-btn online-btn"
            onClick={() => onNavigate("lobby")}
          >
            <span className="btn-icon">⚡</span>
            <span className="btn-text">
              <span className="btn-title">ONLINE PvP</span>
              <span className="btn-desc">Challenge opponents worldwide</span>
            </span>
            <span className="btn-arrow">→</span>
          </button>

          <button 
            className="menu-btn offline-btn"
            onClick={() => onNavigate("offline")}
          >
            <span className="btn-icon">🔐</span>
            <span className="btn-text">
              <span className="btn-title">OFFLINE PROTOCOL</span>
              <span className="btn-desc">Pass & Play local match</span>
            </span>
            <span className="btn-arrow">→</span>
          </button>

          <button 
            className="menu-btn battle-btn"
            onClick={() => onNavigate("battle")}
          >
            <span className="btn-icon">👾</span>
            <span className="btn-text">
              <span className="btn-title">BATTLE ROYALE</span>
              <span className="btn-desc">Up to 100 players, one code</span>
            </span>
            <span className="btn-arrow">→</span>
          </button>
        </div>

        {/* Game rules */}
        <div className="rules-section">
          <div className="rules-header">
            <span className="terminal-prompt">&gt;</span>
            <span>MISSION BRIEFING</span>
          </div>
          <div className="rules-content">
            <p><span className="highlight">OBJECTIVE:</span> Crack the 4-digit code before your opponent</p>
            <p><span className="highlight">+N</span> = N digits exist in the code (FOUND)</p>
            <p><span className="highlight">-N</span> = N digits in correct position (LOCKED)</p>
            <p><span className="highlight">-4</span> = CODE CRACKED - VICTORY</p>
          </div>
        </div>

        {/* Footer */}
        <div className="menu-footer">
          <span className="version">v4.0.0</span>
          <span className="separator">|</span>
          <span className="status">
            <span className="status-dot"></span>
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
