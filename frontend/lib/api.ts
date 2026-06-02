const BASE = "http://localhost:8000/api";

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createTask(url: string, platforms: string[], image?: File) {
  const form = new FormData();
  form.append("url", url);
  form.append("platforms", platforms.join(","));
  const data = await request(`${BASE}/tasks`, { method: "POST", body: form });

  // 如果有参考图，任务创建后再上传
  if (image && data.task_id) {
    const imgForm = new FormData();
    imgForm.append("file", image);
    await request(`${BASE}/tasks/${data.task_id}/ref-image`, { method: "POST", body: imgForm });
  }
  return data;
}

export async function getTask(taskId: string) {
  return request(`${BASE}/tasks/${taskId}`);
}

export async function uploadRefImage(taskId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request(`${BASE}/tasks/${taskId}/ref-image`, { method: "POST", body: form });
}

export async function submitStyle(taskId: string, style: Record<string, string>) {
  return request(`${BASE}/tasks/${taskId}/style`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(style),
  });
}

export async function confirmStoryboard(taskId: string) {
  return request(`${BASE}/tasks/${taskId}/storyboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: true }),
  });
}
