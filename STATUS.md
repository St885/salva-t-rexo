# STATUS — Salva a T-REXo

**Versión actual:** v0.1.0
**Estado:** Primera versión jugable lista para despliegue
**Fecha:** 2026-06-08

---

## Funcionalidades incluidas

### Core Match-3
- Tablero 8×8 con 5 tipos de piezas
- Swipe/drag táctil + tap-tap
- Cascadas automáticas
- Shuffle automático si no hay movimientos válidos
- Sistema de puntuación (10 pts/pieza)
- Contador de movimientos (30 por nivel)

### Boosters
- Cohete horizontal/vertical — 4 en línea
- Bomba con onda expansiva — unión T/L
- Bola de color — 5 en línea, elimina un tipo entero
- Pterodáctilo ayudante — cuadrado 2×2, elimina pieza aleatoria
- Boosters iniciales aleatorios (modo debug, configurable)

### Objetivos y obstáculos
- Objetivo principal: romper 10 huevos fósiles
- Barra de progreso del objetivo
- Panel de objetivos visible en UI superior

### Visual y UX
- Fondo jurásico con mapa como marca de agua
- Efectos de explosión de bomba (flash + onda + shake del tablero)
- Tiles tipo gema con gradientes y gloss premium
- T-REXo companion con mensajes reactivos
- Overlay de victoria / derrota

---

## Limitaciones conocidas

- Solo 1 nivel implementado
- No hay audio
- Los boosters de inicio son para testing (flag `GameConfig.debug.startingBoosters`)
- No hay sistema de vidas ni continuaciones
- No hay guardado de progreso
- `background-attachment: fixed` no funciona en iOS Safari

---

## Próximos pasos recomendados

1. Desactivar boosters iniciales de prueba (`startingBoosters: false`)
2. Añadir al menos 2 niveles más con progresión de dificultad
3. Añadir efectos de sonido básicos
4. Sistema de niveles con pantalla de selección
5. Guardar progreso en localStorage
6. Optimizar rendimiento en Android gama baja
