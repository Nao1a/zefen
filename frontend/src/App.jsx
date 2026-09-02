import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Square, RotateCcw, CheckCircle, XCircle, Menu, SkipForward, Volume2 } from 'lucide-react';

import Sidebar from './components/Sidebar';
import AudioSnippetPlayer from './components/AudioSnippetPlayer';
import GuessAutocomplete from './components/GuessAutocomplete';
import LeaderboardView from './components/LeaderboardView';
import ProfileView from './components/ProfileView';
import AuthModal from './components/AuthModal';

import {
  getRandomSong,
  getSongSnippets,
  submitGuessApi,
  revealAnswerApi,
  getUserProfileApi,
  logoutUser
} from './services/api';
import { audioPlayer } from './utils/audioPlayer';

const SNIPPET_LEVEL_KEYS = ['1.0', '2.0', '4.0', '8.0', '10.0'];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [snippets, setSnippets] = useState({});
  const [difficulty, setDifficulty] = useState(null);

  const [playedSongIds, setPlayedSongIds] = useState(() => {
    try {
      const saved = localStorage.getItem('zefen_played_song_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullPlaying, setIsFullPlaying] = useState(false);

  const [guessInput, setGuessInput] = useState('');
  const [selectedSongObj, setSelectedSongObj] = useState(null);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'correct', 'revealed', 'incorrect'
  const [gameResult, setGameResult] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  const [activeView, setActiveView] = useState('game');
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zefen_token');
    if (token) {
      getUserProfileApi()
        .then((userData) => {
          setUser(userData);
          if (userData.stats) {
            setCurrentStreak(userData.stats.currentStreak || 0);
          }
        })
        .catch(() => {
          localStorage.removeItem('zefen_token');
        });
    }
    loadNewSong(difficulty, playedSongIds);
  }, []);

  const loadNewSong = async (diff = difficulty, currentPlayed = playedSongIds) => {
    try {
      setLoading(true);
      audioPlayer.stop();
      setIsPlaying(false);
      setIsFullPlaying(false);
      setGameState('playing');
      setGameResult(null);
      setGuessInput('');
      setSelectedSongObj(null);
      setCurrentLevelIndex(0);

      const songData = await getRandomSong(diff, currentPlayed);
      setCurrentSong(songData);

      // Track played song IDs to prevent repetition
      const updatedPlayed = Array.from(new Set([...currentPlayed, songData.id]));
      setPlayedSongIds(updatedPlayed);
      try {
        localStorage.setItem('zefen_played_song_ids', JSON.stringify(updatedPlayed));
      } catch (e) {}

      let songSnippets = songData.snippets;
      if (!songSnippets) {
        const snippetData = await getSongSnippets(songData.id);
        songSnippets = snippetData.snippets || {};
      }
      setSnippets(songSnippets);
      // Preload all snippets (1s, 2s, 4s, 8s, 10s, full) in background for instant 0ms playback
      audioPlayer.preloadSnippets(songSnippets);
    } catch (err) {
      console.error('Error loading song:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySnippet = (overrideIndex = null) => {
    if (!snippets) return;
    const targetIdx = overrideIndex !== null ? overrideIndex : currentLevelIndex;
    const currentLevelKey = SNIPPET_LEVEL_KEYS[targetIdx];
    const snippetUrl = snippets[currentLevelKey] || snippets.full;

    setIsPlaying(true);
    setIsFullPlaying(false);
    audioPlayer.playSnippet(snippetUrl, currentLevelKey, () => {
      setIsPlaying(false);
    });
  };

  const handleStopSnippet = () => {
    audioPlayer.stop();
    setIsPlaying(false);
    setIsFullPlaying(false);
  };

  // Skip to next duration
  const handleSkipToNext = () => {
    audioPlayer.stop();
    setIsPlaying(false);

    if (currentLevelIndex < SNIPPET_LEVEL_KEYS.length - 1) {
      const nextIdx = currentLevelIndex + 1;
      setCurrentLevelIndex(nextIdx);
      // Automatically play the new longer snippet
      setTimeout(() => {
        handlePlaySnippet(nextIdx);
      }, 50);
    }
  };

  // Jump to specific level when clicking snippet step
  const handleSelectLevel = (idx) => {
    audioPlayer.stop();
    setIsPlaying(false);
    setCurrentLevelIndex(idx);
    setTimeout(() => {
      handlePlaySnippet(idx);
    }, 50);
  };

  // Play full song on victory or reveal
  const handlePlayFullSong = () => {
    const fullUrl = gameResult?.song?.fullAudioUrl || snippets?.full || currentSong?.snippets?.full;
    if (!fullUrl) return;

    if (isFullPlaying) {
      audioPlayer.stop();
      setIsFullPlaying(false);
    } else {
      audioPlayer.stop();
      setIsPlaying(false);
      setIsFullPlaying(true);
      audioPlayer.playSnippet(fullUrl, 'full', () => {
        setIsFullPlaying(false);
      });
    }
  };

  const handleGuessSubmit = async () => {
    if (!guessInput.trim() || !currentSong) return;

    audioPlayer.stop();
    setIsPlaying(false);
    setIsFullPlaying(false);

    const levelKey = SNIPPET_LEVEL_KEYS[currentLevelIndex];
    const guessSongId = selectedSongObj?.id || null;

    try {
      const result = await submitGuessApi(currentSong.id, guessInput, levelKey, 5, guessSongId);
      setGameResult(result);

      if (result.correct) {
        setGameState('correct');
        const nextStreak = user ? (result.userStats?.currentStreak || 0) : currentStreak + 1;
        setCurrentStreak(nextStreak);
        triggerConfetti();

        // Auto-play full song on correct guess
        const fullUrl = result.song?.fullAudioUrl || snippets.full;
        if (fullUrl) {
          setIsFullPlaying(true);
          audioPlayer.playSnippet(fullUrl, 'full', () => {
            setIsFullPlaying(false);
          });
        }
      } else {
        setGameState('incorrect');
        if (!user) {
          setCurrentStreak(0);
        } else if (result.userStats) {
          setCurrentStreak(result.userStats.currentStreak || 0);
        }
        if (currentLevelIndex < SNIPPET_LEVEL_KEYS.length - 1) {
          setCurrentLevelIndex((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
    }
  };

  const handleReveal = async () => {
    if (!currentSong) return;
    audioPlayer.stop();
    setIsPlaying(false);
    setIsFullPlaying(false);

    const levelKey = SNIPPET_LEVEL_KEYS[currentLevelIndex];

    try {
      const result = await revealAnswerApi(currentSong.id, levelKey);
      setGameResult(result);
      setGameState('revealed');
      setCurrentStreak(0);

      // Auto-play full song from Cloudinary on reveal
      const fullUrl = result.song?.fullAudioUrl || snippets.full;
      if (fullUrl) {
        setIsFullPlaying(true);
        audioPlayer.playSnippet(fullUrl, 'full', () => {
          setIsFullPlaying(false);
        });
      }
    } catch (err) {
      console.error('Error revealing answer:', err);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentStreak(0);
    setActiveView('game');
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const renderGameView = () => (
    <>
      {/* Top bar: difficulty tag + selector */}
      <div className="game-topbar">
        <div className={`difficulty-tag ${currentSong?.difficulty || 'easy'}`}>
          {currentSong?.difficulty || 'easy'}
        </div>

        <div className="difficulty-selector">
          {[null, 'easy', 'medium', 'hard'].map((d) => (
            <button
              key={d || 'all'}
              className={`diff-btn ${difficulty === d ? 'active' : ''}`}
              onClick={() => {
                setDifficulty(d);
                loadNewSong(d);
              }}
            >
              {d || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Audio player */}
      <AudioSnippetPlayer
        currentLevelIndex={currentLevelIndex}
        isPlaying={isPlaying}
        onPlay={() => handlePlaySnippet()}
        onStop={handleStopSnippet}
        onSelectLevel={handleSelectLevel}
      />

      {/* Gameplay Area */}
      {gameState === 'playing' || gameState === 'incorrect' ? (
        <div style={{ marginTop: 24 }}>
          {gameState === 'incorrect' && (
            <div className="error-banner">
              <XCircle size={16} />
              <span>Incorrect guess! Unlocked <strong>{SNIPPET_LEVEL_KEYS[currentLevelIndex]}s</strong> snippet. Try again.</span>
            </div>
          )}

          <GuessAutocomplete
            value={guessInput}
            onChange={(val) => {
              setGuessInput(val);
              if (selectedSongObj && !val.includes(selectedSongObj.title)) {
                setSelectedSongObj(null);
              }
            }}
            onSelect={(formattedText, songObj) => {
              setGuessInput(formattedText);
              setSelectedSongObj(songObj);
            }}
            onSubmit={handleGuessSubmit}
          />

          <div className="action-row">
            <button
              className="btn-primary"
              onClick={handleGuessSubmit}
              disabled={!guessInput.trim()}
            >
              Submit Guess
            </button>

            {currentLevelIndex < SNIPPET_LEVEL_KEYS.length - 1 && (
              <button
                className="btn-secondary"
                onClick={handleSkipToNext}
                title={`Skip to ${SNIPPET_LEVEL_KEYS[currentLevelIndex + 1]}s snippet`}
              >
                <SkipForward size={14} style={{ marginRight: 4 }} />
                Skip to {SNIPPET_LEVEL_KEYS[currentLevelIndex + 1]}s
              </button>
            )}

            <button className="btn-danger" onClick={handleReveal}>
              Reveal Answer
            </button>
          </div>
        </div>
      ) : (
        /* Result State (Correct or Revealed) */
        <div className={`result-card ${gameState === 'correct' ? 'success' : 'fail'}`} style={{ marginTop: 24 }}>
          <div className="result-header">
            {gameState === 'correct' ? (
              <CheckCircle size={24} color="var(--success)" />
            ) : (
              <XCircle size={24} color="var(--error)" />
            )}
            <div>
              <h2>{gameState === 'correct' ? 'Correct! 🎵' : 'Song Revealed'}</h2>
              <p>
                {gameState === 'correct'
                  ? `You recognized it at ${SNIPPET_LEVEL_KEYS[currentLevelIndex]}s!`
                  : 'Better luck next time!'}
              </p>
            </div>
          </div>

          {/* Song Information & Album Art */}
          <div className="result-song-info">
            {(gameResult?.song?.albumArt || currentSong?.albumArt) && (
              <img
                src={gameResult?.song?.albumArt || currentSong?.albumArt}
                alt="Album Cover"
                className="album-art-preview"
              />
            )}
            <div className="song-meta" style={{ flex: 1 }}>
              <h3>{gameResult?.song?.title || currentSong?.title}</h3>
              <p style={{ fontWeight: 600 }}>
                {gameResult?.song?.artist || currentSong?.artist}
                {(gameResult?.song?.year || currentSong?.year) &&
                  ` (${gameResult?.song?.year || currentSong?.year})`}
              </p>
              <div className="album-text">
                Album: {gameResult?.song?.album || currentSong?.album || 'Single'}
              </div>

              {/* Full Audio Playback Controls */}
              <div className="full-song-player" style={{ marginTop: 12 }}>
                <button
                  className="btn-secondary btn-small"
                  onClick={handlePlayFullSong}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {isFullPlaying ? <Square size={14} /> : <Play size={14} />}
                  <span>{isFullPlaying ? 'Pause Full Song' : 'Play Full Song'}</span>
                </button>
                {isFullPlaying && (
                  <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Volume2 size={14} /> Playing from Cloudinary...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="btn-primary"
              onClick={() => loadNewSong()}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RotateCcw size={16} />
              Next Song
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="app-layout">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <h1>Zefen</h1>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={18} />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        user={user}
        currentStreak={currentStreak}
        onOpenAuth={() => setShowAuth(true)}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="main-content">
        {activeView === 'game' && (
          loading ? (
            <div className="loading-text">Loading Ethiopian song...</div>
          ) : (
            renderGameView()
          )
        )}

        {activeView === 'leaderboard' && <LeaderboardView />}

        {activeView === 'profile' && user && <ProfileView />}

        {activeView === 'profile' && !user && (
          <div>
            <h1 className="page-title">Profile</h1>
            <div className="empty-state">
              Sign in to view your profile, statistics, and history.
            </div>
            <button className="btn-primary" onClick={() => setShowAuth(true)} style={{ marginTop: 16 }}>
              Sign In
            </button>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(userData) => {
            setUser(userData);
            if (userData.stats) {
              setCurrentStreak(userData.stats.currentStreak || 0);
            }
          }}
        />
      )}
    </div>
  );
}
