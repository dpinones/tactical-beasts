#!/usr/bin/env python3
"""
Generate pixel art sprite sheets (idle, walk, attack) from a beast PNG.
Usage: python3 generate_pixel_sprites.py [beast_name] [pixel_size]
  beast_name: name of the beast (default: ammit)
  pixel_size: pixel art resolution before upscale (default: 48)
"""

import sys
import os
import math
from PIL import Image, ImageFilter

BEASTS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "beasts")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "sprites")

BEAST_NAME = sys.argv[1] if len(sys.argv) > 1 else "ammit"
PIXEL_RES = int(sys.argv[2]) if len(sys.argv) > 2 else 48
FRAME_SIZE = 128  # final frame size in pixels
SPRITE_PADDING = 4  # padding inside each frame


def pixelate(img, res):
    """Downscale to res x res then upscale back with nearest neighbor for pixel art look."""
    # Remove background (white/near-white) -> transparent
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    for r, g, b, a in data:
        if r > 240 and g > 240 and b > 240:
            new_data.append((r, g, b, 0))
        else:
            new_data.append((r, g, b, a))
    img.putdata(new_data)

    # Crop to content bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # Downscale with LANCZOS for good color averaging, then upscale with NEAREST for pixel look
    small = img.resize((res, res), Image.LANCZOS)

    # Quantize colors slightly for more pixel-art feel
    # Convert to palette and back
    small_rgb = small.convert("RGB")
    small_p = small_rgb.quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    small_rgb = small_p.convert("RGB")

    # Restore alpha from the small version
    small_a = small.split()[3]
    small_final = Image.merge("RGBA", (*small_rgb.split(), small_a))

    # Threshold alpha for crisp edges
    alpha = small_final.split()[3]
    alpha = alpha.point(lambda x: 255 if x > 64 else 0)
    small_final.putalpha(alpha)

    return small_final


def place_in_frame(pixel_img, frame_size, offset_x=0, offset_y=0, scale_x=1.0, scale_y=1.0):
    """Place pixel art into a frame with optional offset and scale transforms."""
    frame = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))

    w, h = pixel_img.size
    new_w = max(1, int(w * scale_x))
    new_h = max(1, int(h * scale_y))
    transformed = pixel_img.resize((new_w, new_h), Image.NEAREST)

    # Center in frame with offset
    x = (frame_size - new_w) // 2 + offset_x
    y = (frame_size - new_h) // 2 + offset_y
    frame.paste(transformed, (x, y), transformed)
    return frame


def upscale_frame(frame, target_size):
    """Upscale a frame with nearest-neighbor to maintain pixel art crispness."""
    return frame.resize((target_size, target_size), Image.NEAREST)


def generate_idle(pixel_img, frame_size, num_frames=6):
    """Idle animation: gentle breathing (squash/stretch) + subtle bob."""
    frames = []
    for i in range(num_frames):
        t = i / num_frames
        # Breathing: subtle scale oscillation
        breath = math.sin(t * 2 * math.pi)
        sx = 1.0 + breath * 0.03  # 3% horizontal
        sy = 1.0 - breath * 0.04  # 4% vertical (inverse for squash/stretch)
        # Vertical bob
        oy = int(breath * -1.5)  # 1-2px bob
        frame = place_in_frame(pixel_img, frame_size, offset_y=oy, scale_x=sx, scale_y=sy)
        frames.append(frame)
    return frames


def generate_walk(pixel_img, frame_size, num_frames=8):
    """Walk animation: horizontal movement cycle + body bob + lean."""
    frames = []
    for i in range(num_frames):
        t = i / num_frames
        # Bob up and down (2 bobs per cycle for left-right step feel)
        bob = abs(math.sin(t * 2 * math.pi)) * -2
        # Slight horizontal sway
        sway = math.sin(t * 2 * math.pi) * 1
        # Forward lean via slight stretch
        lean_x = 1.0 + math.sin(t * 2 * math.pi) * 0.02
        lean_y = 1.0 - abs(math.sin(t * 2 * math.pi)) * 0.02

        frame = place_in_frame(
            pixel_img, frame_size,
            offset_x=int(sway),
            offset_y=int(bob),
            scale_x=lean_x,
            scale_y=lean_y,
        )
        frames.append(frame)
    return frames


