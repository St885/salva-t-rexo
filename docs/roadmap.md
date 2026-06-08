# Roadmap — Salva a T-REXo

## Fase 0 — Preparación del proyecto ✅

**Estado:** Completado (v0.0.1)

- [x] Crear estructura base de carpetas y archivos
- [x] Documentar la visión del juego
- [x] Preparar arquitectura inicial (Game, SceneManager, InputManager, escenas)
- [x] Pantalla inicial funcional con título, subtítulo y botón Jugar
- [x] Módulos Match-3 preparados como stubs
- [x] Documentación inicial (game-design, roadmap, technical-notes, changelog)
- [x] Preparado para ES Modules y GitHub Pages

---

## Fase 1 — MVP jugable

**Estado:** Pendiente

### Tablero
- [ ] Generar tablero 8x8 con piezas aleatorias
- [ ] Renderizar tablero en pantalla con colores
- [ ] Asegurar que no haya matches iniciales al generar

### Interacción
- [ ] Seleccionar pieza con click/tap
- [ ] Resaltar pieza seleccionada
- [ ] Intercambiar piezas adyacentes (touch drag y click)
- [ ] Validar que el intercambio produzca al menos un match

### Lógica Match-3
- [ ] Detectar combinaciones de 3+ horizontal y vertical
- [ ] Eliminar piezas combinadas con animación
- [ ] Hacer caer piezas superiores para llenar huecos
- [ ] Generar nuevas piezas en la fila superior
- [ ] Detectar y procesar cascadas (chain reactions)

### Gameplay
- [ ] Contador de movimientos visible y funcional
- [ ] Objetivo del nivel visible (ej. "10/10 rojas")
- [ ] Detectar victoria (objetivo cumplido)
- [ ] Detectar derrota (movimientos agotados)
- [ ] Reagrupar tablero automáticamente si no hay moves válidos

### UI
- [ ] Pantalla de victoria con T-REXo celebrando
- [ ] Pantalla de derrota con T-REXo triste
- [ ] Botones "Volver a intentar" y "Menú"

---

## Fase 2 — Identidad T-REXo

**Estado:** Pendiente

- [ ] Añadir ilustración o sprite de T-REXo (original o libre de regalías)
- [ ] Animaciones de T-REXo: alegría, tristeza, celebración, susto
- [ ] Escena de introducción por nivel (T-REXo en apuros)
- [ ] Escena de rescate al completar el nivel
- [ ] Diálogos/burbujas de T-REXo ("¡Genial!", "¡Casi!")
- [ ] Animaciones de piezas mejoradas (escala, fade, partículas simples)

---

## Fase 3 — Mejoras y contenido

**Estado:** Pendiente

- [ ] Power-ups básicos (bomba, relámpago de fila, arco iris)
- [ ] Obstáculos en el tablero (rocas, hielo, lianas)
- [ ] 10+ niveles con dificultad progresiva
- [ ] Efectos de sonido (match, victoria, derrota)
- [ ] Música de fondo (libre de regalías)
- [ ] Sistema de estrellas por nivel (1-3 estrellas)
- [ ] Guardado de progreso con localStorage
- [ ] Pantalla de selección de niveles

---

## Fase 4 — Preparación mobile/app

**Estado:** Pendiente

- [ ] Optimizar experiencia táctil (gestos, feedback háptico si disponible)
- [ ] Optimizar rendimiento en móviles de gama baja
- [ ] PWA (Progressive Web App): icono, manifest, offline básico
- [ ] Evaluar conversión a app nativa con Capacitor
- [ ] Preparar assets para publicación en Google Play / App Store
- [ ] Testing en dispositivos reales (Android e iOS)

---

## Notas

- El roadmap puede reordenarse según las decisiones de diseño que vayan surgiendo.
- Cada fase debe producir algo jugable y verificable antes de avanzar a la siguiente.
- Mantener el código limpio y documentado en cada fase.
