"""Builds Exoline, Exo's typeface, from Geist 1.900 (SIL OFL 1.1, (c) 2024 The Geist Project Authors).

Exoline is a modified version of Geist under the same licence (OFL 1.1 lets a font be modified and redistributed under
another name; LICENSE-Exoline.txt carries both notices). What it changes, all of it here, so the same inputs give the
same fonts:

  1. Three of Geist's alternate sets are the default letters, by character map (so they hold without any shaping feature):
     the a without a tail (ss01), the l with a tail (ss03: I and l never look alike), and round dots (ss08).
  2. The capital E and F have a shorter middle bar, as Exo's mark has (three bars, the middle one short).
  3. The names: family "Exoline", version 1.000.

  python build_exoline.py <Geist-Variable.woff2> <Geist-Italic-Variable.woff2> <out dir>

Writes Exoline-Variable.woff2, Exoline-Italic-Variable.woff2 (the web UI) and static Exoline-{Regular,Medium,SemiBold,Bold}.ttf
(the native UI), and prints what it changed.
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

DEFAULT_SETS = ("ss01", "ss03", "ss08")
# The middle bar of E and F ends this far left of where Geist ends it (units per em: 1000).
BAR_SHORTER_BY = 78
FAMILY = "Exoline"
VERSION = "Version 1.000; based on Geist 1.900"
STATICS = {"Regular": 400, "Medium": 500, "SemiBold": 600, "Bold": 700}


def set_mappings(font, tag):
    """base glyph -> alternate, from the single substitutions of one stylistic set."""
    gsub = font["GSUB"].table
    out = {}
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != tag:
            continue
        for index in record.Feature.LookupListIndex:
            for sub in gsub.LookupList.Lookup[index].SubTable:
                sub = getattr(sub, "ExtSubTable", sub)
                if hasattr(sub, "mapping"):
                    out.update(sub.mapping)
    return out


def make_default(font):
    """Points every character of the chosen sets at its alternate. Returns how many characters moved."""
    swap = {}
    for tag in DEFAULT_SETS:
        swap.update(set_mappings(font, tag))
    moved = 0
    for table in font["cmap"].tables:
        if not table.isUnicode():
            continue
        for code, name in list(table.cmap.items()):
            if name in swap:
                table.cmap[code] = swap[name]
                moved += 1
    return moved, len(swap)


def shorten_bar(font, name):
    """Moves the two right-hand points of the middle bar of E or F left. The other masters follow (deltas are relative)."""
    glyph = font["glyf"][name]
    if glyph.isComposite() or glyph.numberOfContours < 1:
        raise SystemExit(f"{name} is not a simple outline; the bar rule needs rewriting")
    points = list(glyph.coordinates)
    ys = sorted({y for _, y in points})
    top, bottom = ys[-1], ys[0]
    # The bar's points: strictly between the top and bottom strokes, and the rightmost two of those.
    middle = [i for i, (x, y) in enumerate(points) if bottom + 150 < y < top - 150]
    if len(middle) < 4:
        raise SystemExit(f"{name}: expected a middle bar, found {len(middle)} points")
    reach = max(points[i][0] for i in middle)
    ends = [i for i in middle if points[i][0] >= reach - 30]
    if len(ends) != 2:
        raise SystemExit(f"{name}: expected 2 bar-end points, found {len(ends)}")
    for i in ends:
        x, y = points[i]
        glyph.coordinates[i] = (x - BAR_SHORTER_BY, y)
    glyph.recalcBounds(font["glyf"])
    return [points[i] for i in ends]


def rename(font, italic):
    name = font["name"]
    style = "Italic" if italic else "Regular"
    values = {
        1: FAMILY, 2: style, 3: f"{FAMILY} {style} 1.000", 4: f"{FAMILY} {style}".replace(" Regular", ""),
        5: VERSION, 6: f"{FAMILY}-{style}", 16: FAMILY, 17: style,
        10: "Exoline is Exo's typeface: a modified version of Geist (The Geist Project Authors) under the SIL Open Font License 1.1.",
    }
    for record in list(name.names):
        if record.nameID in values:
            name.removeNames(nameID=record.nameID)
    for name_id, text in values.items():
        name.setName(text, name_id, 3, 1, 0x409)
    copyright_now = name.getName(0, 3, 1, 0x409)
    name.setName(f"{copyright_now} Modifications (Exoline) Copyright 2026 Exo.", 0, 3, 1, 0x409)
    # Any other name that still says Geist (variation PostScript prefix, instance names) says Exoline.
    for record in name.names:
        text = record.toUnicode()
        if record.nameID != 0 and "Geist" in text and record.nameID not in (10, 13, 14):
            record.string = text.replace("Geist", FAMILY)
    font["head"].fontRevision = 1.0


def build(source, out, italic):
    font = TTFont(source)
    moved, pairs = make_default(font)
    bars = {glyph: shorten_bar(font, glyph) for glyph in ("E", "F")}
    rename(font, italic)
    suffix = "-Italic" if italic else ""
    target = out / f"{FAMILY}{suffix}-Variable.woff2"
    font.flavor = "woff2"
    font.save(target)
    # The same font unflavoured, for what reads a TrueType file (the installer's window, the host's own windows).
    font.flavor = None
    font.save(out / f"{FAMILY}{suffix}-Variable.ttf")
    print(f"{target.name}: {moved} characters now use {pairs} alternate glyphs; bars moved from {bars}")
    return target


def statics(variable, out):
    for style, weight in STATICS.items():
        font = TTFont(variable)
        font.flavor = None
        one = instancer.instantiateVariableFont(font, {"wght": weight})
        name = one["name"]
        for name_id, text in {1: FAMILY if style in ("Regular", "Bold") else f"{FAMILY} {style}", 2: style if style in ("Regular", "Bold") else "Regular",
                              4: f"{FAMILY} {style}".replace(" Regular", ""), 6: f"{FAMILY}-{style}", 16: FAMILY, 17: style}.items():
            name.setName(text, name_id, 3, 1, 0x409)
        one["OS/2"].usWeightClass = weight
        target = out / f"{FAMILY}-{style}.ttf"
        one.save(target)
        print(f"{target.name}: {target.stat().st_size} bytes")


def main():
    upright, italic, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    variable = build(upright, out, italic=False)
    build(italic, out, italic=True)
    statics(variable, out)


if __name__ == "__main__":
    main()
