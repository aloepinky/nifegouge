#!/usr/bin/env python3
"""
Re-encode the site's PNG photos as WebP and archive the originals.

Every photo under public/ was saved as lossless PNG, and the systems diagram photos
additionally carry a fully-opaque alpha channel they never use — together that is ~32 MB
of assets, all of which Netlify copies into every deploy. WebP at native resolution cuts
that by ~92% with no visible difference.

Deliberately does NOT resize. TW4Cockpit.js and WhizWheel.js position overlays and
rotations against these images' natural dimensions, and native-resolution WebP already
captures almost all of the saving.

Usage:
    python tools/convert-images.py --dry-run     # report only, touch nothing
    python tools/convert-images.py               # convert, then archive the PNGs

Requires Pillow.
"""

import argparse
import io
import os
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install Pillow")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(REPO, "public")
ARCHIVE = os.path.join(REPO, "_original-images")

# Quality by content type. The systems photos are camera images shown at maxHeight 300,
# so q82 is invisible. public/images/ holds cockpit panels and whiz-wheel faces — line art
# with fine printed text that softens at q82, so those get q90.
QUALITY = {"systems": 82, "images": 90}

# PWA manifest icons and the CTAF chart are referenced by manifest.json / index.html and
# are already small; leaving them as PNG keeps those references valid.
SKIP = {"logo192.png", "logo512.png", "ctaf.png"}

# public/images/ also holds ~18 small UI icons (dot, sock, tetra, thumb, arrows …). They add
# up to well under 100 KB, several are already smaller than the WebP encoder's own overhead
# — verti.png actually grows 124% — and each one converted is another filename to chase
# through src/. Not worth the breakage risk, so anything under this stays PNG.
MIN_BYTES = 40_000


def targets():
    """PNGs under public/ worth converting, as (abs_path, rel_path_from_public)."""
    for root, _dirs, files in os.walk(PUBLIC):
        for name in sorted(files):
            if not name.lower().endswith(".png") or name in SKIP:
                continue
            src = os.path.join(root, name)
            if os.path.getsize(src) < MIN_BYTES:
                continue
            yield src, os.path.relpath(src, PUBLIC)


def quality_for(rel):
    top = rel.replace("\\", "/").split("/")[0]
    return QUALITY.get(top, 82)


def saved_pct(new, old):
    return 100 - (100 * new / old) if old else 0


def convert(src, quality, dry_run):
    """Encode src as WebP, writing it beside src unless dry_run.

    Returns (old_bytes, new_bytes, kept_alpha). Always encodes to memory first so the
    dry-run figure is provably the exact bytes a real run would write.
    """
    im = Image.open(src)
    old = os.path.getsize(src)

    # Keep alpha only where it actually does something. The systems photos are RGBA with a
    # fully-opaque alpha channel — dropping it is free. The cockpit and whiz-wheel art has
    # real transparency and must keep it, which is why these go to WebP and not JPEG.
    if im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info:
        im = im.convert("RGBA")
        # getextrema() on the RGBA image reads the alpha band's minimum directly;
        # getchannel("A") would copy a full-size band just to ask the same question.
        keep_alpha = im.getextrema()[-1][0] < 255
    else:
        keep_alpha = False

    out_im = im if keep_alpha else im.convert("RGB")
    buf = io.BytesIO()
    out_im.save(buf, "WEBP", quality=quality, method=6)

    if not dry_run:
        with open(os.path.splitext(src)[0] + ".webp", "wb") as fh:
            fh.write(buf.getvalue())
    return old, buf.tell(), keep_alpha


def archive(src, rel):
    """Move the original PNG into _original-images/, preserving its subpath."""
    dst = os.path.join(ARCHIVE, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(src, dst)


def still_referenced(rel):
    """True if any file under src/ still points at this PNG.

    Archiving moves the original into a gitignored directory, so archiving one that src/
    still references would leave a 404 in production with no copy left in git. The script
    can't rewrite the references safely (they're hand-written string literals), so it
    refuses to archive instead of trusting the operator to have done it.
    """
    needle = "/" + rel.replace(os.sep, "/")
    for root, _dirs, files in os.walk(os.path.join(REPO, "src")):
        for name in files:
            with open(os.path.join(root, name), encoding="utf-8", errors="ignore") as fh:
                if needle in fh.read():
                    return True
    return False


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true",
                    help="report the savings without writing or moving anything")
    args = ap.parse_args()

    files = list(targets())
    if not files:
        sys.exit("No PNGs found under public/ — already converted?")

    print(f"{'file':44} {'quality':>7} {'alpha':>5} {'before':>9} {'after':>9} {'saved':>7}")
    print("-" * 88)

    tot_old = tot_new = 0
    grew = []
    for src, rel in files:
        q = quality_for(rel)
        old, new, keep_alpha = convert(src, q, args.dry_run)
        # A WebP that came out bigger than its PNG is a loss — flag it rather than ship it.
        if new >= old:
            grew.append(rel)
        tot_old += old
        tot_new += new
        pct = saved_pct(new, old)
        print(f"{rel.replace(os.sep, '/'):44} {q:>7} {'yes' if keep_alpha else '-':>5} "
              f"{old/1024:8.0f}K {new/1024:8.0f}K {pct:6.1f}%")

    print("-" * 88)
    saved = saved_pct(tot_new, tot_old)
    print(f"{'TOTAL':44} {'':>7} {'':>5} {tot_old/1024/1024:7.2f}MB "
          f"{tot_new/1024/1024:7.2f}MB {saved:6.1f}%")

    if grew:
        print("\nWARNING — WebP came out no smaller for: " + ", ".join(grew))

    if args.dry_run:
        print("\n(dry run — nothing written; re-run without --dry-run to apply)")
        return

    held = [rel for _src, rel in files if still_referenced(rel)]
    for src, rel in files:
        if rel not in held:
            archive(src, rel)

    print(f"\n{len(files) - len(held)} originals moved to "
          f"{os.path.relpath(ARCHIVE, REPO)}/ (gitignored)")
    if held:
        print(f"\n{len(held)} original(s) KEPT in public/ — src/ still references the .png:")
        for rel in held:
            print("   " + rel.replace(os.sep, "/"))
        print("Update those references to .webp, then re-run to archive them.")


if __name__ == "__main__":
    main()
