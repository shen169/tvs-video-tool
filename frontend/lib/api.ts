// 通过 Next.js rewrites 代理到后端，规避跨域和环境变量问题
const BASE = "/api/backend";

export async function listTasks() {
  return request(`${BASE}/tasks`);
}

export class PaymentRequiredError extends Error {
  constructor(
    message: string,
    public required: number,
    public current: number,
  ) {
    super(message);
    this.name = "PaymentRequiredError";
  }
}

async function request(url: string, options?: RequestInit) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e: any) {
    throw new Error(`网络请求失败: ${e.message || '请确认后端服务已启动'}`);
  }

  // 402 点数不足 — 抛特定错误
  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    const detail = body.detail || {};
    throw new PaymentRequiredError(
      detail.error || "insufficient_credits",
      detail.required || 0,
      detail.current || 0,
    );
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      const detail = body.detail;
      // FastAPI 422 返回数组 detail → 提取第一条 msg 或用 status 文本
      const msg = typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ")
        : (detail ? JSON.stringify(detail) : `HTTP ${res.status}`);
      throw new Error(msg);
    }
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

export async function updateScripts(taskId: string, scripts: Record<string, any[]>) {
  return request(`${BASE}/tasks/${taskId}/scripts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scripts }),
  });
}

export async function confirmScripts(taskId: string) {
  return request(`${BASE}/tasks/${taskId}/confirm-scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════════════

const TOKEN_KEY = "tvs_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStoredToken(): string | null {
  return getToken();
}

export async function register(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function passwordLogin(password: string) {
  const res = await fetch(`${BASE}/auth/password-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@tvs.internal", password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Password login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function getMe() {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/login";
}

// ═══════════════════════════════════════════════════════════════════════
// Credits
// ═══════════════════════════════════════════════════════════════════════

export async function getPricePlans() {
  const res = await fetch(`${BASE}/credits/prices`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function createCheckout(planId: string) {
  const res = await fetch(`${BASE}/credits/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Checkout failed");
  }
  return res.json();
}

export async function getCreditHistory() {
  const res = await fetch(`${BASE}/credits/history`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
