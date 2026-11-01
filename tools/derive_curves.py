"""
Derive per-channel tone curves from measured film-scan statistics.

A film look is mostly (1) where black and white land per channel, (2) the
color cast neutrals pick up in shadows, mids and highlights, and (3) the
contrast of the grey scale. We measure (1) and (2) from real scans (see
docs/STRATEGY.md) and turn them into control points for the engine's r/g/b
curves, so neutrals render exactly with that cast.

Usage: python3 tools/derive_curves.py  -> prints TS curve objects.
"""
import json
import numpy as np

def to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def to_srgb(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)

def lin_to_oklab(c):
    r, g, b = c
    l = np.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b)
    m = np.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b)
    s = np.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b)
    return np.array([0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
                     1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
                     0.0259040371*l + 0.7827717662*m - 0.8086757660*s])

def oklab_to_lin(c):
    L, a, b = c
    l = (L + 0.3963377774*a + 0.2158037573*b) ** 3
    m = (L - 0.1055613458*a - 0.0638541728*b) ** 3
    s = (L - 0.0894841775*a - 1.2914855480*b) ** 3
    return np.array([4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
                     -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
                     -0.0041960863*l - 0.7034186147*m + 1.7076147010*s])

def derive(spec):
    """spec: black[3], white[3], tone[[in,out]...] for greys (sRGB),
    tints {shadow,mid,high}: Oklab (a,b) added to neutrals, chroma_gain: 1/(saturation) compensation."""
    gain = spec.get('chroma_gain', 1.0)
    pts = {'r': [], 'g': [], 'b': []}
    xs = [0.0] + [p[0] for p in spec['tone']] + [1.0]
    for x in xs:
        if x == 0.0:
            rgb = spec['black']
        elif x == 1.0:
            rgb = spec['white']
        else:
            y = dict(spec['tone'])[x]
            L = lin_to_oklab(to_lin([y, y, y]))[0]
            # Blend tints by lightness: shadows < 0.45 < mids < 0.75 < highs.
            t = spec['tints']
            if L < 0.6:
                k = np.clip((L - 0.3) / 0.3, 0, 1)
                ab = (1 - k) * np.array(t['shadow']) + k * np.array(t['mid'])
            else:
                k = np.clip((L - 0.6) / 0.25, 0, 1)
                ab = (1 - k) * np.array(t['mid']) + k * np.array(t['high'])
            rgb = to_srgb(oklab_to_lin([L, *(ab * gain)]))
        for i, ch in enumerate('rgb'):
            pts[ch].append([round(float(x), 3), round(float(rgb[i]), 3)])
    return {'master': [[0, 0], [1, 1]], **pts}

SPECS = {
    # Instant print: lifted cyan blacks, warm capped whites, flat.
    'instant': dict(black=[0.09, 0.135, 0.13], white=[0.915, 0.87, 0.825],
                    tone=[[0.2, 0.27], [0.46, 0.47], [0.75, 0.72]],
                    tints=dict(shadow=[-0.012, -0.002], mid=[-0.002, 0.009], high=[0.008, 0.011]), chroma_gain=1 / 0.6),
    # Overexposed compact on a lab scanner: milky cyan floor, bright mids.
    'bright': dict(black=[0.19, 0.24, 0.24], white=[1, 1, 0.99],
                   tone=[[0.2, 0.36], [0.46, 0.62], [0.75, 0.86]],
                   tints=dict(shadow=[-0.013, -0.006], mid=[-0.007, -0.002], high=[-0.003, -0.001]), chroma_gain=1 / 0.78),
    # Late sun: deep warm blacks, golden mids and highlights, contrasty.
    'golden': dict(black=[0.03, 0.03, 0.03], white=[0.99, 0.945, 0.88],
                   tone=[[0.2, 0.165], [0.46, 0.47], [0.75, 0.8]],
                   tints=dict(shadow=[0.004, 0.007], mid=[0.011, 0.018], high=[0.008, 0.026]), chroma_gain=1 / 1.1),
    # Summer street: olive-green shadows, slightly magenta highlights.
    'summer': dict(black=[0.05, 0.095, 0.035], white=[0.955, 0.91, 0.94],
                   tone=[[0.2, 0.2], [0.46, 0.5], [0.75, 0.79]],
                   tints=dict(shadow=[-0.02, 0.018], mid=[-0.003, 0.009], high=[0.011, -0.001]), chroma_gain=1 / 1.1),
}

if __name__ == '__main__':
    for name, spec in SPECS.items():
        print(name, json.dumps(derive(spec)))
