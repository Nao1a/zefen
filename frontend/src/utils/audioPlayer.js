class AudioSnippetPlayer {
  constructor() {
    this.currentAudio = null;
    this.timerId = null;
    this.isPlaying = false;
    this.activePromise = null;
    this.audioCache = new Map(); // url -> HTMLAudioElement
  }

  // Preload all snippet URLs for a song in background so playback is instant (0ms delay)
  preloadSnippets(snippets = {}) {
    if (!snippets || typeof snippets !== 'object') return;

    Object.values(snippets).forEach((url) => {
      if (!url || typeof url !== 'string') return;
      if (!this.audioCache.has(url)) {
        try {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.src = url;
          audio.load();
          this.audioCache.set(url, audio);
        } catch (e) {
          // Ignore prefetch errors in restrictive environments
        }
      }
    });
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.currentAudio) {
      const audio = this.currentAudio;
      this.currentAudio = null;

      // Remove any lingering event listeners
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;

      if (this.activePromise) {
        this.activePromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {
            // Ignore interruption
          });
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    }

    this.isPlaying = false;
    this.activePromise = null;
  }

  playSnippet(url, snippetLevel, onEndCallback, onStartCallback) {
    if (!url) {
      console.warn('Cannot play audio: URL is missing');
      if (onEndCallback) onEndCallback();
      return;
    }

    this.stop();

    const durationSeconds = this.parseDuration(snippetLevel);
    this.isPlaying = true;

    // Get cached preloaded audio element or instantiate new one
    let audio = this.audioCache.get(url);
    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      this.audioCache.set(url, audio);
    }

    this.currentAudio = audio;
    audio.currentTime = 0;

    // Trigger timer only when audio ACTUALLY starts playing through speakers
    audio.onplaying = () => {
      if (onStartCallback) onStartCallback();

      if (durationSeconds !== null && durationSeconds > 0) {
        if (this.timerId) clearTimeout(this.timerId);
        this.timerId = setTimeout(() => {
          this.stop();
          if (onEndCallback) onEndCallback();
        }, durationSeconds * 1000);
      }
    };

    audio.onended = () => {
      this.stop();
      if (onEndCallback) onEndCallback();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error for URL:', url, e);
      this.stop();
      if (onEndCallback) onEndCallback();
    };

    try {
      this.activePromise = audio.play();
      if (this.activePromise) {
        this.activePromise.catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Playback error:', err.message);
          }
          this.isPlaying = false;
          if (onEndCallback) onEndCallback();
        });
      }
    } catch (err) {
      console.warn('Synchronous play error:', err);
      this.isPlaying = false;
      if (onEndCallback) onEndCallback();
    }
  }

  parseDuration(level) {
    switch (String(level)) {
      case '1.0': return 1.0;
      case '2.0': return 2.0;
      case '4.0': return 4.0;
      case '8.0': return 8.0;
      case '10.0': return 10.0;
      case 'full': return null;
      default: return parseFloat(level) || null;
    }
  }
}

export const audioPlayer = new AudioSnippetPlayer();
