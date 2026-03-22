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
    overlayPosition: { xPercent: 0, yPercent: 0 }
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

    createOverlay(video);
    setupMouseHold(video);
    setupIntersectionObserver(video);
  }

  // Untrack a removed video
  function untrackVideo(video) {
    trackedVideos.delete(video);
    const overlay = video._iscOverlay;
    if (overlay && overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
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
    const parent = overlay.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const newX = dragState.overlayStartX + dx - parentRect.left;
    const newY = dragState.overlayStartY + dy - parentRect.top;
    const overlayRect = overlay.getBoundingClientRect();
    const maxXPercent = ((parentRect.width - overlayRect.width) / parentRect.width) * 100;
    const maxYPercent = ((parentRect.height - overlayRect.height) / parentRect.height) * 100;
    const xPercent = Math.max(0, Math.min(maxXPercent, (newX / parentRect.width) * 100));
    const yPercent = Math.max(0, Math.min(maxYPercent, (newY / parentRect.height) * 100));
    overlay.style.left = xPercent + '%';
    overlay.style.top = yPercent + '%';
  });

  document.addEventListener('mouseup', () => {
    if (!dragState.isDragging || !dragState.overlay) return;
    const overlay = dragState.overlay;
    dragState.isDragging = false;
    dragState.overlay = null;
    const parent = overlay.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const xPercent = ((overlayRect.left - parentRect.left) / parentRect.width) * 100;
    const yPercent = ((overlayRect.top - parentRect.top) / parentRect.height) * 100;
    chrome.storage.sync.set({ overlayPosition: { xPercent, yPercent } });
  });

  // Placeholder — overlay created in Task 4
  function createOverlay(video) {}

  // Placeholder — mouse hold created in Task 5
  function setupMouseHold(video) {}

  // MutationObserver to detect new videos (debounced)
  let mutationTimeout = null;
  const observer = new MutationObserver(() => {
    if (mutationTimeout) return;
    mutationTimeout = setTimeout(() => {
      mutationTimeout = null;
      const videos = document.querySelectorAll('video');
      videos.forEach(trackVideo);
      // Clean up removed videos
      trackedVideos.forEach((video) => {
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
})();
