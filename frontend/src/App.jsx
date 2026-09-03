import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Square, RotateCcw, CheckCircle, XCircle, Menu, SkipForward, Volume2, Award, Zap, Eye, Github, Globe } from 'lucide-react';

import Sidebar from './components/Sidebar';
import AudioSnippetPlayer from './components/AudioSnippetPlayer';
import GuessAutocomplete from './components/GuessAutocomplete';
import LeaderboardView from './components/LeaderboardView';
import ProfileView from './components/ProfileView';
import FriendsView from './components/FriendsView';
import CompareModal from './components/CompareModal';
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
  const [dailyStreak, setDailyStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [pointsToast, setPointsToast] = useState(null);

  const [activeView, setActiveView] = useState('game');
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compareTargetUser, setCompareTargetUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('zefen_token');
    if (token) {
      getUserProfileApi()
        .then((userData) => {
          setUser(userData);
          if (userData.stats) {
            setCurrentStreak(userData.stats.currentStreak || 0);
            setDailyStreak(userData.stats.dailyStreak || 0);
            setTotalPoints(userData.stats.totalPoints || 0);
            setLevel(userData.stats.level || 1);
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
      setPointsToast(null);

      const songData = await getRandomSong(diff, currentPlayed);
      setCurrentSong(songData);

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

  const handleSkipToNext = () => {
    audioPlayer.stop();
    setIsPlaying(false);

    if (currentLevelIndex < SNIPPET_LEVEL_KEYS.length - 1) {
      const nextIdx = currentLevelIndex + 1;
      setCurrentLevelIndex(nextIdx);
      setTimeout(() => {
        handlePlaySnippet(nextIdx);
      }, 50);
    }
  };

  const handleSelectLevel = (idx) => {
    audioPlayer.stop();
    setIsPlaying(false);
    setCurrentLevelIndex(idx);
    setTimeout(() => {
      handlePlaySnippet(idx);
    }, 50);
  };

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
        const earned = result.pointsEarned || (currentLevelIndex === 0 ? 1000 : 500);
        setPointsToast(earned);
        triggerConfetti();

        if (user && result.userStats) {
          setCurrentStreak(result.userStats.currentStreak || 0);
          setDailyStreak(result.userStats.dailyStreak || 0);
          setTotalPoints(result.userStats.totalPoints || 0);
          setLevel(result.userStats.level || 1);
        } else {
          setCurrentStreak((prev) => prev + 1);
          setTotalPoints((prev) => prev + earned);
        }

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
    setDailyStreak(0);
    setTotalPoints(0);
    setLevel(1);
    setActiveView('game');
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const handleOpenCompare = (targetUser) => {
    if (!user) {
      setShowAuth(true);
    } else {
      setCompareTargetUser(targetUser);
    }
  };

  const renderGameView = () => (
    <>
      {/* Points Toast Notification */}
      {pointsToast && (
        <div className="points-toast-banner">
          <Zap size={20} />
          <span>+ {pointsToast.toLocaleString()} Points Earned!</span>
          {currentStreak > 1 && <span className="toast-streak-badge">🔥 {currentStreak}x Streak Multiplier</span>}
        </div>
      )}

      {/* Top bar: difficulty tag + selector */}
      <div className="game-topbar">
        <div className={`difficulty-indicator ${currentSong?.difficulty || 'easy'}`}>
          <span className="indicator-dot" />
          <span>{(currentSong?.difficulty || 'easy').toUpperCase()}</span>
        </div>

        <div className="difficulty-pill-group">
          {[null, 'easy', 'medium', 'hard'].map((d) => (
            <button
              key={d || 'all'}
              className={`diff-pill-btn ${difficulty === d ? 'active' : ''}`}
              onClick={() => {
                setDifficulty(d);
                loadNewSong(d);
              }}
            >
              {(d || 'ALL').toUpperCase()}
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
        <div style={{ marginTop: 20 }}>
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
              className="btn-primary btn-action-guess"
              onClick={handleGuessSubmit}
              disabled={!guessInput.trim()}
            >
              <CheckCircle size={16} />
              <span>Submit Guess</span>
            </button>

            {currentLevelIndex < SNIPPET_LEVEL_KEYS.length - 1 && (
              <button
                className="btn-secondary btn-action-skip"
                onClick={handleSkipToNext}
                title={`Skip to ${SNIPPET_LEVEL_KEYS[currentLevelIndex + 1]}s snippet`}
              >
                <SkipForward size={16} />
                <span>Skip to {SNIPPET_LEVEL_KEYS[currentLevelIndex + 1]}s</span>
              </button>
            )}

            <button className="btn-danger btn-action-reveal" onClick={handleReveal}>
              <Eye size={16} />
              <span>Reveal Answer</span>
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
                  ? `Recognized at ${SNIPPET_LEVEL_KEYS[currentLevelIndex]}s!`
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
                    <Volume2 size={14} /> Playing full song audio...
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
        dailyStreak={dailyStreak}
        totalPoints={totalPoints}
        level={level}
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

        {activeView === 'leaderboard' && (
          <LeaderboardView
            currentUser={user}
            onCompare={handleOpenCompare}
          />
        )}

        {activeView === 'friends' && (
          <FriendsView
            user={user}
            onCompare={handleOpenCompare}
            onOpenAuth={() => setShowAuth(true)}
          />
        )}

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

        {/* Global Footer */}
        <footer className="app-footer">
          <span className="footer-credits">Made by <strong>nao1a</strong></span>
          <span className="footer-dot">•</span>
          <a
            href="https://github.com/Nao1a"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <Github size={13} />
            <span>GitHub</span>
          </a>
          <span className="footer-dot">•</span>
          <a
            href="https://portfolio-eta-drab-12.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <Globe size={13} />
            <span>Portfolio</span>
          </a>
        </footer>
      </main>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(userData) => {
            setUser(userData);
            if (userData.stats) {
              setCurrentStreak(userData.stats.currentStreak || 0);
              setDailyStreak(userData.stats.dailyStreak || 0);
              setTotalPoints(userData.stats.totalPoints || 0);
              setLevel(userData.stats.level || 1);
            }
          }}
        />
      )}

      {/* Head-to-Head Compare Modal */}
      {compareTargetUser && (
        <CompareModal
          targetUser={compareTargetUser}
          onClose={() => setCompareTargetUser(null)}
          user={user}
        />
      )}
    </div>
  );
}
