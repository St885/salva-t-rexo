# Notas técnicas — Salva a T-REXo

## Arquitectura inicial

El proyecto usa una arquitectura de **escenas** simple, sin frameworks. Cada pantalla del juego es una "escena" independiente que sabe cómo crearse y destruirse.

```
main.js
  └── Game
        ├── SceneManager  ← controla qué escena está activa
        ├── InputManager  ← captura touch y mouse
        └── Escenas:
              ├── BootScene    (carga inicial)
              ├── MenuScene    (pantalla de inicio)
              ├── LevelScene   (tablero de juego)
              └── ResultScene  (victoria / derrota)
```

El módulo `match3/` contiene toda la lógica del tablero, aislada de la presentación. En Fase 1, `LevelScene` usará `Board`, `MatchDetector`, `BoardShuffler` y `LevelObjectives`.

---

## Responsabilidad de cada carpeta

| Carpeta | Responsabilidad |
|---|---|
| `src/config/` | Constantes de configuración del juego (tamaño del tablero, colores, etc.) |
| `src/core/` | Motor base: Game loop, SceneManager, InputManager |
| `src/scenes/` | Pantallas del juego — cada una renderiza su propio HTML/Canvas |
| `src/match3/` | Lógica pura del Match-3: tablero, detección de matches, objetivos |
| `src/characters/` | Personaje T-REXo: estado, emociones, reacciones |
| `src/levels/` | Definición de niveles: objetivos, movimientos, configuración del tablero |
| `src/utils/` | Funciones de utilidad sin dependencias externas |
| `assets/` | Imágenes, audio y fuentes — solo assets originales o libres de regalías |
| `styles/` | CSS separado del JS para facilitar el mantenimiento visual |
| `docs/` | Diseño, roadmap y notas técnicas del proyecto |

---

## Decisiones técnicas iniciales

### ES Modules nativos (sin bundler)
Se usa `type="module"` directamente en el browser. No hay Webpack, Vite ni Rollup en esta fase. Esto permite:
- Cero configuración de build
- Deploy directo a GitHub Pages
- Iteración rápida sin pasos de compilación

**Trade-off:** en producción final se evaluará un bundler para optimizar el tamaño y la compatibilidad.

### HTML/CSS para UI en lugar de Canvas
Las escenas de menú y resultado usan HTML/CSS, no Canvas. Esto simplifica el layout y aprovecha el sistema de layout nativo del browser (flexbox, responsive).

El tablero de juego (Fase 1) usará Canvas 2D o una grilla de divs — decisión a tomar cuando se implemente.

### Sin librerías externas
Dependencia cero en esta fase. Todo el código es vanilla JS/HTML/CSS. Se agrega una librería solo si resuelve un problema específico y justificado.

---

## Por qué empezamos web mobile-first antes que app nativa

1. **Ciclo de desarrollo más rápido:** sin compilación, sin firma de apps, sin stores.
2. **Prueba en móvil inmediata:** abrir la IP local en el móvil es suficiente.
3. **GitHub Pages como distribución gratuita:** compartir el juego con un link sin costo.
4. **Conversión posterior con Capacitor:** una vez que el juego web funcione bien, Capacitor puede empaquetarlo como app Android/iOS con cambios mínimos.
5. **Mobile-first CSS:** diseñar para el viewport móvil desde el principio evita refactors de CSS grandes después.

---

## Cómo evitar mezclar contexto con otros proyectos

- **Este proyecto vive exclusivamente en** `03_juegos/salva-t-rexo/`.
- No comparte módulos, assets, configuración ni dependencias con `tetris-game`, `legendary-adventures` u otros proyectos del workspace.
- No tiene su propio `.git` — se puede inicializar como repositorio independiente cuando se decida hacer el primer push.
- Los assets de `04_recursos_compartidos/` **no deben copiarse aquí sin autorización explícita**.

---

## Buenas prácticas para mantener el proyecto limpio

1. **Un archivo = una responsabilidad.** Cada clase o módulo hace una sola cosa.
2. **Sin lógica de juego en las escenas.** Las escenas solo renderizan; la lógica va en `match3/` o `characters/`.
3. **Constantes en `constants.js`.** Ningún string mágico suelto en el código.
4. **Comentarios solo cuando el "por qué" no es obvio.** El código se documenta con nombres claros.
5. **Actualizar `docs/changelog.md`** al cerrar cada versión.
6. **No commitear `node_modules/`** — el `.gitignore` ya lo excluye.
