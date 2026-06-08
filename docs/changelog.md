# Changelog — Salva a T-REXo

Todas las versiones notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [0.1.0] — 2026-06-08 — Primera versión jugable

### Funcionalidades principales
- Tablero Match-3 8×8 con swipe/drag táctil y tap-tap
- 4 boosters: cohete, bomba (con onda expansiva), bola de color, pterodáctilo
- Objetivo de nivel: romper 10 huevos fósiles
- Panel de objetivos en UI superior con barra de progreso
- T-REXo companion con mensajes reactivos por estado
- Efectos visuales premium: tiles tipo gema, explosión de bomba con flash + onda
- Fondo jurásico integrado como marca de agua
- UI mobile-first con layout responsive
- Modo debug con boosters iniciales aleatorios (`GameConfig.debug.startingBoosters`)

---

## [0.3.0] — 2026-06-08

### Añadido — Drag & Swipe

**Interacción principal (drag/swipe):**
- `mousedown` → `mousemove` (document) → `mouseup` (document): arrastre con mouse en escritorio
- `touchstart` → `touchmove` → `touchend`: swipe táctil en móvil
- Umbral de 22 px: distancia mínima para reconocer un swipe (evita movimientos accidentales)
- Dirección dominante: si `|dx| >= |dy|` → horizontal; si no → vertical. Sin diagonales
- Bounds check: si la pieza destino está fuera del tablero, el gesto se ignora silenciosamente
- `touchcancel` limpia el estado de drag correctamente

**Compatibilidad tap-tap:**
- Gesto corto (< 22 px) → llama a `_onTileClick` → sistema de selección doble-tap original intacto
- El jugador puede usar indistintamente drag o tap-tap

**Scroll prevention:**
- CSS `touch-action: none` en `.board-grid` previene scroll de página al tocar el tablero
- Tiles heredan `touch-action: none`; no se necesita `preventDefault` en JS
- `touchmove` con `{ passive: true }` sin warnings de rendimiento

**Limpieza de memoria:**
- `_boundMouseMove`/`_boundMouseUp` se almacenan como referencias nombradas
- `destroy()` los elimina con `removeEventListener` (sin memory leaks al ir al menú y volver)

**Feedback visual:**
- `.pressing` — efecto inmediato al pulsar (scale 1.1, glow dorado suave, cursor `grabbing`)
- `.selected` — sigue disponible para el sistema tap-tap (scale 1.14, glow dorado fuerte)
- Cursor `grab` en tiles, `grabbing` durante `.pressing`

## [0.2.0] — 2026-06-08

### Añadido — Mejoras visuales + identidad T-REXo

**Animaciones de piezas:**
- Intercambio suave con CSS `transform` real vía `getBoundingClientRect` (no re-render instantáneo)
- Reversión animada cuando el swap no produce match (misma animación, coordenadas espejadas)
- `@keyframes match-pop` — piezas crecen ligeramente y explotan a cero en 320ms
- `@keyframes fall-in` — nuevas piezas caen desde arriba con resorte (ease cúbico)
- `@keyframes shake` — dos piezas vibran ante un movimiento inválido

**Feedback visual de HUD:**
- Score bump: `@keyframes score-pop` en el contador de puntos en cada match
- Moves warning: `@keyframes moves-pulse` — el contador de movimientos pulsa en rojo al llegar a ≤5
- Alerta de movimientos bajos se dispara solo una vez (flag `_lowMovesAlert`)

**T-REXo como personaje:**
- Strip de T-REXo entre la barra de progreso y el tablero: cara emoji + burbuja de texto
- `@keyframes trexo-bounce` — la cara rebota al reaccionar
- `@keyframes bubble-flash` — la burbuja destella al recibir un mensaje nuevo
- Reacciones implementadas: `start`, `match`, `bigMatch`, `noMatch`, `lowMoves`, `win`, `lose`
- Mensajes aleatorios por reacción (múltiples frases por estado)
- Reacción `win`/`lose` dispara antes del overlay para feedback inmediato

**Integración en LevelScene:**
- TRexo se crea y destruye con la escena (sin memory leaks)
- `busy` flag protege al T-REXo de reacciones durante la cascada (salvo las del propio cascade)
- Strip oculto en landscape móvil para maximizar espacio del tablero

## [0.1.0] — 2026-06-08

### Añadido — Fase 1: MVP Match-3 jugable

