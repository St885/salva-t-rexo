#!/usr/bin/env python3
# tools/make_chase_video.py
# Genera assets/videos/shark-trexo-chase.mp4 — micro-cinemática en loop perfecto.
# 100% procedural (PIL): personajes/escena propios, sin assets de terceros.
# Render 2x (supersampling) -> downscale LANCZOS -> H.264 (ffmpeg de imageio).

import math, os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import imageio.v2 as imageio

# ── Config ──────────────────────────────────────────────────────────────
W, H   = 1280, 360
FPS    = 30
DUR    = 4.0
FRAMES = int(FPS * DUR)            # 120 -> render 0..119 (el 120 == 0 => loop perfecto)
SS     = 2                         # supersampling
SW, SH = W * SS, H * SS
TWO_PI = math.pi * 2

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'videos', 'shark-trexo-chase.mp4')
OUT = os.path.normpath(OUT)

# Opcional: imagen propia de T-REXo. Si existe, se usa en vez del dibujo procedural.
TREXO_ASSET_PATH = os.path.normpath(os.path.join(
    os.path.dirname(__file__), '..', 'assets', 'images', 'characters', 'trexo-run.png'))
TREXO_ASSET = None
try:
    if os.path.exists(TREXO_ASSET_PATH):
        TREXO_ASSET = Image.open(TREXO_ASSET_PATH).convert('RGBA')
except Exception:
    TREXO_ASSET = None

# ── Helpers de color / curvas ───────────────────────────────────────────
def lerp(a, b, t): return a + (b - a) * t
def smooth(t): return t * t * (3 - 2 * t)

def mix(c1, c2, t):
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))

def vgrad(w, h, stops):
    """Gradiente vertical. stops: [(pos0..1, (r,g,b)), ...]"""
    ys = np.linspace(0, 1, h)
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    col = np.zeros((h, 3))
    seg = 0
    for i, y in enumerate(ys):
        while seg < len(stops) - 2 and y > stops[seg + 1][0]:
            seg += 1
        p0, c0 = stops[seg]; p1, c1 = stops[seg + 1]
        t = 0 if p1 == p0 else (y - p0) / (p1 - p0)
        t = max(0, min(1, t))
        col[i] = [lerp(c0[k], c1[k], t) for k in range(3)]
    arr[:] = col[:, None, :].astype(np.uint8)
    return Image.fromarray(arr, 'RGB')

# ── Canvas con escalado (trabajo en coords finales, dibujo a 2x) ─────────
class Cv:
    def __init__(self, draw): self.d = draw
    def _p(self, pts): return [(x * SS, y * SS) for x, y in pts]
    def ellipse(self, cx, cy, rx, ry, fill):
        self.d.ellipse([(cx-rx)*SS, (cy-ry)*SS, (cx+rx)*SS, (cy+ry)*SS], fill=fill)
    def circle(self, cx, cy, r, fill): self.ellipse(cx, cy, r, r, fill)
    def poly(self, pts, fill): self.d.polygon(self._p(pts), fill=fill)
    def line(self, p0, p1, width, fill):
        self.d.line(self._p([p0, p1]), fill=fill, width=int(width*SS), joint='curve')
    def limb(self, p0, knee, p1, w, fill):
        self.line(p0, knee, w, fill); self.line(knee, p1, w*0.85, fill)
        for p, rr in ((p0, w/2), (knee, w*0.45), (p1, w*0.42)):
            self.circle(p[0], p[1], rr, fill)
    def arc(self, cx, cy, rx, ry, a0, a1, width, fill):
        self.d.arc([(cx-rx)*SS, (cy-ry)*SS, (cx+rx)*SS, (cy+ry)*SS], a0, a1, fill=fill, width=int(width*SS))

