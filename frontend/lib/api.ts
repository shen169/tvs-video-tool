// 通过 Next.js rewrites 代理到后端，规避跨域和环境变量问题
const BASE = "/api/backend";

export async function listTasks() {
  return request(`${BASE}/tasks`);
}

async function request(url: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (e: any) {
    throw new Error(`网络请求失败: ${e.message || '请确认后端服务已启动 (localhost:8000)'}`);
  }
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${res.status}: 请求失败`);
    }
    // 非 JSON 响应（如代理错误页面）
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || '后端服务不可用'}`);
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

export async function submitCreative(taskId: string, creative: Record<string, any>) {
  return request(`${BASE}/tasks/${taskId}/creative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creative),
  });
}

export async function confirmStoryboard(taskId: string) {
  return request(`${BASE}/tasks/${taskId}/storyboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: true }),
  });
}

export async function confirmRecommend(taskId: string, creative: any, style: any) {
  return request(`${BASE}/tasks/${taskId}/confirm-recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creative, style }),
  });
}

export async function rollbackTask(taskId: string, stage: string) {
  return request(`${BASE}/tasks/${taskId}/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
}

export async function regenerateRefImage(taskId: string) {
  return request(`${BASE}/tasks/${taskId}/regenerate-ref-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}
