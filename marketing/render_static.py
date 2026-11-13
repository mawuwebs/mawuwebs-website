"""Render static ads to PNG. Run: python3 marketing/render_static.py (needs playwright + chromium)."""
import pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).parent
sizes = {"feed-1080x1080": (1080, 1080), "portrait-1080x1350": (1080, 1350),
         "story-1080x1920": (1080, 1920), "link-1200x628": (1200, 628)}
names = {1: "launch", 2: "services", 3: "health-check", 4: "meet-mawu",
         5: "web-dev", 6: "security", 7: "it-support"}
with sync_playwright() as p:
    b = p.chromium.launch()
    for d, n in names.items():
        for s, (w, h) in sizes.items():
            pg = b.new_page(viewport={"width": w, "height": h})
            pg.goto(f"file://{here}/static.html?w={w}&h={h}&d={d}")
            pg.wait_for_selector("body[data-ready]")
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(here / "out" / f"{n}_{s}.png"))
            pg.close()
    b.close()