# ── Paleta (propia, tropical premium) ───────────────────────────────────
SKY  = [(0.0,(143,214,242)),(0.45,(178,231,223)),(0.62,(214,243,224)),(1.0,(255,233,194))]
SEA  = [(0.0,(63,196,210)),(0.35,(35,165,190)),(0.7,(16,108,134)),(1.0,(7,58,89))]
SAND_TOP=(247,224,160); SAND_BOT=(214,178,116)
MNT_FAR=(127,176,160); MNT_MID=(91,143,110)
PALM_DK=(18,74,40); PALM_LT=(31,122,66)
RX_DK=(46,152,88); RX_BODY=(86,224,136); RX_LT=(176,252,204); RX_BELLY=(222,253,232)
SK_DK=(22,36,62); SK_BODY=(43,82,146); SK_TOP=(55,102,173); SK_BELLY=(230,240,251)
FOAM=(244,251,255); WHITE=(255,255,255)

# ── Deterministic "random" para partículas (loop-safe) ──────────────────
def h01(i, s=1.0):
    return ((math.sin(i*12.9898 + s*78.233) * 43758.5453) % 1.0)

# ── Fondos en capas (tiles desplazables => parallax + loop perfecto) ─────
def _frond(cv, ox, oy, ang_deg, length, droop, col):
    a = math.radians(ang_deg)
    dx, dy = math.cos(a), math.sin(a)
    tipx, tipy = ox + dx*length, oy + dy*length + droop
    px, py = -dy, dx                      # perpendicular
    w = length*0.16
    mx, my = (ox+tipx)/2, (oy+tipy)/2 - 2
    cv.poly([(ox+px*w, oy+py*w), (mx+px*w*0.6, my+py*w*0.6), (tipx, tipy),
             (mx-px*w*0.6, my-py*w*0.6), (ox-px*w, oy-py*w)], col)

def palm(cv, x, base, s, trunk, leaf):
    # tronco curvado (cono)
    top = (x - 7*s, base - 54*s)
    L, R = [], []
    for i in range(7):
        tt = i/6
        bx = lerp(x, top[0], tt) + math.sin(tt*1.5)*3*s
        by = lerp(base, top[1], tt)
        wd = lerp(4.5*s, 2.4*s, tt)
        L.append((bx-wd, by)); R.append((bx+wd, by))
    cv.poly(L + R[::-1], trunk)
    tx, ty = top
    # cocos
    cv.circle(tx-3, ty+3, 3.2*s, (150,110,60))
    cv.circle(tx+4, ty+4, 3.0*s, (120,86,46))
    # hojas que caen
    for ang in (-165,-128,-92,-52,-18,22):
        _frond(cv, tx, ty, ang, 30*s, 13*s, leaf)
    for ang in (-145,-70,0):
        _frond(cv, tx, ty, ang, 22*s, 9*s, mix(leaf,(255,255,255),0.18))
    cv.circle(tx, ty, 4*s, leaf)

def mountain_layer(cv, off, baseY, height, col, period, count):
    x = -period + (off % period)
    while x < W + period:
        cv.poly([(x, baseY),(x+period*0.5, baseY-height),(x+period, baseY)], col)
        x += period

# ── Personajes ──────────────────────────────────────────────────────────
RX_SPOT = (60, 178, 106)

class ScaledCv:
    """Envuelve Cv y escala todo el dibujo respecto a un pivote (px,py)."""
    def __init__(self, cv, px, py, s): self.cv=cv; self.px=px; self.py=py; self.s=s
    def _x(self, x): return self.px + (x-self.px)*self.s
    def _y(self, y): return self.py + (y-self.py)*self.s
    def _p(self, p): return (self._x(p[0]), self._y(p[1]))
    def ellipse(self,cx,cy,rx,ry,f): self.cv.ellipse(self._x(cx),self._y(cy),rx*self.s,ry*self.s,f)
    def circle(self,cx,cy,r,f): self.cv.circle(self._x(cx),self._y(cy),r*self.s,f)
    def poly(self,pts,f): self.cv.poly([self._p(p) for p in pts], f)
    def line(self,p0,p1,w,f): self.cv.line(self._p(p0),self._p(p1),w*self.s,f)
    def limb(self,p0,k,p1,w,f): self.cv.limb(self._p(p0),self._p(k),self._p(p1),w*self.s,f)
    def arc(self,cx,cy,rx,ry,a0,a1,w,f): self.cv.arc(self._x(cx),self._y(cy),rx*self.s,ry*self.s,a0,a1,w*self.s,f)

