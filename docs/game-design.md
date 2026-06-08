# Game Design — Salva a T-REXo

## Visión del juego

"Salva a T-REXo" es un juego de puzzle casual Match-3 mobile-first con identidad propia. El jugador acompaña a T-REXo, un pequeño dinosaurio carismático, a través de situaciones de rescate resolviendo tableros de piezas de colores.

El juego apunta a ser accesible, colorido y satisfactorio, con sesiones cortas de 2-5 minutos por nivel, ideal para móviles.

---

## Personaje principal: T-REXo

- **Nombre:** T-REXo
- **Especie:** Dinosaurio (T-Rex estilizado, amigable y pequeño)
- **Personalidad:** curioso, valiente, algo torpe pero simpático
- **Rol narrativo:** protagonista que necesita ser rescatado o ayudado en cada nivel
- **Visual:** emoji 🦕 como placeholder; ilustración original en fases posteriores

T-REXo reacciona visualmente a las acciones del jugador: se alegra con combinaciones grandes, se preocupa cuando quedan pocos movimientos, celebra al completar un nivel.

---

## Género

**Match-3 casual puzzle** — el jugador intercambia piezas adyacentes en un tablero para formar líneas de 3 o más del mismo tipo. Las piezas se eliminan y caen nuevas desde arriba.

---

## Público objetivo

- **Edad:** 8 años en adelante (sin límite superior)
- **Plataforma principal:** móvil (Android/iOS) vía navegador web o app futura
- **Jugador casual:** sesiones cortas, sin necesidad de conocimiento previo
- **Familia:** apto para todas las edades

---

## Mecánicas principales

### Núcleo Match-3
- Tablero de 8x8 piezas
- 6 tipos de piezas (colores distintos con identidad propia)
- Intercambio de piezas adyacentes (arriba, abajo, izquierda, derecha)
- Combinaciones mínimas de 3 piezas en línea (horizontal o vertical)
- Las piezas combinadas se eliminan; las de arriba caen para llenar el hueco
- Si el tablero queda sin movimientos válidos: reorganización automática

### Movimientos limitados
- Cada nivel tiene un número fijo de movimientos
- El jugador debe cumplir el objetivo antes de agotar los movimientos
- Sin movimientos restantes = derrota

### Objetivos por nivel
- Cada nivel define qué tipos de piezas recolectar y cuántas
- Ejemplo: "Recolecta 10 piezas rojas" en 20 movimientos
- Futuros objetivos: eliminar obstáculos, recolectar piezas especiales, liberar a T-REXo

### Narrativa de rescate
- Cada nivel presenta brevemente a T-REXo en una situación de apuro
- Al completar el tablero, T-REXo es rescatado con una animación de celebración
- Las situaciones son ligeras y humorísticas, sin violencia

---

## Diferencias frente a juegos comerciales

| Aspecto | Referencia comercial | Salva a T-REXo |
|---|---|---|
| Personaje | Personajes licenciados | T-REXo: personaje original |
| Assets | Arte y música propios del juego | Arte original o libre de regalías |
| Mecánica base | Match-3 (género libre) | Match-3 con identidad propia |
| Monetización | Vidas, boosters pagos | Sin modelo de monetización definido (indie/personal) |
| Plataforma inicial | App nativa | Web mobile-first, app posible después |

**No se copia, imita ni redistribuye ningún asset, nombre, personaje ni diseño de juegos comerciales.**

---

## Tipos de piezas (v0.0.1)

| Nombre | Color | Código hex |
|---|---|---|
| Rojo | Rojo cálido | `#e63946` |
| Naranja | Naranja | `#f4a261` |
| Verde | Verde selva | `#2a9d8f` |
| Azul | Azul océano | `#457b9d` |
| Celeste | Azul cielo | `#a8dadc` |
| Amarillo | Amarillo dorado | `#ffd60a` |

---

## Objetivo del primer MVP (Fase 1)

Un nivel jugable completo con:
- Tablero 8x8 funcional
- Intercambio de piezas con touch y mouse
- Detección de combinaciones de 3+
- Eliminación y caída de piezas
- Contador de movimientos visible
- Un objetivo simple (ej. "recolecta 10 piezas rojas")
- Pantalla de victoria y derrota
