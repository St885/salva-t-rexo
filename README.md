# Salva a T-REXo

Un juego de puzzle **Match-3** mobile-first protagonizado por T-REXo, un pequeño dinosaurio carismático que necesita tu ayuda.

**No está basado ni copia activos de ningún juego comercial.**

---

## Estado actual — v0.1.0 Primera versión jugable

- [x] Tablero Match-3 8×8 funcional con swipe/drag y tap-tap
- [x] 4 boosters: cohete, bomba, bola de color, pterodáctilo
- [x] Objetivo de nivel: romper 10 huevos fósiles
- [x] T-REXo companion con mensajes reactivos
- [x] Efectos visuales premium + fondo jurásico
- [x] Responsive mobile-first
- [ ] Audio
- [ ] Múltiples niveles
- [ ] Guardado de progreso

---

## Stack

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura |
| CSS3 | Estilos mobile-first |
| JavaScript ES Modules | Lógica del juego |
| Sin frameworks | Vanilla puro |

---

## Cómo ejecutar localmente

```bash
cd 03_juegos/salva-t-rexo
npm run start
```

Abre: `http://localhost:3000`

> **Importante:** No abrir `index.html` directamente como archivo (`file://`) — los ES Modules requieren servidor HTTP.

### Alternativas

```bash
# Python
python -m http.server 3000

# VS Code — clic derecho en index.html → Open with Live Server
```

### Probar en móvil

1. Levanta el servidor local.
2. `ipconfig` → busca tu IP local.
3. En el móvil (misma WiFi): `http://TU-IP:3000`

---

## Despliegue en GitHub Pages

1. Push del código al branch `main`.
2. GitHub → Settings → Pages → Source: `main` / `/ (root)` → Save.
3. El juego estará en: `https://TU-USUARIO.github.io/salva-t-rexo/`

No requiere build — es un sitio estático puro.

---

Ver [docs/changelog.md](docs/changelog.md) · [docs/roadmap.md](docs/roadmap.md) · [STATUS.md](STATUS.md)