def _taper(cv, pts, widths, fill):
    """Banda suave a lo largo de una polilínea (offset vertical por ancho)."""
    top = [(x, y - w/2) for (x, y), w in zip(pts, widths)]
    bot = [(x, y + w/2) for (x, y), w in zip(pts, widths)]
    cv.poly(top + bot[::-1], fill)
    for (x, y), w in zip(pts, widths):
        cv.circle(x, y, w/2, fill)

def _trexo_leg(cv, hip, knee, ankle, foot_x, foot_y, w, c_dk, c_md, swing):
    """Pata fuerte: muslo grueso -> espinilla -> pie con 3 garras."""
    _taper(cv, [hip, knee, ankle], [w, w*0.72, w*0.5], c_dk)
    _taper(cv, [hip, knee, ankle], [w*0.7, w*0.5, w*0.34], c_md)
    cv.ellipse(hip[0], hip[1], w*0.6, w*0.5, c_md)   # muslo con volumen
    # pie
    cv.poly([(foot_x-6, foot_y-6),(foot_x+16, foot_y-6),(foot_x+18, foot_y),
             (foot_x-6, foot_y)], c_dk)
    for k in range(3):                               # garras
        gx = foot_x + 2 + k*7
        cv.poly([(gx, foot_y),(gx+5, foot_y),(gx+2.5, foot_y+6)], (74,58,42))

