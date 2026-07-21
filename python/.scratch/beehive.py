import argparse
import math
import random
from xml.etree.ElementTree import Element, SubElement, ElementTree

def interpolate(value1, value2, value3, t):
    if t <= 0.5:
        return value1 + (value2 - value1) * (t * 2)
    else:
        return value2 + (value3 - value2) * ((t - 0.5) * 2)

def hexagon_points(cx, cy, size):
    points = []
    for i in range(6):
        angle_deg = 60 * i #- 30  # Shifted to make pointy-top hexagons
        angle_rad = math.radians(angle_deg)
        x = cx + size * math.cos(angle_rad)
        y = cy + size * math.sin(angle_rad)
        points.append(f"{x},{y}")
    return " ".join(points)

def scale_variable(v, l, h):
    """
    Scales the input variable v according to the specified rules.

    Parameters:
    - v (float): The input variable, expected to be between 0 and 1 inclusive.
    - l (float): The lower threshold, where 0 < l < h < 1.
    - h (float): The upper threshold.

    Returns:
    - float or None: The scaled value if v is within [0, l] or [h, 1],
      or None if v is between l and h.
    """
    # Validate that l and h satisfy 0 < l < h < 1
    if not (0 < l < h < 1):
        raise ValueError("Parameters must satisfy 0 < l < h < 1.")
    # Ensure v is within the valid range
    v = max(0., min(1., v))

    if 0 <= v <= l:
        # Scale v from [0, l] to [0, 0.5]
        scaled_v = (v / l) * 0.5
        return scaled_v
    elif h <= v <= 1:
        # Scale v from [h, 1] to [0.5, 1]
        scaled_v = 0.5 + ((v - h) / (1 - h)) * 0.5
        return scaled_v
    elif l < v < h:
        # v is between l and h; return None
        return None
    else:
        # This case should not occur if inputs are valid
        return None

def main():
    parser = argparse.ArgumentParser(description='Generate a beehive-like SVG image.')
    parser.add_argument('--width', type=float, required=True, help='Width of the SVG in inches.')
    parser.add_argument('--height', type=float, required=True, help='Height of the SVG in inches.')
    parser.add_argument('--hexagon-width', type=float, required=True, help='Width of each hexagon in inches.')
    parser.add_argument('--outline-color', type=str, required=True, help='Outline color as a hex string (e.g., #000000FF).')
    parser.add_argument('--stroke-width', type=float, required=True,
                        help='Stroke width of the hexagon outlines in inches.')
    parser.add_argument('--fill-color1', type=str, required=True, help='First fill color as a hex string.')
    parser.add_argument('--fill-color2', type=str, required=True, help='Second fill color as a hex string.')
    parser.add_argument('--dropout-percent', type=str, required=True, help='Comma-separated dropout percentages for top, middle, bottom.')
    parser.add_argument('--color1-percent', type=str, required=True, help='Comma-separated color1 percentages for top, middle, bottom.')
    parser.add_argument('--opacity', type=str, required=True, help='Comma-separated opacity values (0.0 to 1.0) for top, middle, bottom.')

    parser.add_argument('--output', type=str, default='output.svg', help='Output SVG file name.')
    args = parser.parse_args()

    # Convert inches to pixels (300 DPI)
    dpi = 300
    svg_width = args.width * dpi
    svg_height = args.height * dpi
    hex_width = args.hexagon_width * dpi
    hex_size = hex_width / 2  # Distance from center to any corner
    # convert stroke width
    stroke_width = args.stroke_width * dpi
    # Parse dropout and color percentages
    dropout_percents = [float(x) / 100.0 for x in args.dropout_percent.split(',')]
    color1_percents = [float(x) / 100.0 for x in args.color1_percent.split(',')]
    opacity_values = [float(x) for x in args.opacity.split(',')]

    # Create SVG root element
    svg = Element('svg', xmlns="http://www.w3.org/2000/svg",
                  width=f"{svg_width}px", height=f"{svg_height}px",
                  version="1.1")

    # Calculate hexagon grid parameters
    hex_height = math.sqrt(3) * hex_size
    cols = int(svg_width / (hex_width * 0.75)) + 2
    rows = int(svg_height / hex_height) + 2

    for row in range(rows):
        for col in range(cols):
            # Calculate position
            x = col * hex_width * 0.75
            y = row * hex_height
            if col % 2 == 1:
                y += hex_height / 2

            # Skip hexagons outside the drawing area
            if x - hex_size > svg_width or y - hex_height / 2 > svg_height:
                continue

            # Normalize vertical position for interpolation
            t = y / svg_height

            l = 0.4
            h = 0.6

            t = scale_variable(t, l, h)
            if t is None:
                continue

            # Interpolate dropout and color percentages
            dropout_percent = interpolate(dropout_percents[0], dropout_percents[1], dropout_percents[2], t)
            color1_percent = interpolate(color1_percents[0], color1_percents[1], color1_percents[2], t)
            opacity = interpolate(opacity_values[0], opacity_values[1], opacity_values[2], t)
            # Decide whether to drop out this hexagon
            if random.random() < dropout_percent:
                continue

            # Decide fill color
            fill_color = args.fill_color1 if random.random() < color1_percent else args.fill_color2

            # Adjust fill color with opacity
            # Convert hex color to RGBA
            fill_color = fill_color.lstrip('#')
            if len(fill_color) == 6:
                r, g, b = [int(fill_color[i:i+2], 16) for i in (0, 2, 4)]
            elif len(fill_color) == 8:
                r, g, b = [int(fill_color[i:i+2], 16) for i in (0, 2, 4)]
                # Ignore alpha channel in original color
            else:
                raise ValueError('Fill colors must be hex strings of the form #RRGGBB or #RRGGBBAA')

            # Apply interpolated opacity
            a = min(int(255.0 * opacity / 100.0), 255)
            fill_color_with_opacity = f'#{r:02X}{g:02X}{b:02X}{a:02X}'

            # Create hexagon element
            points = hexagon_points(x, y, hex_size)
            hex_elem = SubElement(svg, 'polygon', points=points,
                                  stroke=args.outline_color, fill=fill_color_with_opacity,
                                  **{'stroke-width': str(stroke_width)})

    # Write SVG to file
    tree = ElementTree(svg)
    tree.write(args.output)

if __name__ == '__main__':
    main()
