async def generate_preview_images(task: dict, platform: str) -> list[str]:
    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    continuity = scripts[0].get("continuity_anchor", "") if scripts else ""

    previews = []
    for shot in scripts:
        prompt = (
            f"{style.get('visual_style', 'clean')} product photography, photorealistic. "
            f"{shot['scene']}. "
            f"Purpose: {shot.get('purpose', '')}. "
            f"{shot['shot_type']}, {shot['angle']} angle, "
            f"{shot['lighting']} lighting. "
            f"Transition: {shot.get('transition', 'cut')}. "
            f"9:16 vertical, product advertising quality. "
            f"{continuity}"
        )
        previews.append(prompt)
    return previews
