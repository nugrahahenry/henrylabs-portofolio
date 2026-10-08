"""Export bounded README media from actual browser frames and public artwork.

Requires Pillow. Run scripts/capture-readme.mjs first; originals are never changed.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "test-results/readme-frames"
OUTPUT = ROOT / "public/assets/readme"
MANIFEST = ROOT / "public/assets/certificates/watermarks.json"
CERTIFICATES = [
    ("google-student-ambassador", 960),
    ("gemini-certified-educator", 600),
    ("dicoding-oop", 600),
]
watermarks = json.loads(MANIFEST.read_text(encoding="utf-8"))
for name, _ in CERTIFICATES:
    url = f"/assets/certificates/previews/{name}.png"
    source = ROOT / "public" / url.lstrip("/")
    assert hashlib.sha256(source.read_bytes()).hexdigest() == watermarks["files"][url]["sha256"], f"Unverified credential preview: {name}"
OUTPUT.mkdir(parents=True, exist_ok=True)
capture = json.loads((SOURCE / "capture.json").read_text())


def resized(path, width, browser_capture=False):
    with Image.open(path) as original:
        image = original.convert("RGB")
        if browser_capture:
            # Trim only the development-toolbar strip, below the actual map controls.
            image = image.crop((0, 0, image.width, image.height - 60))
        image.thumbnail((width, 2000), Image.Resampling.LANCZOS)
        return image


frames = [resized(SOURCE / f"frame-{n:03}.png", 960, True) for n in range(capture["frames"])]
# One shared palette avoids frame-to-frame color flicker in the nebula.
samples = frames[::8]
swatch = Image.new("RGB", (240, 146 * len(samples)))
for index, frame in enumerate(samples):
    sample = frame.copy()
    sample.thumbnail((240, 146), Image.Resampling.LANCZOS)
    swatch.paste(sample, (0, 146 * index))
palette = swatch.quantize(colors=128, method=Image.Quantize.MEDIANCUT)

# The only edit is a short dissolve joining the recorded end and start.
for index in range(1, 7):
    frames.append(Image.blend(frames[capture["frames"] - 1], frames[0], index / 7))
durations = [100] * len(frames)
durations[0] = 600
frames[0].save(
    OUTPUT / "living-universe.webp", save_all=True, append_images=frames[1:],
    duration=durations, loop=0, quality=80, method=4,
)
indexed = []
for frame in frames[::2]:
    fallback = frame.copy()
    fallback.thumbnail((640, 1000), Image.Resampling.LANCZOS)
    indexed.append(fallback.quantize(palette=palette, dither=Image.Dither.NONE))
fallback_durations = [sum(durations[n:n + 2]) for n in range(0, len(durations), 2)]
indexed[0].save(
    OUTPUT / "living-universe.gif", save_all=True, append_images=indexed[1:],
    duration=fallback_durations, loop=0, optimize=False, disposal=1,
)

for source, target in [("universe", "universe-poster"), ("worlds", "project-orbits")]:
    resized(SOURCE / f"{source}.png", 1200, True).save(OUTPUT / f"{target}.webp", quality=86, method=6)

for name, width in CERTIFICATES:
    resized(ROOT / f"public/assets/certificates/previews/{name}.png", width).save(
        OUTPUT / f"{name}.webp", quality=88, method=6,
    )
    result = OUTPUT / f"{name}.webp"
    watermarks["files"][f"/assets/readme/{name}.webp"] = {
        "sha256": hashlib.sha256(result.read_bytes()).hexdigest(),
        "bytes": result.stat().st_size,
    }
MANIFEST.write_text(json.dumps(watermarks, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")

with Image.open(OUTPUT / "living-universe.webp") as animation:
    assert animation.n_frames > 60, "Animation must have real movement, not one still."
    first = animation.convert("RGB")
    animation.seek(min(44, animation.n_frames - 1))
    movement = sum(ImageStat.Stat(ImageChops.difference(first, animation.convert("RGB"))).mean)
    assert movement > 12, f"Unexpectedly static capture: {movement}"
    assert max(ImageStat.Stat(first).stddev) > 10, "Blank or unpainted canvas capture."
    assert animation.size[0] == 960
assert (OUTPUT / "living-universe.gif").stat().st_size < 6_000_000, "GIF exceeds README media budget."
assert (OUTPUT / "living-universe.webp").stat().st_size < 2_000_000, "WebP exceeds README media budget."
with Image.open(OUTPUT / "living-universe.gif") as fallback:
    assert fallback.n_frames > 35
report = {
    "source": capture["source"], "captureFrames": capture["frames"],
    "exportFrames": len(frames), "fallbackFrames": len(indexed), "durationMs": sum(durations),
    "meanPixelChange": round(movement, 2),
    "files": {path.name: path.stat().st_size for path in sorted(OUTPUT.iterdir()) if path.is_file()},
}
(SOURCE / "export.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
