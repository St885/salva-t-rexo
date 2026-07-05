export const GameConfig = {
  version: '0.1.7',
  name: 'Salva a T-REXo',

  board: {
    cols: 8,
    rows: 8,
    tileSize: 64,
  },

  tiles: {
    types: 6,
    colors: ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#a8dadc', '#ffd60a'],
    names:  ['rojo', 'naranja', 'verde', 'azul', 'celeste', 'amarillo'],
  },

  gameplay: {
    defaultMoves:     25,
    minMatchLength:   3,
    levelTimeSeconds: 78,
  },

  debug: {
    startingBoosters:        false,
    DEBUG_TEST_ALL_BOOSTERS: false,  // ← true para testear todas las parejas
    DEBUG_TEST_TWO_BOOSTERS: false,  // ← true para testear una pareja específica
    // Alias: 'rainbow'/'color-bomb', 'bomb', 'rocket'/'rocket-h', 'rocket-v',
    //        'ptero'/'flying'/'eagle'/'spaceship'/'ufo' (todos = ptero), 'normal'/null
    TEST_BOOSTER_PAIR:       ['rainbow', 'rocket-h'],

    // Previsualizar la micro-cinemática de persecución en un estado fijo (sin jugar)
    DEBUG_CINEMATIC: false,
    // "safe" | "warning" | "danger" | "critical" | "rainbow" | "bomb" | "rocket" | "flying" | "combo" | "victory"
    DEBUG_CINEMATIC_STATE: 'safe',
    // Forzar el nuevo sistema de VIDEO aunque el estado normal no lo active.
    // (si no hay archivo de video, igualmente muestra los overlays sobre el fallback)
    DEBUG_FORCE_VIDEO_CINEMATIC: false,
    // (alias antiguo, sigue funcionando)
    DEBUG_DANGER_SCENE: false,
    DEBUG_DANGER_STATE: 'danger',
  },
};
