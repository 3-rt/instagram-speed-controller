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

// Only run UI logic on the settings page
if (document.getElementById('defaultSpeed')) {
  const SPEED_FIELDS = [
    'defaultSpeed', 'speedIncrement', 'largeSpeedIncrement',
    'minSpeed', 'maxSpeed', 'holdSpeed', 'presetSpeed'
  ];

  // Load and populate form
  loadSettings().then((s) => {
    SPEED_FIELDS.forEach((field) => {
      document.getElementById(field).value = s[field];
    });
    document.getElementById('showOverlay').checked = s.showOverlay;

    // Populate hotkey displays
    Object.entries(s.hotkeys).forEach(([action, key]) => {
      const el = document.getElementById('hotkey-' + action);
      if (el) el.textContent = key ? key.toUpperCase() : 'None';
    });

    checkConflicts(s.hotkeys);
  });

  // Auto-save speed fields on change
  SPEED_FIELDS.forEach((field) => {
    document.getElementById(field).addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value > 0) {
        saveSettings({ [field]: value });
        flashSaveStatus();
      }
    });
  });

  // Auto-save checkbox
  document.getElementById('showOverlay').addEventListener('change', (e) => {
    saveSettings({ showOverlay: e.target.checked });
    flashSaveStatus();
  });

  // Reset position
  document.getElementById('resetPosition').addEventListener('click', () => {
    saveSettings({ overlayPosition: { xPercent: 0, yPercent: 0 } });
    flashSaveStatus();
  });

  // Reset all
  document.getElementById('resetAll').addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings().then(() => location.reload());
    }
  });

  // Hotkey rebinding
  let activeRebind = null;

  document.querySelectorAll('.rebind-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Cancel previous rebind if any
      if (activeRebind) {
        activeRebind.btn.classList.remove('listening');
        activeRebind.btn.textContent = 'Press to rebind';
      }

      activeRebind = { action: btn.dataset.action, btn };
      btn.classList.add('listening');
      btn.textContent = 'Press a key... (Esc to unbind)';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!activeRebind) return;
    e.preventDefault();

    const { action, btn } = activeRebind;
    const key = e.key === 'Escape' ? null : e.key.toLowerCase();

    // Update hotkey
    loadSettings().then((s) => {
      s.hotkeys[action] = key;
      saveSettings({ hotkeys: s.hotkeys });

      // Update display
      const display = document.getElementById('hotkey-' + action);
      display.textContent = key ? key.toUpperCase() : 'None';

      btn.classList.remove('listening');
      btn.textContent = 'Press to rebind';
      activeRebind = null;

      checkConflicts(s.hotkeys);
      flashSaveStatus();
    });
  });

  // Conflict detection
  function checkConflicts(hotkeys) {
    const values = Object.values(hotkeys).filter(Boolean);
    const hasDuplicates = new Set(values).size !== values.length;
    document.getElementById('conflict-warning').style.display = hasDuplicates ? 'block' : 'none';
  }

  // Save status flash
  function flashSaveStatus() {
    const el = document.getElementById('saveStatus');
    el.textContent = 'Saved!';
    el.style.color = '#4caf50';
    setTimeout(() => {
      el.textContent = 'Settings auto-save';
      el.style.color = '#666';
    }, 1500);
  }
}
