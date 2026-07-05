// src/scenes/DangerEventPanel.js
// Thin adapter — the danger/chase panel is the video-capable cinematic.
// Keeps the same import/class name so callers (LevelScene) don't change.

import { SharkEscapeVideoCinematic } from '../cinematics/SharkEscapeVideoCinematic.js';

export class DangerEventPanel extends SharkEscapeVideoCinematic {}
