async def generate_ref_image(task: dict) -> str:
    if task.get("uploaded_ref_image"):
        return task["uploaded_ref_image"]
    product = task.get("product_info", {})
    title = product.get("title", "product")
    prompt = (
        f"Commercial product photography, photorealistic, clean white background. "
        f"{title}. Centered hero shot, 45-degree angle, soft studio lighting. "
        f"Product only, no text, no logos, 1:1 square, 8K detail."
    )
    return f"__AI_GEN__:{prompt}"
