const btnOn = document.getElementById('btnOn');
const btnOff = document.getElementById('btnOff');

function updateButtons(isOn) {
  btnOn.className = 'toggle-btn' + (isOn ? ' active-on' : '');
  btnOff.className = 'toggle-btn' + (!isOn ? ' active-off' : '');
}

// Load current state
chrome.storage.sync.get({ showOverlay: true }, (result) => {
  updateButtons(result.showOverlay);
});

btnOn.addEventListener('click', () => {
  chrome.storage.sync.set({ showOverlay: true });
  updateButtons(true);
});

btnOff.addEventListener('click', () => {
  chrome.storage.sync.set({ showOverlay: false });
  updateButtons(false);
});

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
