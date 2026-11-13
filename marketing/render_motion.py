"""Record motion ads to webm (+mp4 if an h264 ffmpeg exists). Run: python3 marketing/render_motion.py"""
import pathlib, shutil, subprocess
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).parent
fmts = {"story-1080x1920": (1080, 1920), "feed-1080x1080": (1080, 1080)}
with sync_playwright() as p:
    b = p.chromium.launch()
    for n, (w, h) in fmts.items():
        tmp = here / "out" / f"_{n}"
        ctx = b.new_context(viewport={"width": w, "height": h}, record_video_dir=str(tmp), record_video_size={"width": w, "height": h})
        pg = ctx.new_page()
        pg.goto(f"file://{here}/motion.html?w={w}&h={h}")
        pg.wait_for_selector("body[data-go]")
        pg.wait_for_timeout(15500)
        ctx.close()
        src = next(tmp.glob("*.webm"))
        shutil.move(src, here / "out" / f"motion_{n}.webm")
        shutil.rmtree(tmp)
    b.close()
ff = shutil.which("ffmpeg")
if ff:
    for f in (here / "out").glob("motion_*.webm"):
        subprocess.run([ff, "-y", "-i", str(f), "-c:v", "libx264", "-pix_fmt", "yuv420p", str(f.with_suffix(".mp4"))], check=False)
