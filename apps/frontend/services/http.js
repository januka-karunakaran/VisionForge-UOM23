// ─────────────────────────────────────────────────────────
// http.js  —  Core fetch utility & API base resolution
// ─────────────────────────────────────────────────────────

const DEFAULT_API_BASE = "http://localhost:8080/api";

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveApiBase() {
  const envBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
  if (envBase) {
    // Auto-append /api if not already present so service paths like
    // "/auth/login" route correctly to the Spring Boot /api/auth/login endpoint
    return envBase.endsWith("/api") ? envBase : `${envBase}/api`;
  }

  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1" &&
    window.location.hostname !== "::1"
  ) {
    const { protocol, hostname } = window.location;
    const safeProtocol = protocol === "https:" ? "https:" : "http:";
    return `${safeProtocol}//${hostname}:8080/api`;
  }

  return DEFAULT_API_BASE;
}

export const API_BASE = resolveApiBase();


// ── Helpers ─────────────────────────────────────────────

function buildApiBaseCandidates() {
  const candidates = [];
  const seen = new Set();

  const add = (value) => {
    const normalized = normalizeApiBase(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  add(API_BASE);
  if (API_BASE !== DEFAULT_API_BASE) add(DEFAULT_API_BASE);
  return candidates;
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  const text = await response.text();
  return text || null;
}

export function isRecoverableNetworkError(error) {
  return (
    error instanceof TypeError ||
    /Failed to fetch|NetworkError|Load failed/i.test(
      String(error?.message || "")
    )
  );
}

function shouldSilenceRecoverablePath(path) {
  return path === "/company/projects" || path === "/v1/clients/list";
}

export function getStoredUser() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("crms_user") || "{}");
  } catch {
    return {};
  }
}

export function getCompanyId(passedId) {
  if (passedId) return passedId;
  const user = getStoredUser();
  return user?.id || localStorage.getItem("companyId") || null;
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("crms_token") || localStorage.getItem("token");
}

// ── Core request function ───────────────────────────────

export async function request(path, options = {}) {
  const {
    baseUrl = API_BASE,
    headers: customHeaders = {},
    suppressNetworkErrorLog = false,
    ...rest
  } = options;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("crms_token") : null;
  const baseCandidates =
    baseUrl === API_BASE ? buildApiBaseCandidates() : [baseUrl];
  let lastError = null;
  const isFormDataBody =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  for (const candidateBase of baseCandidates) {
    try {
      const response = await fetch(`${candidateBase}${path}`, {
        ...rest,
        ...(isFormDataBody ? {} : { body: rest.body }),
        headers: {
          ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...customHeaders,
        },
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        const attemptedUrl = `${candidateBase}${path}`;
        try {
          const errorData = await parseResponse(response);
          if (typeof errorData === "string") {
            message = errorData || message;
          } else if (errorData && typeof errorData === "object") {
            message = errorData.message || errorData.error || message;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(`${message} (url: ${attemptedUrl})`);
      }

      return await parseResponse(response);
    } catch (err) {
      lastError = err;
      const isNetworkError = isRecoverableNetworkError(err);
      const isSilentRecoverablePath = shouldSilenceRecoverablePath(path);

      if (
        !suppressNetworkErrorLog &&
        !isSilentRecoverablePath &&
        (!isNetworkError ||
          candidateBase === baseCandidates[baseCandidates.length - 1])
      ) {
        console.error(`Request failed for ${path}:`, err);
      }

      if (!isNetworkError) throw err;
    }
  }

  if (
    lastError &&
    isRecoverableNetworkError(lastError) &&
    shouldSilenceRecoverablePath(path)
  ) {
    return [];
  }

  if (lastError && lastError instanceof Error) {
    throw new Error(`${lastError.message} (path: ${path})`);
  }

  throw new Error(`Request failed for ${path}`);
}