def draw_trexo(cv, cx, cy, ph):
    """T-REXo cartoon premium corriendo a la derecha. ph: fase de zancada."""
    bounce = abs(math.sin(ph)) * 8
    cy -= bounce
    lean = math.sin(ph*2) * 2
    head_bob = math.sin(ph*2 + 0.5) * 4
    legA = math.sin(ph)              # pierna cercana
    legB = math.sin(ph + math.pi)    # pierna lejana
    arm  = math.sin(ph + 0.8) * 5
    foot = cy + 70
    tw   = math.sin(ph + 0.6)        # meneo de cola (amplitud mayor)

    # ── COLA larga y gruesa (detrás del cuerpo, meneo visible) ──
    tail = [(cx-40, cy+8), (cx-88, cy+4+tw*8), (cx-132, cy-10+tw*14),
            (cx-168, cy-30+tw*20)]
    _taper(cv, tail, [40, 30, 18, 6], RX_DK)
    _taper(cv, [(cx-40,cy+6),(cx-88,cy+1+tw*8),(cx-132,cy-13+tw*14)],
           [26, 18, 9], RX_BODY)
    cv.ellipse(cx-78, cy-2+tw*8, 18, 7, RX_LT)   # highlight en la cola

    # ── PIERNA LEJANA (más separada para sensación de carrera) ──
    _trexo_leg(cv, (cx-18, cy+24), (cx-26+legB*14, cy+48),
               (cx-34+legB*26, cy+64), cx-42+legB*30, foot+legB*6,
               26, mix(RX_DK,(0,0,0),0.10), mix(RX_BODY,RX_DK,0.30), legB)

    # ── CUERPO robusto con volumen ──
    cv.ellipse(cx, cy, 74, 56, RX_DK)            # borde/rim
    cv.ellipse(cx-1, cy-1, 70, 52, RX_BODY)
    cv.ellipse(cx-5, cy+2, 60, 45, RX_LT)
    cv.ellipse(cx+4, cy+20, 50, 30, RX_BELLY)    # vientre claro
    cv.ellipse(cx-20, cy-24, 34, 17, (206,255,224))  # highlight lomo
    cv.ellipse(cx+20, cy-18, 18, 9, (200,255,220))   # highlight 2
    # manchas suaves en el lomo
    for sx, sy, sr in [(-30,-22,9),(-6,-28,8),(20,-22,7),(-42,-8,7)]:
        cv.ellipse(cx+sx, cy+sy, sr, sr*0.7, RX_SPOT)

    # ── BRAZO corto típico de T-Rex (sobre el pecho) ──
    cv.limb((cx+34, cy+6), (cx+44, cy+16+arm), (cx+50, cy+24+arm), 8, RX_DK)
    cv.limb((cx+34, cy+6), (cx+44, cy+16+arm), (cx+50, cy+24+arm), 5, RX_LT)
    for dy in (-2, 2, 6):                         # garritas
        cv.poly([(cx+50, cy+22+arm+dy),(cx+56, cy+23+arm+dy),
                 (cx+51, cy+25+arm+dy)], (74,58,42))

    # ── PIERNA CERCANA (más separada / zancada amplia) ──
    _trexo_leg(cv, (cx+26, cy+26), (cx+34+legA*16, cy+52),
               (cx+40+legA*28, cy+66), cx+34+legA*32, foot+legA*6,
               30, RX_DK, RX_BODY, legA)

    # ── CUELLO corto + CABEZA grande (mira a la derecha) ──
    nx, ny = cx+74 + lean, cy - 40 + head_bob
    _taper(cv, [(cx+40, cy-14),(cx+58, cy-28),(nx-8, ny+10)], [40, 36, 34], RX_DK)
    _taper(cv, [(cx+40, cy-14),(cx+58, cy-28),(nx-8, ny+10)], [30, 27, 25], RX_BODY)
    cv.ellipse(nx, ny, 42, 36, RX_DK)            # rim cabeza
    cv.ellipse(nx-1, ny-1, 39, 33, RX_BODY)
    cv.ellipse(nx-4, ny+1, 33, 27, RX_LT)
    cv.ellipse(nx-10, ny-13, 20, 11, (208,255,226))  # highlight cabeza
    # cresta/ceño sobre el ojo
    cv.ellipse(nx+8, ny-20, 16, 8, RX_BODY)

    # ── HOCICO definido + mandíbula semiabierta ──
    open_amt = 8 + abs(math.sin(ph)) * 5
    # mandíbula superior
    cv.poly([(nx+20, ny-14),(nx+58, ny-8),(nx+62, ny+2),(nx+22, ny+4)], RX_DK)
    cv.poly([(nx+20, ny-12),(nx+56, ny-7),(nx+59, ny),(nx+22, ny+2)], RX_BODY)
    cv.ellipse(nx+50, ny-9, 6, 4, RX_LT)
    cv.circle(nx+56, ny-9, 2.2, (30,90,55))      # fosa nasal
    # boca interior
    cv.poly([(nx+22, ny+3),(nx+60, ny+1),(nx+60, ny+open_amt),
             (nx+24, ny+open_amt+2)], (120,40,46))
    # mandíbula inferior
    cv.poly([(nx+24, ny+open_amt),(nx+58, ny+open_amt-2),
             (nx+56, ny+open_amt+9),(nx+24, ny+open_amt+10)], RX_DK)
    cv.poly([(nx+25, ny+open_amt+1),(nx+55, ny+open_amt-1),
             (nx+53, ny+open_amt+7),(nx+26, ny+open_amt+8)], RX_LT)
    # dientes pequeños (arriba y abajo)
    for k in range(5):
        ux = nx + 26 + k*7
        cv.poly([(ux, ny+3),(ux+4, ny+3),(ux+2, ny+8)], WHITE)
        cv.poly([(ux+1, ny+open_amt),(ux+5, ny+open_amt),(ux+3, ny+open_amt-5)], (240,245,235))

    # ── OJO grande expresivo (susto divertido) ──
    cv.circle(nx+12, ny-6, 16, WHITE)
    cv.circle(nx+12, ny-6, 16, WHITE)
    cv.ellipse(nx+15, ny-4, 9, 11, (18,42,26))   # iris/pupila
    cv.circle(nx+18, ny-8, 3.4, WHITE)           # brillo grande
    cv.circle(nx+12, ny-2, 1.6, (255,255,255))   # brillo pequeño
    cv.arc(nx+10, ny-18, 16, 12, 205, 335, 4, (16,38,24))  # ceja preocupada

