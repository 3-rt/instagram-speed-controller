(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    defaultSpeed: 1.0,
    speedIncrement: 0.1,
    largeSpeedIncrement: 0.5,
    minSpeed: 0.1,
    maxSpeed: 16.0,
    holdSpeed: 2.0,
    presetSpeed: 2.0,
    hotkeys: {
      decreaseSpeed: 's',
      increaseSpeed: 'd',
      resetSpeed: 'r',
      presetSpeed: 'g',
      toggleOverlay: 'v'
    },
    showOverlay: true,
    overlayPosition: { x: null, y: null }
  };

  let settings = { ...DEFAULT_SETTINGS };
  let currentSpeed = 1.0;
  let activeVideo = null;
  const trackedVideos = new Set();

  // Load settings from storage
  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (stored) => {
        settings = Object.assign({}, DEFAULT_SETTINGS, stored);
        settings.hotkeys = Object.assign({}, DEFAULT_SETTINGS.hotkeys, stored.hotkeys || {});
        settings.overlayPosition = Object.assign({}, DEFAULT_SETTINGS.overlayPosition, stored.overlayPosition || {});
        currentSpeed = settings.defaultSpeed;
        resolve(settings);
      });
    });
  }

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key === 'hotkeys') {
        settings.hotkeys = Object.assign({}, DEFAULT_SETTINGS.hotkeys, newValue || {});
      } else if (key === 'overlayPosition') {
        settings.overlayPosition = Object.assign({}, DEFAULT_SETTINGS.overlayPosition, newValue || {});
      } else {
        settings[key] = newValue;
      }
      // React to showOverlay toggle from popup
      if (key === 'showOverlay') {
        trackedVideos.forEach((video) => {
          if (video._iscOverlay) {
            if (newValue) {
              video._iscOverlay.classList.remove('isc-hidden');
            } else {
              video._iscOverlay.classList.add('isc-hidden');
            }
          }
        });
      }
    }
  });

  // Overlay CSS injected once into the page
  const overlayCSS = `
    .isc-overlay {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #fff;
      user-select: none;
      pointer-events: auto;
    }
    .isc-overlay.isc-hidden { display: none; }
    .isc-pill {
      display: flex;
      align-items: center;
      gap: 0;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 4px 8px;
      backdrop-filter: blur(4px);
    }
    .isc-speed-display {
      font-weight: 600;
      font-size: 13px;
      min-width: 36px;
      text-align: center;
    }
    .isc-controls {
      display: none;
      align-items: center;
      gap: 4px;
      margin-left: 6px;
    }
    .isc-overlay:hover .isc-controls { display: flex; }
    .isc-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
      transition: background 0.15s;
    }
    .isc-btn:hover { background: rgba(255, 255, 255, 0.3); }
  `;

  let styleInjected = false;
  function injectStyles() {
    if (styleInjected) return;
    const style = document.createElement('style');
    style.textContent = overlayCSS;
    document.head.appendChild(style);
    styleInjected = true;
  }

  // Apply speed to all tracked videos
  function applySpeed(speed) {
    speed = Math.max(settings.minSpeed, Math.min(settings.maxSpeed, speed));
    speed = Math.round(speed * 100) / 100;
    currentSpeed = speed;
    trackedVideos.forEach((video) => {
      video.playbackRate = speed;
    });
    // Update all overlays
    document.querySelectorAll('.isc-speed-display').forEach((el) => {
      el.textContent = speed.toFixed(2);
    });
  }

  // Track a new video element
  function trackVideo(video) {
    if (trackedVideos.has(video)) return;
    trackedVideos.add(video);
    video.playbackRate = currentSpeed;

    // Ensure video's parent is positioned for overlay placement
    const parent = video.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    // Re-apply speed when Instagram resets playbackRate
    video.addEventListener('play', () => {
      video.playbackRate = currentSpeed;
    });
    video.addEventListener('ratechange', () => {
      if (video.playbackRate !== currentSpeed) {
        video.playbackRate = currentSpeed;
      }
    });

    createOverlay(video);
    setupMouseHold(video);
    setupIntersectionObserver(video);
  }

  // Untrack a removed video
  function untrackVideo(video) {
    trackedVideos.delete(video);
    if (video._iscOverlay && video._iscOverlay.parentElement) {
      video._iscOverlay.parentElement.removeChild(video._iscOverlay);
    }
    video._iscOverlay = null;
    if (video._iscIntersectionObserver) {
      video._iscIntersectionObserver.disconnect();
      video._iscIntersectionObserver = null;
    }
  }

  // IntersectionObserver to track active video
  function setupIntersectionObserver(video) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            activeVideo = video;
          }
        });
      },
      { threshold: [0.5] }
    );
    observer.observe(video);
    video._iscIntersectionObserver = observer;
  }

  // Create overlay for each video, pinned to top-left of its pane
  function createOverlay(video) {
    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'isc-overlay';
    if (!settings.showOverlay) overlay.classList.add('isc-hidden');

    const pill = document.createElement('div');
    pill.className = 'isc-pill';

    const speedDisplay = document.createElement('span');
    speedDisplay.className = 'isc-speed-display';
    speedDisplay.textContent = currentSpeed.toFixed(2);

    const controls = document.createElement('div');
    controls.className = 'isc-controls';

    const buttons = [
      { label: '\u00AB', action: () => applySpeed(currentSpeed - settings.largeSpeedIncrement) },
      { label: '\u2212', action: () => applySpeed(currentSpeed - settings.speedIncrement) },
      { label: '+', action: () => applySpeed(currentSpeed + settings.speedIncrement) },
      { label: '\u00BB', action: () => applySpeed(currentSpeed + settings.largeSpeedIncrement) }
    ];

    buttons.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.className = 'isc-btn';
      btn.textContent = label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        action();
      });
      controls.appendChild(btn);
    });

    pill.appendChild(speedDisplay);
    pill.appendChild(controls);
    overlay.appendChild(pill);

    // Stop propagation on overlay interactions
    overlay.addEventListener('click', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());

    const parent = video.parentElement;
    parent.appendChild(overlay);
    video._iscOverlay = overlay;
  }

  function setupMouseHold(video) {
    let holdTimer = null;
    let speedBeforeHold = null;

    const container = video.parentElement || video;

    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.isc-overlay')) return;

      holdTimer = setTimeout(() => {
        speedBeforeHold = currentSpeed;
        applySpeed(settings.holdSpeed);
      }, 300);
    });

    const cancelHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (speedBeforeHold !== null) {
        applySpeed(speedBeforeHold);
        speedBeforeHold = null;
      }
    };

    container.addEventListener('mouseup', cancelHold);
    container.addEventListener('mouseleave', cancelHold);
  }

  // MutationObserver to detect new videos (debounced)
  let mutationTimeout = null;
  const observer = new MutationObserver(() => {
    if (mutationTimeout) return;
    mutationTimeout = setTimeout(() => {
      mutationTimeout = null;
      const videos = document.querySelectorAll('video');
      videos.forEach(trackVideo);
      [...trackedVideos].forEach((video) => {
        if (!document.contains(video)) {
          untrackVideo(video);
        }
      });
    }, 200);
  });

  // Initialize
  loadSettings().then(() => {
    currentSpeed = settings.defaultSpeed;
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('video').forEach(trackVideo);
  });

  // Hotkey handler
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (document.activeElement?.isContentEditable) return;

    if (!activeVideo || !document.contains(activeVideo)) return;

    const key = e.key.toLowerCase();
    const { hotkeys } = settings;

    if (key === hotkeys.decreaseSpeed) {
      e.preventDefault();
      applySpeed(currentSpeed - settings.speedIncrement);
    } else if (key === hotkeys.increaseSpeed) {
      e.preventDefault();
      applySpeed(currentSpeed + settings.speedIncrement);
    } else if (key === hotkeys.resetSpeed) {
      e.preventDefault();
      applySpeed(settings.defaultSpeed);
    } else if (key === hotkeys.presetSpeed) {
      e.preventDefault();
      applySpeed(settings.presetSpeed);
    } else if (key === hotkeys.toggleOverlay) {
      e.preventDefault();
      trackedVideos.forEach((video) => {
        if (video._iscOverlay) {
          video._iscOverlay.classList.toggle('isc-hidden');
        }
      });
      const anyVisible = [...trackedVideos].some(
        (v) => v._iscOverlay && !v._iscOverlay.classList.contains('isc-hidden')
      );
      chrome.storage.sync.set({ showOverlay: anyVisible });
    }
  });
})();
