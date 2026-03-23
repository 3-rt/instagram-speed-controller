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
    overlayPosition: { x: 0, y: 0 }
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
    }
  });

  // Apply speed to all tracked videos
  function applySpeed(speed) {
    speed = Math.max(settings.minSpeed, Math.min(settings.maxSpeed, speed));
    speed = Math.round(speed * 100) / 100; // Avoid floating point drift
    currentSpeed = speed;
    trackedVideos.forEach((video) => {
      video.playbackRate = speed;
    });
    // Update overlay speed display
    if (globalOverlay) {
      const display = globalOverlay.querySelector('.isc-speed-display');
      if (display) display.textContent = speed.toFixed(2);
    }
  }

  // Track a new video element
  function trackVideo(video) {
    if (trackedVideos.has(video)) return;
    trackedVideos.add(video);
    video.playbackRate = currentSpeed;

    // Re-apply speed when Instagram resets playbackRate on new reel
    video.addEventListener('play', () => {
      video.playbackRate = currentSpeed;
    });

    // Re-apply speed if Instagram programmatically changes playbackRate
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
    video._iscOverlay = null;
    // Clean up IntersectionObserver
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

  // Shared drag state (single set of document-level listeners, not per-video)
  const dragState = {
    isDragging: false,
    overlay: null,
    startX: 0, startY: 0,
    overlayStartX: 0, overlayStartY: 0
  };

  document.addEventListener('mousemove', (e) => {
    if (!dragState.isDragging || !dragState.overlay) return;
    const overlay = dragState.overlay;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const newX = dragState.overlayStartX + dx;
    const newY = dragState.overlayStartY + dy;
    // Clamp to viewport
    const maxX = window.innerWidth - overlay.offsetWidth;
    const maxY = window.innerHeight - overlay.offsetHeight;
    overlay.style.left = Math.max(0, Math.min(maxX, newX)) + 'px';
    overlay.style.top = Math.max(0, Math.min(maxY, newY)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragState.isDragging || !dragState.overlay) return;
    const overlay = dragState.overlay;
    dragState.isDragging = false;
    dragState.overlay = null;
    chrome.storage.sync.set({
      overlayPosition: {
        x: parseInt(overlay.style.left),
        y: parseInt(overlay.style.top)
      }
    });
  });

  // Single global overlay in a Shadow DOM host appended to documentElement
  // Shadow DOM isolates the overlay from Instagram's CSS (transforms, overflow, etc.)
  let globalOverlay = null;
  let shadowHost = null;

  function createOverlay(video) {
    // Only create one overlay globally
    if (globalOverlay) {
      video._iscOverlay = globalOverlay;
      return;
    }

    // Create shadow DOM host on documentElement to escape all Instagram CSS
    shadowHost = document.createElement('div');
    shadowHost.id = 'isc-shadow-host';
    shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(shadowHost);
    const shadow = shadowHost.attachShadow({ mode: 'open' });

    // Inject styles directly into shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      .isc-overlay {
        position: fixed;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #fff;
        user-select: none;
        pointer-events: auto;
        transition: opacity 0.2s;
      }
      .isc-overlay.isc-hidden { display: none; }
      .isc-pill {
        display: flex;
        align-items: center;
        gap: 0;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        padding: 4px 8px;
        cursor: grab;
        backdrop-filter: blur(4px);
      }
      .isc-pill:active { cursor: grabbing; }
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
    shadow.appendChild(style);

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
      { label: '\u00BB', action: () => applySpeed(currentSpeed + settings.largeSpeedIncrement) },
      { label: '\u00D7', action: () => overlay.classList.add('isc-hidden') }
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

    // Position: use saved position if available, otherwise top-left of the video
    const pos = settings.overlayPosition;
    const hasSavedPosition = pos.x !== undefined && pos.x !== 0 || pos.y !== undefined && pos.y !== 0;
    if (hasSavedPosition) {
      overlay.style.left = pos.x + 'px';
      overlay.style.top = pos.y + 'px';
    } else {
      // Default to top-left corner of the video + small padding
      const videoRect = video.getBoundingClientRect();
      overlay.style.left = (videoRect.left + 8) + 'px';
      overlay.style.top = (videoRect.top + 8) + 'px';
    }

    // Dragging — uses shared document-level listeners (set up once, see dragState above)
    pill.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('isc-btn')) return;
      dragState.isDragging = true;
      dragState.overlay = overlay;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      const rect = overlay.getBoundingClientRect();
      dragState.overlayStartX = rect.left;
      dragState.overlayStartY = rect.top;
      e.preventDefault();
      e.stopPropagation();
    });

    // Stop propagation on all overlay interactions
    overlay.addEventListener('click', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());

    shadow.appendChild(overlay);
    globalOverlay = overlay;
    video._iscOverlay = overlay;
  }

  function setupMouseHold(video) {
    let holdTimer = null;
    let speedBeforeHold = null;

    // Use the video's parent container since Instagram overlays UI elements
    // on top of the video — mousedown on <video> may not fire reliably
    const container = video.parentElement || video;

    container.addEventListener('mousedown', (e) => {
      // Only left click
      if (e.button !== 0) return;
      // Don't trigger if clicking overlay
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
      // Clean up removed videos (spread to array to avoid mutating Set during iteration)
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
    // Track any videos already on the page
    document.querySelectorAll('video').forEach(trackVideo);
  });

  // Hotkey handler
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (document.activeElement?.isContentEditable) return;

    // No active video, skip
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
      if (globalOverlay) {
        globalOverlay.classList.toggle('isc-hidden');
        const isVisible = !globalOverlay.classList.contains('isc-hidden');
        chrome.storage.sync.set({ showOverlay: isVisible });
      }
    }
  });
})();
