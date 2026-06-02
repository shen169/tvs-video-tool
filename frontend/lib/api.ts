const BASE = "http://localhost:8000/api";

export async function createTask(url: string, platforms: string[], image?: File) {
  const form = new FormData();
  form.append("url", url);
  form.append("platforms", platforms.join(","));
  if (image) form.append("file", image);
  const res = await fetch(`${BASE}/tasks`, { method: "POST", body: form });
  return res.json();
}

export async function getTask(taskId: string) {
  const res = await fetch(`${BASE}/tasks/${taskId}`);
  return res.json();
}

export async function uploadRefImage(taskId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/tasks/${taskId}/ref-image`, {
    method: "POST", body: form,
  });
  return res.json();
}

export async function submitStyle(taskId: string, style: Record<string, string>) {
  const res = await fetch(`${BASE}/tasks/${taskId}/style`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(style),
  });
  return res.json();
}

export async function confirmStoryboard(taskId: string) {
  const res = await fetch(`${BASE}/tasks/${taskId}/storyboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: true }),
  });
  return res.json();
}
