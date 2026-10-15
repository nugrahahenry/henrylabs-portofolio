"""Publish stamped derivatives only; keep immutable originals in ignored local storage.

Requires Pillow, pypdf, ReportLab and Poppler. First run: --initialize.
Subsequent runs always use the private masters, never the public derivatives.
"""
import argparse
import hashlib
import io
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypdf import PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ASSETS = PUBLIC / "assets/certificates"
MASTERS = ROOT / "docs/assets/credentials/_originals"
MANIFEST = ASSETS / "watermarks.json"
TEXT = "Henry Nugraha \u2022 Portfolio Preview"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stamp(image, font_path):
    base = ImageOps.exif_transpose(image).convert("RGBA")
    w, h = base.size
    font = ImageFont.truetype(font_path, max(15, round(w * .019)))
    overlay = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(overlay)
    box = draw.textbbox((0, 0), TEXT, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    label = Image.new("RGBA", (tw + 10, th + 20))
    ImageDraw.Draw(label).text((5, 5 - box[1]), TEXT, font=font, fill=(24, 53, 68, 65), stroke_width=1, stroke_fill=(255, 255, 255, 70))
    label = label.rotate(24, resample=Image.Resampling.BICUBIC, expand=True)
    # Overlapping content regions prevent a clean crop; low contrast preserves issuer text.
    spacing_x = max(label.width + 12, round(w * .64))
    spacing_y = max(label.height + 16, round(h * .25))
    for row, y in enumerate(range(-label.height // 2, h, spacing_y)):
        for x in range(-label.width // 3 + (spacing_x // 2 if row % 2 else 0), w, spacing_x):
            overlay.alpha_composite(label, (x, y))
    return Image.alpha_composite(base, overlay)


def add_images(batch_path, font_path):
    """Import a reviewed local JSON list without ever exposing raw images in public/."""
    batch = json.loads(Path(batch_path).read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    checksums_path = MASTERS / "checksums.json"
    checksums = json.loads(checksums_path.read_text(encoding="utf-8"))
    assert manifest["watermark"] == TEXT
    for name, expected in checksums.items():
        assert digest(MASTERS / name) == expected, f"Master changed: {name}"
    for name, record in manifest["files"].items():
        assert digest(PUBLIC / name.lstrip("/")) == record["sha256"], f"Public export changed: {name}"
    seen_ids, seen_hashes, pending = set(), set(checksums.values()), []
    for item in batch:
        slug, source = item["id"], Path(item["source"]).resolve()
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug), "Invalid credential ID"
        assert slug not in seen_ids, f"Duplicate ID: {slug}"
        seen_ids.add(slug)
        assert source.is_file() and source.suffix.lower() == ".png", "Image import accepts PNG masters only"
        assert not source.is_relative_to(PUBLIC.resolve()), "Do not import public derivatives as masters"
        name, fingerprint = f"previews/{slug}.png", digest(source)
        if name in checksums:
            assert checksums[name] == fingerprint, f"Master ID already used: {slug}"
            assert f"/assets/certificates/{name}" in manifest["files"]
            continue
        assert fingerprint not in seen_hashes, f"Duplicate master: {slug}"
        seen_hashes.add(fingerprint)
        for target in [MASTERS / name, ASSETS / name, ASSETS / "thumbnails" / f"{slug}.webp"]:
            assert not target.exists(), f"Refusing to overwrite: {target.name}"
        pending.append((slug, source, name, fingerprint))
    scratch = ROOT / "test-results"
    scratch.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="credential-import-", dir=scratch) as tmp:
        outputs = []
        for slug, source, name, fingerprint in pending:
            with Image.open(source) as original:
                marked = stamp(original, font_path)
            preview, thumb = Path(tmp) / f"{slug}.png", Path(tmp) / f"{slug}.webp"
            marked.save(preview, optimize=True)
            marked.thumbnail((720, 560), Image.Resampling.LANCZOS)
            marked.save(thumb, quality=84, method=6)
            outputs.extend([(preview, ASSETS / name), (thumb, ASSETS / "thumbnails" / thumb.name)])
        for slug, source, name, fingerprint in pending:
            master = MASTERS / name
            master.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, master)
            assert digest(master) == fingerprint
            checksums[name] = fingerprint
        for source, target in outputs:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            manifest["files"]["/" + target.relative_to(PUBLIC).as_posix()] = {"sha256": digest(target), "bytes": target.stat().st_size}
    checksums_path.write_text(json.dumps(checksums, indent=2) + "\n", encoding="utf-8")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(pending)} images and stamped thumbnails; existing exports unchanged.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--initialize", action="store_true")
    parser.add_argument("--pdftoppm", default="pdftoppm")
    parser.add_argument("--font", default="C:/Windows/Fonts/arial.ttf")
    parser.add_argument("--add-images", help="Reviewed private JSON batch: [{id, source}]")
    args = parser.parse_args()
    assert Path(args.font).is_file(), "Provide a local TrueType font with --font"
    if args.add_images:
        assert not args.initialize, "Import and initialization are separate operations"
        add_images(args.add_images, args.font)
        return
    sources = sorted((ASSETS / "previews").glob("*")) + sorted((ASSETS / "source").glob("*.pdf"))
    if args.initialize:
        assert not MANIFEST.exists(), "Already initialized; refusing to copy stamped derivatives into masters"
        for source in sources:
            target = MASTERS / source.relative_to(ASSETS)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                assert digest(target) == digest(source), f"Existing master differs: {source.name}"
            else:
                shutil.copy2(source, target)
        (MASTERS / "checksums.json").write_text(json.dumps({str(p.relative_to(ASSETS)).replace('\\', '/'): digest(p) for p in sources}, indent=2))
    checksums = json.loads((MASTERS / "checksums.json").read_text())
    assert {p.relative_to(ASSETS).as_posix() for p in sources} == set(checksums), "Review the catalog before changing the public asset set"
    for name, expected in checksums.items():
        assert digest(MASTERS / name) == expected, f"Master changed: {name}"

    outputs = []
    scratch = ROOT / "test-results"
    scratch.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="stargod-credentials-", dir=scratch) as tmp:
        for source in sources:
            master = MASTERS / source.relative_to(ASSETS)
            if source.suffix == ".pdf":
                original = PdfReader(master)
                target = Path(tmp) / source.name
                pdf = canvas.Canvas(str(target), pageCompression=1, invariant=1)
                pdf.setTitle(f"{source.stem} - Portfolio Preview")
                pdf.setAuthor("Henry Nugraha")
                pdf.setSubject(TEXT)
                for n, page in enumerate(original.pages, 1):
                    prefix = Path(tmp) / f"page-{n}"
                    subprocess.run([args.pdftoppm, "-f", str(n), "-l", str(n), "-singlefile", "-r", "180", "-scale-to", "3200", "-png", str(master), str(prefix)], check=True)
                    with Image.open(prefix.with_suffix(".png")) as image:
                        marked = stamp(image, args.font).convert("RGB")
                    width, height = float(page.mediabox.width), float(page.mediabox.height)
                    if int(page.get("/Rotate", 0)) % 180: width, height = height, width
                    pdf.setPageSize((width, height))
                    encoded = io.BytesIO()
                    marked.save(encoded, "JPEG", quality=94, subsampling=0)
                    pdf.drawImage(ImageReader(io.BytesIO(encoded.getvalue())), 0, 0, width=width, height=height)
                    pdf.showPage()
                pdf.save()
                check = PdfReader(target)
                assert len(check.pages) == len(original.pages)
                assert all(len(page.images) == 1 and not page.get("/Annots") for page in check.pages)
                # Rasterized marked pages contain no removable original document layer.
                shutil.copyfile(target, source)
            else:
                with Image.open(master) as image: marked = stamp(image, args.font)
                if source.suffix.lower() in (".jpg", ".jpeg"):
                    marked.convert("RGB").save(source, quality=95, subsampling=0)
                else:
                    marked.save(source, optimize=True)
                thumb = ASSETS / "thumbnails" / f"{source.stem}.webp"
                preview = marked.copy()
                preview.thumbnail((720, 560), Image.Resampling.LANCZOS)
                preview.save(thumb, quality=84, method=6)
                outputs.append(thumb)
                readme = PUBLIC / "assets/readme" / f"{source.stem}.webp"
                if readme.exists():
                    preview = marked.copy()
                    preview.thumbnail((960 if source.stem == "google-student-ambassador" else 600, 2000), Image.Resampling.LANCZOS)
                    preview.save(readme, quality=88, method=6)
                    outputs.append(readme)
            outputs.append(source)

    records = {"/" + p.relative_to(PUBLIC).as_posix(): {"sha256": digest(p), "bytes": p.stat().st_size} for p in sorted(outputs)}
    MANIFEST.write_text(json.dumps({"version": 1, "watermark": TEXT, "files": records}, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(f"Published {len(outputs)} stamped files. Private masters unchanged.")


if __name__ == "__main__":
    main()
