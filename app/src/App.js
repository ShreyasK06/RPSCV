import './App.css';
import axios from 'axios';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Check if we're running on GitHub Pages
const isGitHubPages = window.location.hostname.includes('github.io');


function App() {
  const [theme, setTheme] = useState('light');
  const [score, setScore] = useState(0);
  const [ai, setAI] = useState(0);
  const [move, setMove] = useState('None');
  const [AIMove, setAIMove] = useState('None');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(3);
  const defualtMess = 'Press Play Game to start the game';
  const [message, setMessage] = useState(defualtMess);
  const [help, setHelp] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  const moves = useMemo(() => ['rock', 'paper', 'scissors'], []);
  const symbols = {
    rock: '✊',
    paper: '✋',
    scissors: '✌️',
    None: '🤖'
  }

  const playGame = useCallback(() => {
    // Stop the shake animation to show the final move
    const aiElement = document.querySelector('.AI');
    if (aiElement) {
      // Remove the animated class to stop the shake and trigger the move animation
      aiElement.classList.remove('ai-animated');
    }

    let aiMove = moves[Math.floor(Math.random() * 3)];
    let playerMove = move.toLowerCase();
    console.log(aiMove, playerMove);
    setAIMove(aiMove);
    if (playerMove === 'none') {
      setMessage('Please make a move');
      setIsPlaying(false);
      return;
    } else if (playerMove === aiMove) {
      setMessage('It\'s a tie');
    } else if ((playerMove === 'rock' && aiMove === 'scissors') || (playerMove === 'scissors' && aiMove === 'paper') || (playerMove === 'paper' && aiMove === 'rock')) {
      setMessage('Player Wins', move, 'beats', aiMove.toUpperCase());
      setScore(score => score + 1);
    } else {
      setMessage('AI Wins', aiMove.toUpperCase(), 'beats', move);
      setAI(ai => ai + 1);
    }
    setIsPlaying(false);
  }, [move, moves, setAIMove, setMessage, setIsPlaying, setScore, setAI]);

  const restartGame = () => {
    setScore(0);
    setAI(0);
    setMove('None');
    setAIMove('None');
    setMessage(defualtMess);
  }

  useEffect(() => {
    // If we're on GitHub Pages, don't try to connect to the Python backend
    if (isGitHubPages) {
      // Set up keyboard controls for GitHub Pages version
      const handleKeyPress = (e) => {
        if (!isPlaying) {
          if (e.key === 'r' || e.key === 'R') setMove('Rock');
          if (e.key === 'p' || e.key === 'P') setMove('Paper');
          if (e.key === 's' || e.key === 'S') setMove('Scissors');
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    } else {
      // Normal behavior when running locally with Python backend
      const interval = setInterval(async () => {
        try {
          const response = await axios.get('http://localhost:5000/get_move');
          setMove(response.data.move);
        } catch (error) {
          console.error('Error fetching move:', error);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      setAIMove('None');

      const interval = setInterval(() => {
        if (timer === 0) {
          playGame();
          setTimer(3);
        } else {
          setTimer(timer => timer - 1);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, timer, playGame]);


  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    console.log('help:', help);
  }, [help]);

  return (
    <div className="App">
      <h1
        className='title'
        onClick={() => window.location.href = "https://shreyask06.github.io/MyWebsite/"}
      >
        Rock Paper Scissors
      </h1>

      <button className="help" onClick={() => { setHelp(true) }}>?</button>

      <label className="switch">
        <input type="checkbox" onChange={toggleTheme} />
        <span className="slider"></span>
      </label>

      <div className="message-container">
        {isPlaying ?
          <div className='timer' id={`timer${theme}`}>{timer}</div> :
          <div className='message' id={`message${theme}`}>{message}</div>
        }
      </div>

      <div className="game-container">
        <div className="player-side">
          <div className="move-display">
            <h2 className='move' id={`player${theme}`}>{move}</h2>
          </div>
          {isGitHubPages ? (
            <div className="video-placeholder" id={`video${theme}`}>
              <div className="placeholder-content">
                <p>Camera feed not available on GitHub Pages</p>
                <p>Use keyboard controls:</p>
                <p><strong>R</strong> - Rock | <strong>P</strong> - Paper | <strong>S</strong> - Scissors</p>
                <p>Current move: <strong>{move}</strong></p>
              </div>
            </div>
          ) : (
            <>
              <img
                src="http://localhost:5000/video_feed"
                alt="Live Video Stream"
                className="video"
                id={`video${theme}`}
                onError={(e) => {
                  console.error('Error loading video feed:', e);
                  e.target.style.display = 'none';
                  document.getElementById('video-error').style.display = 'flex';
                }}
                onLoad={() => console.log('Video feed loaded successfully')}
              />
              <div
                id="video-error"
                className="video-placeholder"
                style={{ display: 'none' }}
              >
                <div className="placeholder-content">
                  <p>Error loading camera feed</p>
                  <p>Please check if the Python server is running</p>
                  <p>at http://localhost:5000</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="score-section">
          <div className="score-container">
            <div className="score-column">
              <div className="score-label">Player</div>
              <div className='score' id={`score${theme}`}>{score}</div>
            </div>
            <div className="score-column">
              <div className="score-label">AI</div>
              <div className='score' id={`ai${theme}`}>{ai}</div>
            </div>
          </div>

          <div className="button-container">
            <button className='restart' id={`play${theme}`} onClick={() => { setIsPlaying(true) }}>Play Game</button>
            <button className='restart' id={`restart${theme}`} onClick={restartGame}>Restart</button>
          </div>
        </div>

        <div className="ai-side">
          <div className="move-display">
            <h2 className='move' id={`AIMove${theme}`}>{AIMove.toUpperCase()}</h2>
          </div>
          <div className={`AI ${isPlaying ? 'ai-animated' : ''}`} id={`AI${theme}`}>{symbols[AIMove]}</div>
        </div>
      </div>

      {help && (
        <div className="help-overlay" onClick={() => setHelp(false)}>
          <div className="help-content" onClick={(e) => e.stopPropagation()}>
            <h2>How to Play</h2>
            {isGitHubPages ? (
              <>
                <p>1. Press <strong>R</strong> for Rock, <strong>P</strong> for Paper, or <strong>S</strong> for Scissors</p>
                <p>2. Click "Play Game" to start</p>
                <p>3. The timer will count down from 3</p>
                <p>4. Your move will be compared with the AI's move</p>
                <p>5. The winner gets a point!</p>
                <p className="github-note">Note: This is a limited version running on GitHub Pages. For the full experience with camera detection, run the app locally with the Python backend.</p>
              </>
            ) : (
              <>
                <p>1. Show your hand gesture to the camera (rock, paper, or scissors)</p>
                <p>2. Click "Play Game" to start</p>
                <p>3. The timer will count down from 3</p>
                <p>4. Your move will be compared with the AI's move</p>
                <p>5. The winner gets a point!</p>
              </>
            )}
            <button className="close-help" onClick={() => setHelp(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

