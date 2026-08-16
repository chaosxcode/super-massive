#!/usr/bin/env python3
"""Remove the stray bright-violet flood from the mascot idle animation.

The pocket between the cat's right forearm/paw and his tail is filled with a
solid bright violet (~132,1,234) that should be empty background. The genuine
drop shadow is a *darker* purple (~78,4,148) that traces the silhouette, so the
two separate cleanly on blue channel: flood B>=230, shadow B<=150.

Only the flood is removed. The shadow, the dark-purple helmet visor (37,5,104)
and the purple chest hose are all well below the threshold and untouched.

CRITICAL: idle.webp is a 61-frame ANIMATED WebP. PIL's default save writes
frame 1 only, which looks like a huge size win while destroying the animation.
save_all/append_images/duration/loop are all mandatory here.
"""
import sys
import numpy as np
from PIL import Image

SRC = sys.argv[1]
DST = sys.argv[2]

# core flood: unmistakably the bright violet
CORE = dict(b_min=195, r_min=95, r_max=175, g_max=45)
# fringe: anti-aliased blend between the flood and whatever it abuts. Kept
# above the shadow's blue (149) so the drop shadow can never be caught.
FRINGE_B_MIN = 168


def neighbours(mask):
    """4-connected dilation by one pixel, without scipy."""
    out = mask.copy()
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


im = Image.open(SRC)
n = im.n_frames
frames, durations = [], []
removed_total = 0

for i in range(n):
    im.seek(i)
    a = np.array(im.convert('RGBA'))
    r, g, b, alpha = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int), a[..., 3].astype(int)

    core = (alpha > 8) & (b >= CORE['b_min']) & (r >= CORE['r_min']) & (r <= CORE['r_max']) & (g <= CORE['g_max'])
    # grow into the anti-aliased rim, but only onto pixels that are still
    # clearly violet-and-bright, never onto the outline or the drop shadow
    violet = (alpha > 8) & (b >= FRINGE_B_MIN) & (b > r + 40) & (g <= 70)
    kill = core.copy()
    for _ in range(3):
        kill = neighbours(kill) & (violet | core)

    removed_total += int(kill.sum())
    a[kill] = (0, 0, 0, 0)

    frames.append(Image.fromarray(a, 'RGBA'))
    durations.append(im.info.get('duration', 83))

frames[0].save(
    DST,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=im.info.get('loop', 0),
    lossless=True,
    quality=100,
    method=6,
    minimize_size=True,
)

check = Image.open(DST)
print(f'source frames {n} -> output frames {check.n_frames}')
print(f'pixels cleared: {removed_total}')
assert check.n_frames == n, 'FRAME COUNT CHANGED — animation destroyed'
