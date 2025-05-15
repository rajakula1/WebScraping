from PIL import Image, ImageDraw
import os


def create_icon(size, color, icon_type):
    # Create a new image with a transparent background
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Draw different icons based on type
    if icon_type == "main":
        # Draw a medical cross
        cross_width = size // 3
        cross_height = size // 2
        x1 = (size - cross_width) // 2
        y1 = (size - cross_height) // 2
        x2 = x1 + cross_width
        y2 = y1 + cross_height

        # Draw vertical line
        draw.rectangle([x1, y1, x2, y2], fill=color)
        # Draw horizontal line
        draw.rectangle([y1, x1, y2, x2], fill=color)

    elif icon_type == "video":
        # Draw a play button
        points = [
            (size // 4, size // 4),
            (size // 4, 3 * size // 4),
            (3 * size // 4, size // 2),
        ]
        draw.polygon(points, fill=color)

    elif icon_type == "illustration":
        # Draw a simple image icon
        margin = size // 4
        draw.rectangle(
            [margin, margin, size - margin, size - margin], outline=color, width=2
        )
        draw.line([margin, margin, size - margin, size - margin], fill=color, width=2)

    elif icon_type == "model":
        # Draw a 3D cube
        margin = size // 4
        # Front face
        draw.rectangle(
            [margin, margin, size - margin, size - margin], outline=color, width=2
        )
        # Back face
        offset = size // 8
        draw.rectangle(
            [
                margin + offset,
                margin + offset,
                size - margin + offset,
                size - margin + offset,
            ],
            outline=color,
            width=2,
        )
        # Connecting lines
        draw.line(
            [margin, margin, margin + offset, margin + offset], fill=color, width=2
        )
        draw.line(
            [size - margin, margin, size - margin + offset, margin + offset],
            fill=color,
            width=2,
        )
        draw.line(
            [margin, size - margin, margin + offset, size - margin + offset],
            fill=color,
            width=2,
        )
        draw.line(
            [
                size - margin,
                size - margin,
                size - margin + offset,
                size - margin + offset,
            ],
            fill=color,
            width=2,
        )

    return image


def main():
    # Create icons directory if it doesn't exist
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)

    # Colors
    main_color = (0, 120, 212)  # Blue
    action_color = (0, 120, 212)  # Blue

    # Create main extension icons
    sizes = [16, 48, 128]
    for size in sizes:
        icon = create_icon(size, main_color, "main")
        icon.save(os.path.join(icons_dir, f"icon{size}.png"))

    # Create action icons
    action_icons = {"Video": "video", "illustration": "illustration", "Model": "model"}

    for name, icon_type in action_icons.items():
        icon = create_icon(24, action_color, icon_type)
        icon.save(os.path.join(icons_dir, f"{name}.png"))


if __name__ == "__main__":
    main()
