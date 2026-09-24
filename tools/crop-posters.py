#!/usr/bin/env python3
"""
Cut the interactive cockpit posters out of the reference publications.

The EPs page hangs click targets on a photograph of the panel, the way Primary's does. Primary's
poster images were cropped by hand once and have sat in public/images/ ever since; these two are
cut from documents that get reissued, so the crops are held here as data and re-run rather than
redone by eye.

Two sources, two different problems:

  * The T-44C poster is one 36x24" Illustrator sheet holding SIX discrete sub-panels. Whole, it
    is unreadable at any size a browser will show it. Each sub-panel crops out perfectly legible,
    so the page draws them separately and this script cuts them apart. It is vector, so it renders
    as sharply as asked; 200 dpi gives 7200x4800 and every region has pixels to spare.
    Only the panels the EPs actually touch are cut - four of the six. The overhead is lights,
    wiper and a placard; the oxygen panel carries supply pressure and gyro suction. No EP step
    names anything on either, and a region nothing can be clicked on is a region that teaches
    nothing.

    EVERY CUT IS A WHOLE SUB-PANEL. A crop that takes half a schematic is not allowed here, however
    much easier it makes a hotspot to hit: a student who has studied the real panel recognises it
    by its whole shape, and the spatial memory of where a switch sits among its neighbours is the
    thing the page exists to build. An earlier cut took the gear handle and the environmental
    group out of the middle of the main instrument panel, and what it taught was a panel that does
    not exist. The answer to a control too small to click is a bigger poster, not a smaller one.

  * The C172 poster is a drawing of the whole cockpit and is used whole - panel, both yokes and
    the pedestal, because all three carry controls the EPs name. It is the C172P, which is what
    NIFE flies: carburetted, so it has the carb heat knob left of the throttle that the injected
    172R has not, and it draws the floor-mounted fuel selector that a photograph of the panel
    cannot show.

Deliberately NOT part of tools/convert-images.py. That tool re-encodes what is already in
public/ and its contract is that it never resizes a PNG, because overlays are positioned against
natural dimensions. This derives new files from gitignored reference documents, which is a
different job with a different input.

Hotspot boxes are stored as FRACTIONS of each region image (see Flight/c172Poster.js), so
re-running this at a different resolution, or with a slightly different crop, does not invalidate
them - a crop change shifts them, a resolution change does not.

Usage:
    python tools/crop-posters.py --dry-run     # report only, write nothing
    python tools/crop-posters.py               # render, crop, write WebP
    python tools/crop-posters.py --only=quadrant

Requires Pillow and pdftoppm (poppler) on the PATH.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install Pillow")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "public", "images")
REF = os.path.join(REPO, "_reference-docs")

T44C_PDF = os.path.join(REF, "T44C Advanced", "Fundamental References",
                        "T44C Cockpit Poster 12-2021.pdf")
C172_SRC = os.path.join(REF, "C172 NIFE", "Fundamental References", "c172p poster.jpg")

# The page is rendered once at this and every region cut from it. The sheet is 2592x1728 pt, so
# 200 dpi is 7200x4800 - the narrowest region still has ~1500 px across before downscaling.
DPI = 200

# public/images/ is WebP q90, not q82: convert-images.py picks 90 there because the folder
# "holds cockpit panels and whiz-wheel faces - line art with fine printed text that softens at
# q82", which is exactly what these are.
QUALITY = 90

# No region is served wider or taller than this. The T-44C main panel is drawn at the full width
# of the page, 1125 CSS px before the page's own 0.8 transform, so it wants 1800 to stay sharp on
# a 2x display; every other region is a third of that wide and has pixels to spare at the same
# number. These are vector line art, so the file stays small either way.
LONG_EDGE = 1800

# Fractions of the source page: (left, top, right, bottom). Tuned by rendering the area over a
# grid and reading the panel's edges off it, not by eye - the sheet floats its panels on white
# with leader lines between them, so a box guessed generously carries a neighbour's corner into
# frame and one guessed tight clips a caption.
#
# Worth knowing before re-tuning `quadrant`: the figure does NOT caption the power levers. The
# vertical captions on the shafts are ELEVATOR TAB, PROP and CONDITION - and PROP reads "ROP"
# because a lever head is drawn over its first letter, which is the artwork rather than the crop.
# The power levers are the un-captioned pair carrying the REVERSE striping; no crop will produce a
# POWER label and the hotspot's own tooltip is what names them.
#
# `main` is the whole main instrument panel: glareshield and annunciator row, both PFDs and the
# engine gauges, and the lower sub-panel with the gear handle, the environmental group and the
# right-hand breaker stack. It is the biggest thing on the sheet at 2.16:1 and it is drawn at the
# full width of the page for that reason. Its smallest EP control - the two BLEED AIR VALVE
# toggles - is about six painted pixels across, so its target is drawn around the pair and their
# placard together. That is the cost of keeping the panel whole, and it is the right cost.
T44C_REGIONS = {
    "main":     (0.014, 0.074, 0.736, 0.580),   # the whole main instrument panel
    "quadrant": (0.246, 0.590, 0.468, 0.980),   # power quadrant / pedestal
    "fuel":     (0.026, 0.625, 0.251, 0.851),   # fuel control panel
    "elec":     (0.743, 0.449, 0.988, 0.944),   # start, electrical, radios and CB stack
}

# The C172P drawing is 1637x1355 and every part of it is wanted, so there is nothing to crop -
# panel, both yokes and the pedestal all carry controls the EPs name, and at 1637x1355 it is
# already under LONG_EDGE, so it is only re-encoded.
C172_BOX = None


def fit(im):
    """Downscale so the long edge is LONG_EDGE. Never upscale."""
    w, h = im.size
    scale = LONG_EDGE / max(w, h)
    if scale >= 1:
        return im
    return im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


def save(im, name, dry):
    path = os.path.join(OUT, name)
    im = fit(im)
    if dry:
        print(f"  would write {name:<24} {im.size[0]}x{im.size[1]}")
        return
    im.save(path, "WEBP", quality=QUALITY, method=6)
    print(f"  wrote {name:<24} {im.size[0]}x{im.size[1]}  {os.path.getsize(path) // 1024} KB")


def crop_t44c(only, dry):
    if only and only not in T44C_REGIONS:
        return
    if not os.path.exists(T44C_PDF):
        print(f"! missing {T44C_PDF}", file=sys.stderr)
        return
    if not shutil.which("pdftoppm"):
        sys.exit("pdftoppm (poppler) is required on the PATH")
    print(f"T-44C: rendering {os.path.basename(T44C_PDF)} at {DPI} dpi")
    with tempfile.TemporaryDirectory() as tmp:
        stem = os.path.join(tmp, "page")
        subprocess.run(
            ["pdftoppm", "-r", str(DPI), "-png", "-singlefile", T44C_PDF, stem],
            check=True, capture_output=True,   # poppler's font warnings on this sheet are noise
        )
        # load() before the temp directory goes away: Image.open is lazy and holds the file
        # open, which on Windows makes the cleanup fail with "used by another process".
        page = Image.open(stem + ".png")
        page.load()
        W, H = page.size
        print(f"  page {W}x{H}")
        for name, (l, t, r, b) in T44C_REGIONS.items():
            if only and only != name:
                continue
            box = (round(l * W), round(t * H), round(r * W), round(b * H))
            save(page.crop(box), f"t44c-{name}.webp", dry)


def crop_c172(only, dry):
    if only and only != "c172":
        return
    if not os.path.exists(C172_SRC):
        print(f"! missing {C172_SRC}", file=sys.stderr)
        return
    print(f"C172: converting {os.path.basename(C172_SRC)}")
    im = Image.open(C172_SRC).convert("RGB")
    save(im.crop(C172_BOX) if C172_BOX else im, "c172-panel.webp", dry)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    ap.add_argument("--only", metavar="REGION", help="one of: c172, " + ", ".join(T44C_REGIONS))
    args = ap.parse_args()

    if args.dry_run:
        print("DRY RUN - nothing is written\n")
    crop_c172(args.only, args.dry_run)
    crop_t44c(args.only, args.dry_run)


if __name__ == "__main__":
    main()
