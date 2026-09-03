"""Collapse identical media parts in a .pptx into one.

pptxgenjs writes a fresh copy of an image for every slide that uses it, so the
campaign mark on thirteen slides became thirteen copies of the same file. Same
bytes, thirteen times. This rewrites every relationship that points at a
duplicate so it points at the first copy instead, then drops the rest.

Relationship ids are left exactly as they were, so the slide XML that references
them does not need touching.
"""
import hashlib
import re
import shutil
import sys
import zipfile
from pathlib import Path

src = Path(sys.argv[1])
dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src

with zipfile.ZipFile(src) as z:
    names = z.namelist()
    parts = {n: z.read(n) for n in names}

# Map every media part to the first part that has the same bytes.
canonical = {}
by_digest = {}
for n in sorted(p for p in parts if p.startswith("ppt/media/")):
    d = hashlib.sha256(parts[n]).hexdigest()
    if d in by_digest:
        canonical[n] = by_digest[d]
    else:
        by_digest[d] = n

if not canonical:
    print("no duplicate media found")
    if dst != src:
        shutil.copy(src, dst)
    sys.exit(0)

# Point every relationship at the surviving copy.
rewrites = 0
for n in list(parts):
    if not n.endswith(".rels"):
        continue
    xml = parts[n].decode("utf-8")
    original = xml
    for dup, keep in canonical.items():
        dup_base, keep_base = dup.split("/")[-1], keep.split("/")[-1]
        xml = re.sub(
            r'(Target="(?:\.\./)*media/)' + re.escape(dup_base) + r'"',
            lambda m: m.group(1) + keep_base + '"',
            xml,
        )
    if xml != original:
        parts[n] = xml.encode("utf-8")
        rewrites += 1

for dup in canonical:
    del parts[dup]

# Repack in the original order so [Content_Types].xml stays first.
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for n in names:
        if n in parts:
            z.writestr(n, parts[n])

print(f"removed {len(canonical)} duplicate media parts, "
      f"rewrote {rewrites} rels files")
print(f"{src.stat().st_size:,} -> {dst.stat().st_size:,} bytes")
