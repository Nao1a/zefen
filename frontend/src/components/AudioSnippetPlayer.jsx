import React from 'react';
import { Play, Square, Info } from 'lucide-react';

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
  onSelectLevel
}) {
  return (
    <div className="audio-player-card">
      {/* Top player controls & waveform */}
      <div className="player-top-row">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onStop : onPlay}
          aria-label={isPlaying ? 'Stop' : 'Play'}
          title={isPlaying ? 'Stop snippet' : 'Play snippet'}
        >
          {isPlaying ? <Square size={20} /> : <Play size={22} style={{ marginLeft: 2 }} />}
        </button>

        <div className="player-meta-block">
          <div className="player-label-row">
            <span className="player-duration-label">
              Snippet Duration: <strong className="duration-val">{SNIPPET_LEVELS[currentLevelIndex]?.label}</strong>
            </span>
            <span className="player-helper-text">
              Click any level or Skip to hear more
            </span>
          </div>

          {/* Solid color waveform visualizer */}
          <div className="waveform-bar-group">
            {[4, 12, 24, 18, 10, 16, 22, 14, 8, 16, 20, 10, 6].map((h, i) => (
              <div
                key={i}
                className={`wave-col ${isPlaying ? 'animated' : ''} ${i === 2 || i === 3 ? 'wave-highlight' : ''}`}
                style={{
                  height: isPlaying ? undefined : `${h}px`,
                  animationDelay: `${(i % 5) * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Segmented snippet duration bar */}
      <div className="snippet-segmented-bar">
        {SNIPPET_LEVELS.map((item, idx) => {
          const isActive = idx === currentLevelIndex;
          const isNextUnlock = idx === currentLevelIndex + 1;

          return (
            <div
              key={item.level}
              className={`segmented-step ${isActive ? 'current' : ''} ${isNextUnlock ? 'next-unlock' : ''}`}
              onClick={() => onSelectLevel(idx)}
              title={`Click to listen to ${item.label} snippet`}
            >
              <span className="step-label">{item.label}</span>
              <span className="step-status">
                {isActive ? 'CURRENT' : 'UNLOCK'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Amharic Silence Warning Note */}
      <div className="audio-silence-notice">
        <Info size={15} className="notice-icon" />
        <p className="notice-text">
          <strong className="notice-highlight">ማሳሰቢያ፦</strong> የአንዳንድ ዘፈኖች የመጀመሪያ ጥቂት ሰከንዶች ዝምታ/ፀጥታ ሊሆኑ ይችላሉ፤ ድምፅ ካልሰሙ ደረጃውን ከፍ ያድርጉ (Skip ይጫኑ)።
        </p>
      </div>
    </div>
  );
}

