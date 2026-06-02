async def generate_preview_images(task: dict, platform: str) -> list[str]:
    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    previews = []
    for shot in scripts:
        prompt = (
            f"{style.get('visual_style', 'clean')} product photography, photorealistic. "
            f"{shot['scene']}. {shot['shot_type']}, {shot['angle']} angle, "
            f"{shot['lighting']} lighting. 9:16 vertical, product advertising quality."
        )
        previews.append(prompt)
    return previews
