# Instagram Speed Controller

Control playback speed of Instagram Reels and videos with an intuitive overlay, customizable hotkeys, and mouse-hold controls. Perfect for bingers who want to slow down, speed up, or quickly jump through Reels.

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked** and select this extension directory
5. The extension is now active on Instagram!

## Features

- **Speed Overlay** — Visual control panel with speed display and +/− buttons
- **Hotkeys** — Press keys to adjust speed without touching the mouse
- **Mouse Hold** — Hold down on video for 2x speed (default), then release to return to previous speed
- **Customizable Settings** — Adjust all speeds, increments, and hotkeys to your preference
- **Draggable Overlay** — Move the control panel wherever you want on the video
- **Dark Theme** — Sleek dark UI that blends with Instagram's design

## Default Hotkeys

| Action | Key | Description |
|--------|-----|-------------|
| Decrease Speed | S | Decrease speed by small increment (0.1x) |
| Increase Speed | D | Increase speed by small increment (0.1x) |
| Reset Speed | R | Return to default speed (1.0x) |
| Preset Speed | G | Jump to preset speed (2.0x by default) |
| Toggle Overlay | V | Hide or show the speed overlay |

## How to Use

### Overlay Controls

The overlay appears as a small pill-shaped control panel on every video:

- **Speed Display** — Shows current playback speed (e.g., 1.50x)
- **« button** — Decrease speed by large increment (0.5x)
- **− button** — Decrease speed by small increment (0.1x)
- **+ button** — Increase speed by small increment (0.1x)
- **» button** — Increase speed by large increment (0.5x)
- **× button** — Hide the overlay

**Drag to Reposition** — Hover over the overlay and drag it to reposition it wherever you prefer. The position persists across videos.

### Keyboard Hotkeys

While watching a Reel, press any hotkey to instantly adjust speed:
- Press **S** to slow down (−0.1x)
- Press **D** to speed up (+0.1x)
- Press **R** to reset to normal speed
- Press **G** to jump to your preset speed
- Press **V** to toggle the overlay visibility

### Mouse Hold

Click and hold anywhere on the video for 300ms to instantly jump to 2x speed. Release to return to your previous speed. Perfect for quickly scanning through slow moments.

## Settings

Click the **extension icon** (in Chrome's toolbar) and select **Options** to open the Settings page.

### Customizable Options

- **Speed Settings**
  - Default Speed — Playback speed when you start (default: 1.0x)
  - Hold Speed — Speed when you hold down (default: 2.0x)
  - Preset Speed — Jump-to speed for the G hotkey (default: 2.0x)
  - Min/Max Speed — Speed range allowed (default: 0.1x to 16.0x)
  - Speed Increment — Step size for small adjustments (default: 0.1x)
  - Large Speed Increment — Step size for big jumps (default: 0.5x)

- **Overlay**
  - Show Overlay — Toggle visibility by default (default: on)
  - Reset Position — Restore overlay to default top-left corner

- **Hotkey Bindings**
  - Click **Press to rebind** on any action to customize the hotkey
  - Press the desired key (or Esc to unbind)
  - Hotkey conflicts are detected and warned

All changes auto-save instantly. Click **Reset All Settings** to restore defaults.

## Customization

Everything is customizable:

- **All speeds** — Adjust min, max, default, hold, and preset speeds to fit your viewing style
- **All increments** — Change how much speed changes with each button press or hotkey
- **All hotkeys** — Rebind any action to any key you prefer

Example: If you prefer speed adjustments in 0.25x steps, set both speed increments to 0.25x. If you want 4x speed for your preset, change Preset Speed to 4.0x.

## Troubleshooting

**Hotkeys not working?**
- Make sure you're not typing in a comment box or search field
- The overlay must have focus on a Reel video

**Overlay not appearing?**
- Refresh the page
- Check Settings to ensure "Show Overlay" is enabled

**Speed resets on new Reel?**
- This is by design — each Reel starts at the default speed

## License

Open source. Feel free to modify and distribute.