def draw_shark(cv, cx, cy, ph, lunge, scale=1.0):
    """cx,cy: centro del cuerpo emergiendo. lunge 0..1: cuánto sale del agua."""
    rise = lunge * 14 * scale
    cy -= rise
    ang = math.radians(-20 - lunge*8)             # nariz hacia arriba-derecha
    ca, sa = math.cos(ang), math.sin(ang)
    def R(dx, dy):
        dx *= scale; dy *= scale
        return (cx + dx*ca - dy*sa, cy + dx*sa + dy*ca)
    tw = math.sin(ph)*16
    # cola
    cv.poly([R(-72,0),R(-104,-26+tw),R(-112,-16+tw),R(-96,0),R(-112,16+tw),R(-104,26+tw)], SK_BODY)
    # aleta dorsal
    cv.poly([R(-6,-30),R(10,-58),R(24,-28)], SK_DK)
    # cuerpo
    pts=[R(-78,0)]
    for a in range(-90,91,15):
        rr=72 if abs(a)<60 else 56
        pts.append(R(rr*math.cos(math.radians(a))-6, rr*math.sin(math.radians(a))*0.5))
    cv.poly(pts, SK_BODY)
    cv.ellipse(*R(-6,-2), 70, 34, SK_BODY) if False else None
    cv.poly([R(-60,-6),R(40,-22),R(58,-2),R(-58,6)], SK_TOP)   # lomo
    cv.poly([R(-58,8),R(40,20),R(60,4),R(-56,14)], SK_BELLY)   # vientre
    # aleta pectoral
    cv.poly([R(8,18),R(34,40),R(40,16)], SK_DK)
    # cabeza + boca abierta cartoon
    gap = 12 + lunge*10
    cv.poly([R(46,-12),R(78,-6),R(80,-2),R(50,2)], SK_BODY)    # morro superior
    cv.poly([R(50,gap-2),R(80,gap-6),R(80,gap+2),R(48,gap+8)], SK_BODY)  # mandíbula
    cv.poly([R(48,2),R(80,-2),R(80,gap-6),R(50,gap-2)], SK_DK) # interior boca
    # dientes
    for k in range(4):
        cv.poly([R(54+k*7,1),R(58+k*7,1),R(56+k*7,8)], WHITE)
        cv.poly([R(55+k*7,gap-1),R(59+k*7,gap-1),R(57+k*7,gap-8)], (236,242,250))
    # ojo
    ex,ey=R(40,-10)
    cv.circle(ex,ey,8,WHITE); cv.circle(ex+1.5,ey+1.5,4.5,(6,8,16)); cv.circle(ex+3,ey,1.5,WHITE)
    cv.arc(ex,ey-7,9,8,200,340,3,(8,14,28))
    cv.poly([R(20,-8),R(20,8)], SK_DK) if False else None
    cv.line(R(18,-10),R(18,12),3,(28,52,98)); cv.line(R(30,-10),R(30,12),2.4,(28,52,98))  # branquias

# ── Render de un frame ──────────────────────────────────────────────────
SKY_IMG  = vgrad(SW, SH, SKY)
SEA_IMG  = vgrad(SW, SH, SEA)
SAND_IMG = vgrad(SW, SH, [(0,SAND_TOP),(1,SAND_BOT)])

WATER_TOP = 168
SHORE_Y   = 262

# burbujas (x fijo, fase fija) -> loop-safe
# sp entero (1 ó 2 vueltas / loop) => burbujas loop-safe
BUBBLES = [(h01(i,2)*900+120, 1 + (i % 2), h01(i,9)) for i in range(26)]

