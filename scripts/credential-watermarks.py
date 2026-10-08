"""Publish stamped derivatives only; keep immutable originals in ignored local storage.

Requires Pillow, pypdf, ReportLab and Poppler. First run: --initialize.
Subsequent runs always use the private masters, never the public derivatives.
"""
import argparse
import hashlib
import io
import json
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--initialize", action="store_true")
    parser.add_argument("--pdftoppm", default="pdftoppm")
    parser.add_argument("--font", default="C:/Windows/Fonts/arial.ttf")
    args = parser.parse_args()
    sources = sorted((ASSETS / "previews").glob("*")) + sorted((ASSETS / "source").glob("*.pdf"))
    assert len(sources) == 34, "Review the catalog before changing the public asset set"
    assert Path(args.font).is_file(), "Provide a local TrueType font with --font"
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
    print(f"Published {len(outputs)} stamped files: 26 images, 26 thumbnails, 8 flattened PDFs, 3 README images. Private masters unchanged.")


if __name__ == "__main__":
    main()
