# Migración a Mac — Salva a T-REXo

## 1. Requisitos en Mac
- Git
- Node.js LTS
- VS Code
- Claude Code (o extensión equivalente)
- Navegador Chrome/Safari

## 2. Clonar proyecto
```bash
git clone https://github.com/st885/salva-t-rexo.git
cd salva-t-rexo
```

## 3. Instalar dependencias
```bash
npm install
```

## 4. Ejecutar local
```bash
npm start
# o
npm run dev
```
Ambos ejecutan `npx serve . -p 3000`.

## 5. URL local
http://localhost:3000

## 6. Producción
https://st885.github.io/salva-t-rexo/

## 7. Archivos importantes
- `assets/videos/shark-trexo-chase.mp4` — video de la cinemática
- `src/cinematics/` — cinemáticas (video + fallback CSS)
- `styles/cinematic.css` — estilos de cinemática
- `src/config/gameConfig.js` — configuración y flags debug (todos en `false`)
- `docs/changelog.md` — historial de versiones
- `STATUS.md` — estado actual del proyecto

## 8. Antes de hacer push desde Mac
```bash
git status
git pull origin main
git add .
git commit -m "mensaje"
git push origin main
```

## 9. Configurar Git en Mac
```bash
git config --global user.name "Stefano Luis"
git config --global user.email "stefano.luisf@gmail.com"
```