def generate_attack(pixel_img, frame_size, num_frames=8):
    """Attack animation: wind up (pull back + crouch) -> lunge forward + stretch -> recover."""
    frames = []
    # Keyframe timeline: [0] rest, [1-2] wind up, [3-4] strike, [5-7] recover
    keyframes = [
        # (offset_x, offset_y, scale_x, scale_y)
        (0, 0, 1.0, 1.0),       # 0: rest
        (-3, 1, 0.95, 1.05),    # 1: pull back, crouch
        (-5, 2, 0.92, 1.08),    # 2: full wind up
        (2, -1, 1.08, 0.95),    # 3: start lunge
        (6, -2, 1.15, 0.90),    # 4: full strike (stretched forward)
        (4, -1, 1.10, 0.93),    # 5: impact
        (1, 0, 1.03, 0.98),     # 6: recovering
        (0, 0, 1.0, 1.0),       # 7: back to rest
    ]

    for i in range(num_frames):
        idx = min(i, len(keyframes) - 1)
        ox, oy, sx, sy = keyframes[idx]
        frame = place_in_frame(pixel_img, frame_size, offset_x=ox, offset_y=oy, scale_x=sx, scale_y=sy)
        frames.append(frame)
    return frames


def make_spritesheet(frames, name, output_dir):
    """Save frames as a horizontal sprite sheet PNG."""
    if not frames:
        return
    w, h = frames[0].size
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * w, 0), frame)

    path = os.path.join(output_dir, f"{name}.png")
    sheet.save(path)
    print(f"  Saved {path} ({len(frames)} frames, {sheet.size[0]}x{sheet.size[1]})")
    return path


def make_gif(frames, name, output_dir, duration=120):
    """Save frames as animated GIF for preview."""
    path = os.path.join(output_dir, f"{name}.gif")
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
    )
    print(f"  Saved {path} (GIF preview)")
    return path


def main():
    src_path = os.path.join(BEASTS_DIR, f"{BEAST_NAME}.png")
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found")
        sys.exit(1)

    beast_output = os.path.join(OUTPUT_DIR, BEAST_NAME)
    os.makedirs(beast_output, exist_ok=True)

    print(f"Loading {src_path}...")
    src = Image.open(src_path)

    print(f"Pixelating to {PIXEL_RES}x{PIXEL_RES}...")
    pixel_img = pixelate(src, PIXEL_RES)

    # Save the static pixel art version
    static_upscaled = pixel_img.resize((FRAME_SIZE, FRAME_SIZE), Image.NEAREST)
    static_path = os.path.join(beast_output, "static.png")
    static_upscaled.save(static_path)
    print(f"  Saved {static_path}")

    # Also save the small pixel version
    small_path = os.path.join(beast_output, "pixel_small.png")
    pixel_img.save(small_path)
    print(f"  Saved {small_path} ({PIXEL_RES}x{PIXEL_RES})")

    # Generate animations at pixel resolution, then upscale
    print("Generating idle animation...")
    idle_frames_small = generate_idle(pixel_img, PIXEL_RES + SPRITE_PADDING * 2, num_frames=6)
    idle_frames = [upscale_frame(f, FRAME_SIZE) for f in idle_frames_small]
    make_spritesheet(idle_frames, "idle", beast_output)
    make_gif(idle_frames, "idle", beast_output, duration=150)

    print("Generating walk animation...")
    walk_frames_small = generate_walk(pixel_img, PIXEL_RES + SPRITE_PADDING * 2, num_frames=8)
    walk_frames = [upscale_frame(f, FRAME_SIZE) for f in walk_frames_small]
    make_spritesheet(walk_frames, "walk", beast_output)
    make_gif(walk_frames, "walk", beast_output, duration=100)

    print("Generating attack animation...")
    attack_frames_small = generate_attack(pixel_img, PIXEL_RES + SPRITE_PADDING * 2, num_frames=8)
    attack_frames = [upscale_frame(f, FRAME_SIZE) for f in attack_frames_small]
    make_spritesheet(attack_frames, "attack", beast_output)
    make_gif(attack_frames, "attack", beast_output, duration=100)

    print(f"\nDone! All sprites saved to {beast_output}/")
    print(f"Files:")
    print(f"  static.png        - Single pixel art frame ({FRAME_SIZE}x{FRAME_SIZE})")
    print(f"  pixel_small.png   - Small pixel art ({PIXEL_RES}x{PIXEL_RES})")
    print(f"  idle.png          - Idle spritesheet (6 frames)")
    print(f"  idle.gif          - Idle preview GIF")
    print(f"  walk.png          - Walk spritesheet (8 frames)")
    print(f"  walk.gif          - Walk preview GIF")
    print(f"  attack.png        - Attack spritesheet (8 frames)")
    print(f"  attack.gif        - Attack preview GIF")


if __name__ == "__main__":
    main()
