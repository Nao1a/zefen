import React from 'react';
import { Play, Square, SkipForward } from 'lucide-react';

const SNIPPET_LEVELS = [
  { level: '1.0', label: '1s' },
  { level: '2.0', label: '2s' },
  { level: '4.0', label: '4s' },
  { level: '8.0', label: '8s' },
  { level: '10.0', label: '10s' }
];

export default function AudioSnippetPlayer({
  currentLevelIndex,
  isPlaying,
  onPlay,
  onStop,
  onSelectLevel,
  onSkipNext
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Player controls */}
      <div className="player-section">
        <div className="player-controls">
          <button
            className="play-btn"
            onClick={isPlaying ? onStop : onPlay}
            aria-label={isPlaying ? 'Stop' : 'Play'}
            title={isPlaying ? 'Stop snippet' : 'Play snippet'}
          >
            {isPlaying ? <Square size={22} /> : <Play size={24} style={{ marginLeft: 2 }} />}
          </button>

          <div style={{ flex: 1 }}>
            <div className="player-label">
              Snippet: <strong>{SNIPPET_LEVELS[currentLevelIndex]?.label}</strong>
              {currentLevelIndex < SNIPPET_LEVELS.length - 1 && (
                <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: 12 }}>
                  (Click any level or Skip to hear more)
                </span>
              )}
            </div>

            {/* Simple waveform bars */}
            <div className="waveform">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className={`wave-bar ${isPlaying ? 'playing' : ''}`}
                  style={{
                    animationDelay: `${(i % 7) * 0.08}s`,
                    height: isPlaying ? undefined : `${15 + (i % 5) * 12}%`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Snippet progression steps - allow clicking any step to jump to and unlock that level */}
        <div className="snippet-steps">
          {SNIPPET_LEVELS.map((item, idx) => {
            const isUnlocked = idx <= currentLevelIndex;
            const isActive = idx === currentLevelIndex;

            return (
              <div
                key={item.level}
                className={`snippet-step ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : ''}`}
                onClick={() => onSelectLevel(idx)}
                title={`Click to listen to ${item.label} snippet`}
                style={{ cursor: 'pointer' }}
              >
                <div>{item.label}</div>
                <div className="step-status">
                  {isActive ? 'current' : isUnlocked ? 'unlocked' : `unlock`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