**Match-3 core:**
- Tablero 8x8 generado aleatoriamente sin matches iniciales (`Board._safeType`)
- 5 tipos de piezas con colores y emojis propios (🦴⭐🌿💧💎)
- Detección de combinaciones horizontales y verticales de 3 o más (`MatchDetector.findMatches`)
- Eliminación de piezas con animación de desvanecimiento (`.matched`)
- Caída de piezas superiores para llenar huecos (`Board.applyGravity`)
- Relleno de huecos con piezas nuevas (`Board.refill`)
- Cascadas automáticas hasta que no queden matches
- Reorganización automática del tablero si no hay movimientos válidos

**Interacción:**
- Selección de piezas con clic/tap (resaltado dorado)
- Intercambio con pieza adyacente (horizontal y vertical, no diagonal)
- Reversa automática si el intercambio no genera match
- Flag `busy` que bloquea input durante la cascada

**HUD y progreso:**
- Contador de puntos en tiempo real (10 pts/pieza)
- Barra de progreso animada hacia el objetivo de 500 pts
- Contador de movimientos restantes (rojo cuando quedan ≤ 5)
- Solo se descuenta 1 movimiento cuando el swap genera match

**Resultado:**
- Overlay de victoria: "¡Has ayudado a T-REXo!" con 🎉
- Overlay de derrota: "T-REXo necesita otro intento." con 😢
- Botón "Volver al menú" en el overlay (reinicia partida al volver)

**Estilos:**
- Tiles coloreados con sombra 3D y animación de selección/eliminación
- HUD compacto con T-REXo 🦕 centrado, labels y valores dorados
- Barra de progreso degradada (amarillo→naranja)
- Overlay semitransparente con caja de resultado centrada
- Totalmente responsive (mobile-first → tablet → desktop)
- Landscape mobile con layout compacto

## [0.0.1] — 2026-06-08

### Añadido
- Creación de la estructura inicial completa del proyecto
- `index.html` con metadatos mobile-first, carga de CSS y JS como módulo
- `styles/main.css`: estilos base mobile-first con diseño colorido y amigable
- `styles/responsive.css`: media queries para tablet (600px+) y escritorio (1024px+)
- `src/main.js`: punto de entrada, log de inicio, creación de la instancia Game
- `src/core/Game.js`: clase principal que registra y lanza escenas
- `src/core/SceneManager.js`: gestión de transiciones entre escenas
- `src/core/InputManager.js`: captura de eventos touch con detección de dirección de swipe
- `src/scenes/BootScene.js`: escena de arranque (transición inmediata a menú)
- `src/scenes/MenuScene.js`: pantalla de inicio con título, subtítulo y botón Jugar
- `src/scenes/LevelScene.js`: placeholder de nivel con mensaje "próximamente"
- `src/scenes/ResultScene.js`: placeholder de resultado
- `src/match3/Board.js`: clase Board con grid 8x8 (stub)
- `src/match3/Tile.js`: clase Tile con tipo, posición y estado
- `src/match3/MatchDetector.js`: detector de matches (stub con estructura)
- `src/match3/BoardShuffler.js`: reorganizador de tablero (stub)
- `src/match3/LevelObjectives.js`: seguimiento de objetivos por nivel
- `src/characters/TRexo.js`: clase TRexo con sistema de emociones básico
- `src/levels/level001.js`, `level002.js`, `level003.js`: definiciones de los 3 primeros niveles
- `src/config/gameConfig.js`: configuración centralizada del juego
- `src/utils/constants.js`: constantes de escenas, tipos de tile y eventos
- `src/utils/helpers.js`: funciones de utilidad (randomInt, clamp, shuffle, sleep)
- `docs/game-design.md`: visión del juego, personaje, mecánicas y diferencias con juegos comerciales
- `docs/roadmap.md`: fases 0-4 del desarrollo
- `docs/technical-notes.md`: arquitectura, decisiones técnicas y buenas prácticas
- `README.md`: descripción, stack, instrucciones de ejecución local y despliegue
- `package.json`: scripts start/dev con npx serve
- `.gitignore`: exclusión de node_modules, dist, .env y archivos temporales
- Carpetas `assets/` preparadas para imágenes, audio y fuentes (vacías)

### Notas
- Pantalla inicial funcional y visible en navegador
- Arquitectura preparada para crecer hacia la Fase 1 (tablero Match-3 real)
- Sin dependencias externas instaladas
- Sin assets comerciales ni protegidos
