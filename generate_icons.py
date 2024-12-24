"""
LastEditors: jizai jizai.zhu@tuya.com
Date: 2024-12-24 18:20:15
LastEditTime: 2024-12-24 18:25:32
FilePath: /sina_liked_it/generate_icons.py
Description: 生成扩展图标
"""

import subprocess


def convert_svg_to_png(svg_path, output_path, size):
    subprocess.run(
        [
            "inkscape",
            "--export-filename=" + output_path,
            "-w",
            str(size),
            "-h",
            str(size),
            svg_path,
        ]
    )


# 生成不同尺寸的图标
sizes = [16, 48, 128]
for size in sizes:
    convert_svg_to_png("icon.svg", f"icon{size}.png", size)

print("图标生成完成!")
