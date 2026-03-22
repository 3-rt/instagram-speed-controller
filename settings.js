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

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (stored) => {
      const settings = Object.assign({}, DEFAULT_SETTINGS, stored);
      // Merge nested hotkeys object
      settings.hotkeys = Object.assign({}, DEFAULT_SETTINGS.hotkeys, stored.hotkeys || {});
      settings.overlayPosition = Object.assign({}, DEFAULT_SETTINGS.overlayPosition, stored.overlayPosition || {});
      resolve(settings);
    });
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}

function resetSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => {
      chrome.storage.sync.set(DEFAULT_SETTINGS, resolve);
    });
  });
}
