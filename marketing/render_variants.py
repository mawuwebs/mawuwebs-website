"""Record extra motion ads (bumper, live-day, per-service). Run: python3 marketing/render_variants.py"""
import pathlib, shutil, subprocess
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).parent
fmts = {"story-1080x1920": (1080, 1920), "feed-1080x1080": (1080, 1080)}
# name -> (page, query, seconds)
jobs = {"bumper": ("motion_service.html", "v=bumper", 6.4), "web": ("motion_service.html", "v=web", 10.4),
        "security": ("motion_service.html", "v=security", 10.4), "support": ("motion_service.html", "v=support", 10.4),
        "live": ("motion.html", "v=live", 15.5),
        "web-live": ("motion_service.html", "v=web&live=1", 10.4), "security-live": ("motion_service.html", "v=security&live=1", 10.4),
        "support-live": ("motion_service.html", "v=support&live=1", 10.4)}
def find_ffmpeg():
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: return None
ff = find_ffmpeg()
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (page, query, secs) in jobs.items():
        for fn, (w, h) in fmts.items():
            tmp = here / "out" / f"_{name}_{fn}"
            ctx = b.new_context(viewport={"width": w, "height": h}, record_video_dir=str(tmp), record_video_size={"width": w, "height": h})
            pg = ctx.new_page()
            pg.goto(f"file://{here}/{page}?{query}&w={w}&h={h}")
            pg.wait_for_selector("body[data-go]")
            pg.wait_for_timeout(int(secs * 1000))
            ctx.close()
            webm = here / "out" / f"motion-{name}_{fn}.webm"
            shutil.move(next(tmp.glob("*.webm")), webm); shutil.rmtree(tmp)
            if ff: subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(webm), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(webm.with_suffix(".mp4"))], check=False)
    b.close()