def make_frame(fi):
    t = fi / FRAMES
    ph2 = TWO_PI * t
    stride = TWO_PI * t * 6          # 6 zancadas / loop
    img = SKY_IMG.copy()
    base = Image.new('RGBA', (SW, SH), (0,0,0,0))
    cv = Cv(ImageDraw.Draw(base))

    # sol
    cv.circle(1030 + math.sin(ph2)*4, 64, 34, (255,246,200))
    cv.circle(1030 + math.sin(ph2)*4, 64, 22, (255,236,150))
    # montañas parallax (scroll = entero * periodo => loop perfecto)
    mountain_layer(cv, -t*360,  WATER_TOP+4, 78,  MNT_FAR, 360, 0)   # k=1
    mountain_layer(cv, -t*600,  WATER_TOP+6, 58,  MNT_MID, 300, 0)   # k=2 (más rápido)
    # selva (palmeras) parallax cercano: scroll = 3 * 260
    px = -(t*780) % 260
    x = px - 260
    while x < W + 220:
        palm(cv, x+55,  WATER_TOP+8, 1.0, (96,66,40),  PALM_DK)
        palm(cv, x+170, WATER_TOP+4, 0.78,(120,84,50), PALM_LT)
        x += 260
    base_img = Image.alpha_composite(img.convert('RGBA'), base)

    # ── agua (banda) ──
    sea = SEA_IMG.crop((0, WATER_TOP*SS, SW, (SHORE_Y+30)*SS)).convert('RGBA')
    base_img.paste(sea, (0, WATER_TOP*SS), sea)

    ov = Image.new('RGBA', (SW, SH), (0,0,0,0))
    cv = Cv(ImageDraw.Draw(ov))
    # destellos de agua (scroll = 2*W => loop perfecto)
    for i in range(40):
        sx = (h01(i,3)*W - t*W*2) % W
        sy = WATER_TOP + 10 + h01(i,7)*78
        a = int(120 + 110*math.sin(ph2*2 + i))
        if a > 90:
            cv.ellipse(sx, sy, 7, 1.6, (220,245,255))
    # olas: ondas viajeras, frecuencia entera de ciclos / loop
    for L,(yy,amp,col,wd,cyc) in enumerate([(WATER_TOP+20,5,(120,220,225),2,3),
                                            (WATER_TOP+48,6,(70,185,200),3,4),
                                            (SHORE_Y-14,7,(40,150,175),3,5)]):
        prev=None
        for xx in range(0, W+8, 8):
            yv = yy + math.sin(xx/46 + L - ph2*cyc)*amp
            if prev: cv.line(prev,(xx,yv),wd,col)
            prev=(xx,yv)

    # ── tiburón (en el agua, detrás) — más grande, más cerca, amenazante ──
    lunge = (math.sin(ph2)*0.5+0.5)
    SHARK_X = 500 + math.sin(ph2)*14
    SHARK_Y = 222
    # estela en V detrás del tiburón (agua activa)
    for k in range(4):
        wlen = 70 + k*26
        wy = 248 + k*5
        cv.line((SHARK_X-20, SHARK_Y+22), (SHARK_X-20-wlen, wy), 2, (210,238,248))
        cv.line((SHARK_X-20, SHARK_Y+22), (SHARK_X-20-wlen, 2*(SHARK_Y+22)-wy), 2, (210,238,248))
    draw_shark(cv, SHARK_X, SHARK_Y, ph2, lunge, scale=1.34)

    base_img = Image.alpha_composite(base_img, ov)

    # ── espuma de orilla + splash (delante del tiburón) ──
    fo = Image.new('RGBA', (SW, SH), (0,0,0,0))
    cv = Cv(ImageDraw.Draw(fo))
    prev=None
    for xx in range(0, W+8, 8):
        yv = SHORE_Y + math.sin(xx/40 - ph2*4)*6
        if prev: cv.line(prev,(xx,yv),5,FOAM)
        prev=(xx,yv)
    for i in range(34):
        bx=(h01(i,4)*W - t*W) % W           # scroll = 1*W
        by=SHORE_Y + math.sin(bx/40 - ph2*4)*6 - 2 - h01(i,6)*4
        cv.circle(bx, by, 2+h01(i,8)*2.2, FOAM)
    # splash alrededor del tiburón segun lunge (rotación entera de 360°)
    sx = 500 + math.sin(ph2)*14
    for k in range(14):
        a=math.radians(k*(360/14) + t*360)
        rad=24+lunge*46
        cv.circle(sx+math.cos(a)*rad, 250+math.sin(a)*rad*0.5, 4+lunge*5, (250,253,255))
    # estela de burbujas detrás del tiburón
    for i in range(14):
        prog=(t*2 + i/14) % 1.0
        wx = sx-34 - prog*150
        wy = 250 + math.sin(i*1.7)*9 - prog*6
        cv.circle(wx, wy, 2+prog*4, (236,248,255, int(190*(1-prog))))
    # burbujas que suben (loop-safe)
    for bx, sp, ph in BUBBLES:
        prog=(t*sp + ph) % 1.0
        by=SHORE_Y - prog*64
        al=255 if prog<0.7 else int(255*(1-(prog-0.7)/0.3))
        r=2+ (1-prog)*3
        cv.circle(bx, by, r, (220,245,255))
    base_img = Image.alpha_composite(base_img, fo)

    # ── playa (arena) franja frontal ──
    sand = SAND_IMG.crop((0, (SHORE_Y-2)*SS, SW, SH)).convert('RGBA')
    base_img.paste(sand, (0, (SHORE_Y-2)*SS), sand)

    # ── T-REXo (protagonista, delante) ──
    rexx, rexy = 858, 282
    bounce = abs(math.sin(stride)) * 8
    GROUND = 352
    # sombra de contacto suave (difuminada, pulsa con el bote)
    sh = Image.new('RGBA', (SW, SH), (0,0,0,0))
    Cv(ImageDraw.Draw(sh)).ellipse(rexx-4, GROUND, 84 - bounce*1.4, 13 - bounce*0.5, (38,26,14,110))
    sh = sh.filter(ImageFilter.GaussianBlur(5*SS))
    Cv(ImageDraw.Draw(sh)).ellipse(rexx+8, GROUND, 30, 7, (30,20,10,130))  # contacto pie
    base_img = Image.alpha_composite(base_img, sh)

    # ── FX persecución detrás de T-REXo (velocidad + polvo de arena) ──
    cf = Image.new('RGBA', (SW, SH), (0,0,0,0)); cvf = Cv(ImageDraw.Draw(cf))
    for i in range(6):                                   # líneas de velocidad
        prog=(t*2 + i/6) % 1.0
        lx = rexx-48 - prog*170
        ly = rexy-26 + (i*13 - 32)
        cvf.line((lx,ly),(lx-24-i*3,ly), 3, (255,255,255, int(140*(1-prog))))
    for i in range(6):                                   # polvo/arena tras las patas
        prog=(t*6 + i/6) % 1.0                            # 6 = zancadas/loop
        dx = rexx-18 - prog*78
        dy = GROUND - 2 - prog*16
        cvf.circle(dx, dy, 4+prog*11, (224,198,150, int(150*(1-prog))))
    base_img = Image.alpha_composite(base_img, cf)

    txd = Image.new('RGBA', (SW, SH), (0,0,0,0))
    if TREXO_ASSET is not None:
        # OPCIÓN A: usar imagen propia (object-fit contain, corre con bote)
        aw = 300; ah = int(aw * TREXO_ASSET.height / TREXO_ASSET.width)
        a = TREXO_ASSET.resize((aw*SS, ah*SS), Image.LANCZOS)
        txd.alpha_composite(a, ((rexx-aw//2)*SS, int((rexy-ah//2 - bounce)*SS)))
    else:
        # OPCIÓN B: T-REXo dibujado, +15% escalado desde el suelo (protagonista)
        draw_trexo(ScaledCv(Cv(ImageDraw.Draw(txd)), rexx, GROUND, 1.15), rexx, rexy, stride)
    base_img = Image.alpha_composite(base_img, txd)

    # viñeta + grano de luz premium
    vig = Image.new('L', (W, H), 0)
    vg = ImageDraw.Draw(vig)
    vg.ellipse([-W*0.2, -H*0.4, W*1.2, H*1.5], fill=60)
    vig = vig.filter(ImageFilter.GaussianBlur(60))
    dark = Image.new('RGBA', (W, H), (4,18,30,255))
    base_small = base_img.resize((W, H), Image.LANCZOS).convert('RGBA')
    base_small = Image.composite(base_small, Image.alpha_composite(base_small, dark),
                                 vig.point(lambda v: 255-v))
    return np.asarray(base_small.convert('RGB'))

# ── Encode ───────────────────────────────────────────────────────────────
def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    print(f'Render {FRAMES} frames @ {W}x{H} (SS={SS}) -> {OUT}')
    writer = imageio.get_writer(
        OUT, fps=FPS, codec='libx264', quality=9, macro_block_size=8,
        ffmpeg_params=['-pix_fmt','yuv420p','-profile:v','high','-crf','19','-movflags','+faststart'])
    for fi in range(FRAMES):
        writer.append_data(make_frame(fi))
        if fi % 20 == 0: print(f'  frame {fi}/{FRAMES}')
    writer.close()
    mb = os.path.getsize(OUT)/1e6
    print(f'OK -> {OUT}  ({mb:.2f} MB)')

if __name__ == '__main__':
    main()
