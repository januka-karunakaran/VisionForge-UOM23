const DEFAULT_API_BASE = "http://localhost:8080/api";

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveApiBase() {
  const envBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
  if (envBase) {
    return envBase;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const safeProtocol = protocol === "https:" ? "https:" : "http:";

    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1") {
      return `${safeProtocol}//${hostname}:8080/api`;
    }
  }

  return DEFAULT_API_BASE;
}

const API_BASE = resolveApiBase();

function buildApiBaseCandidates() {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (value) => {
    const normalized = String(value || "").trim().replace(/\/+$/, "");
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  addCandidate(API_BASE);

  if (API_BASE !== DEFAULT_API_BASE) {
    addCandidate(DEFAULT_API_BASE);
  }

  return candidates;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  const text = await response.text();
  return text || null;
}

function isRecoverableNetworkError(error) {
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

async function request(path, options = {}) {
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

  for (const candidateBase of baseCandidates) {
    try {
      const response = await fetch(`${candidateBase}${path}`, {
        ...rest,
        headers: {
          "Content-Type": "application/json",
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

      if (!isNetworkError) {
        throw err;
      }
    }
  }

  if (
    lastError &&
    isRecoverableNetworkError(lastError) &&
    shouldSilenceRecoverablePath(path)
  ) {
    return [];
  }

  // Surface the last error with the path for easier debugging.
  if (lastError && lastError instanceof Error) {
    throw new Error(`${lastError.message} (path: ${path})`);
  }

  throw new Error(`Request failed for ${path}`);
}

function getStoredUser() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem("crms_user") || "{}");
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    return {};
  }
}

function getCompanyId(passedId) {
  if (passedId) return passedId;
  const user = getStoredUser();
  return user?.id || localStorage.getItem("companyId") || null;
}

// AUTH
export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, newPassword) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function changePassword(payload) {
  const normalizedPayload = {
    currentPassword: payload?.currentPassword ?? "",
    newPassword: payload?.newPassword ?? "",
    confirmPassword: payload?.confirmPassword ?? "",
  };

  try {
    return await request("/user/change-password", {
      method: "POST",
      body: JSON.stringify(normalizedPayload),
      suppressNetworkErrorLog: true,
    });
  } catch (error) {
    if (/Not Found|HTTP 404/i.test(String(error?.message || ""))) {
      return request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(normalizedPayload),
        suppressNetworkErrorLog: true,
      });
    }

    throw error;
  }
}

// DASHBOARD
export function getClientDashboard() {
  return request("/client/dashboard", {
    method: "GET",
  });
}

export function getCompanyDashboard(companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request("/company/dashboard", {
    method: "GET",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
  });
}

// PROPOSALS - CLIENT
export function getClientProposals() {
  return request("/client/proposals", {
    method: "GET",
  });
}

export function getClientProposalById(proposalId) {
  return request(`/client/proposals/${proposalId}`, {
    method: "GET",
  });
}

export function acceptProposal(proposalId) {
  return request(`/client/proposals/${proposalId}/accept`, {
    method: "PATCH",
  });
}

export function rejectProposal(proposalId, rejectionReason) {
  return request(`/client/proposals/${proposalId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason }),
  });
}

// REGISTERED CLIENTS
export async function getRegisteredClients() {
  try {
    return await request("/v1/clients/list", {
      method: "GET",
      suppressNetworkErrorLog: true,
    });
  } catch (error) {
    if (isRecoverableNetworkError(error)) {
      return [];
    }

    throw error;
  }
}

// PROPOSALS - COMPANY
export function getCompanyProposals(companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request("/company/proposals", {
    method: "GET",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
  });
}

export function createCompanyProposal(payload, companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request("/company/proposals", {
    method: "POST",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
    body: JSON.stringify(payload),
  });
}

// PROJECTS - CLIENT
export function getClientProjects() {
  return request("/client/projects", {
    method: "GET",
  });
}

export function getClientProjectById(projectId) {
  return request(`/client/projects/${projectId}`, {
    method: "GET",
  });
}

// PROJECTS - COMPANY
export async function getCompanyProjects(companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("crms_token") : null;
    const response = await fetch(`${API_BASE}/company/projects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Company-Id": resolvedCompanyId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await parseResponse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError ||
      /Failed to fetch|NetworkError|Load failed/i.test(
        String(error?.message || "")
      );

    if (isNetworkError) {
      return [];
    }

    throw error;
  }
}

export function getCompanyProjectById(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return request(`/company/projects/${projectId}`, {
    method: "GET",
  });
}

// PRD / DOCUMENTS - CLIENT
export function getClientProjectPrd(projectId) {
  return request(`/client/projects/${projectId}/prd`, {
    method: "GET",
  });
}

export function getAllPrds() {
  return request("/prds", {
    method: "GET",
  });
}

// PRD / DOCUMENTS - COMPANY
export async function fetchPrds(projectId) {
  const list = await getAllPrds();

  if (!projectId) {
    return list;
  }

  return Array.isArray(list)
    ? list.filter((item) => String(item.projectId || "") === String(projectId))
    : [];
}

export function fetchPrdById(prdId) {
  if (!prdId) {
    throw new Error("PRD ID is required");
  }

  return request(`/prds/${prdId}`, {
    method: "GET",
  });
}

export function createPrd(projectId, payload) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return request("/prds", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      projectId,
    }),
  });
}

export function updatePrd(prdId, payload) {
  if (!prdId) {
    throw new Error("PRD ID is required");
  }

  return request(`/prds/${prdId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function downloadDocument(documentId) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("crms_token") : null;

  try {
    const response = await fetch(
      `${API_BASE}/documents/${documentId}/download`,
      {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      try {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
      } catch (e) {
        console.error("Error parsing download error response:", e);
      }

      throw new Error(`Download failed: ${errorMessage}`);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error("Download failed: Received empty file");
    }

    const contentDisposition = response.headers.get("content-disposition") || "";
    const contentType = response.headers.get("content-type") || "";

    function parseContentDisposition(header) {
      if (!header) return null;

      // RFC 5987: filename*=UTF-8''%E4%BD%A0%E5%A5%BD.txt
      const filenameStarMatch = header.match(/filename\*=UTF-8''([^;\n]+)/i);
      if (filenameStarMatch && filenameStarMatch[1]) {
        try {
          return decodeURIComponent(filenameStarMatch[1].trim());
        } catch (e) {
          // fallback to raw value
          return filenameStarMatch[1].trim();
        }
      }

      // Regular filename="..." or filename=...
      const filenameMatch = header.match(/filename\s*=\s*"?([^";\n]+)"?/i);
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1].trim();
      }

      return null;
    }

    return {
      blob,
      fileName: parseContentDisposition(contentDisposition) || null,
      contentType,
      contentDispositionHeader: contentDisposition,
    };
  } catch (err) {
    console.error(`Download failed for document ${documentId}:`, err);
    throw err;
  }
}

// CHANGE REQUESTS - CLIENT
export function createClientChangeRequest(projectId, payload) {
  return request(`/client/projects/${projectId}/change-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getClientChangeRequests() {
  return request("/client/change-requests", {
    method: "GET",
  });
}

// CHANGE REQUESTS - COMPANY
export function getCompanyChangeRequests(companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request("/company/change-requests", {
    method: "GET",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
  });
}

export function getCompanyChangeRequestsByProject(projectId, companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request(`/company/projects/${projectId}/change-requests`, {
    method: "GET",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
  });
}

export function getCompanyChangeRequestsByProjectAndPrd(
  projectId,
  prdId,
  companyId,
) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request(
    `/company/projects/${projectId}/prds/${prdId}/change-requests`,
    {
      method: "GET",
      headers: {
        "X-Company-Id": resolvedCompanyId,
      },
    },
  );
}

export function decideCompanyChangeRequest(
  changeRequestId,
  payload,
  companyId,
) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request(`/company/change-requests/${changeRequestId}/decision`, {
    method: "PATCH",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
    body: JSON.stringify(payload),
  });
}

export function markCompanyChangeRequestImplemented(
  changeRequestId,
  payload,
  companyId,
) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request(`/company/change-requests/${changeRequestId}/implemented`, {
    method: "PATCH",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
    body: JSON.stringify(payload),
  });
}

export async function downloadCompanyChangeRequest(changeRequestId) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("crms_token") : null;

  const response = await fetch(
    `${API_BASE}/company/change-requests/${changeRequestId}/download`,
    {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("Download failed: Received empty file");
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  const contentType = response.headers.get("content-type") || "";

  function parseContentDisposition(header) {
    if (!header) return null;

    const filenameStarMatch = header.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (filenameStarMatch && filenameStarMatch[1]) {
      try {
        return decodeURIComponent(filenameStarMatch[1].trim());
      } catch (e) {
        return filenameStarMatch[1].trim();
      }
    }

    const filenameMatch = header.match(/filename\s*=\s*"?([^";\n]+)"?/i);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].trim();
    }

    return null;
  }

  return {
    blob,
    fileName: parseContentDisposition(contentDisposition) || null,
    contentType,
    contentDispositionHeader: contentDisposition,
  };
}

// VERSION HISTORY - COMPANY
export function getCompanyVersionHistory(companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request("/company/version-history", {
    method: "GET",
    headers: {
      "X-Company-Id": resolvedCompanyId,
    },
  });
}

export function getCompanyVersionHistoryEntries(projectId, prdId, companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  if (!resolvedCompanyId) {
    throw new Error("Company ID is required");
  }

  return request(
    `/company/version-history/projects/${projectId}/prds/${prdId}`,
    {
      method: "GET",
      headers: {
        "X-Company-Id": resolvedCompanyId,
      },
    },
  );
}

// NOTIFICATIONS
export function getNotifications() {
  return request("/notifications", {
    method: "GET",
  });
}

export function getUnreadNotificationCount() {
  return request("/notifications/unread-count", {
    method: "GET",
  });
}

export function markNotificationAsRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export const getClientNotifications = getNotifications;
export const getClientUnreadNotificationCount = getUnreadNotificationCount;

// KANBAN HELPERS
function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("crms_token") || localStorage.getItem("token");
}

function normalizeKanbanUserRole(userRole) {
  const normalizedRole = String(userRole || "")
    .trim()
    .toUpperCase();
  return normalizedRole === "CLIENT" || normalizedRole === "ROLE_CLIENT"
    ? "client"
    : "company";
}

function buildKanbanRequestHeaders(endpoint) {
  const headers = {};
  const token = getAuthToken();
  const companyId = getCompanyId();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (companyId && endpoint.includes("/company/")) {
    headers["X-Company-Id"] = companyId;
  }

  return headers;
}

async function parseKanbanResponse(response) {
  if (!response.ok) {
    const error = new Error(
      `Request failed with status code ${response.status}`,
    );
    error.response = {
      status: response.status,
      data: await response.text().catch(() => ""),
    };
    throw error;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function sendKanbanRequest(method, endpoint, data) {
  const headers = buildKanbanRequestHeaders(endpoint);

  const options = {
    method,
    credentials: "include",
    headers,
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
    options.headers = {
      ...headers,
      "Content-Type": "application/json",
    };
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  return parseKanbanResponse(response);
}

async function sendKanbanMultipartRequest(method, endpoint, formData) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    body: formData,
    credentials: "include",
    headers: buildKanbanRequestHeaders(endpoint),
  });

  return parseKanbanResponse(response);
}

export async function getCompanyUsers(companyId) {
  const resolvedCompanyId = getCompanyId(companyId);

  const endpoint = "/company/kanban/assignees";
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...buildKanbanRequestHeaders(endpoint),
      ...(resolvedCompanyId ? { "X-Company-Id": resolvedCompanyId } : {}),
    },
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  return (await parseKanbanResponse(response)) || [];
}

export async function getAssignedKanbanProjects() {
  try {
    return await sendKanbanRequest("GET", "/company/kanban/assigned-projects");
  } catch (error) {
    if ([401, 403, 404].includes(error?.response?.status)) {
      return [];
    }

    return [];
  }
}

function projectIdMatches(project, projectId) {
  const normalizedProjectId = String(projectId || "").trim();
  const candidateId = String(project?.id || project?.pid || "").trim();
  return Boolean(normalizedProjectId) && candidateId === normalizedProjectId;
}

export async function getKanbanProjectById(projectId, userRole) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const role = normalizeKanbanUserRole(userRole);
  const loaders =
    role === "client"
      ? [() => getClientProjects(), () => getAssignedKanbanProjects()]
      : [() => getCompanyProjects(), () => getAssignedKanbanProjects()];

  for (const loadProjects of loaders) {
    try {
      const projects = await loadProjects();
      const matchedProject = Array.isArray(projects)
        ? projects.find((project) => projectIdMatches(project, projectId))
        : null;

      if (matchedProject) {
        return matchedProject;
      }
    } catch {
      // Best-effort lookup for kanban title/description only.
    }
  }

  return null;
}

export function getProjectById(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return request(`/projects/${projectId}`, {
    method: "GET",
  });
}

export async function createKanbanBoard(projectId, data) {
  try {
    return await sendKanbanRequest(
      "POST",
      `/company/kanban/${projectId}/board`,
      data,
    );
  } catch (error) {
    if (error?.response?.status === 404) {
      return getKanbanBoard(projectId);
    }

    throw error;
  }
}

export async function getKanbanBoard(projectId) {
  try {
    return await sendKanbanRequest("GET", `/company/kanban/${projectId}`);
  } catch (error) {
    if (error?.response?.status === 404) {
      return { tasksByStatus: [] };
    }

    throw error;
  }
}

function normalizeTaskStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  if (normalized === "INPROGRESS") return "IN_PROGRESS";
  if (normalized === "REVIEW") return "IN_REVIEW";
  if (normalized === "COMPLETE" || normalized === "COMPLETED") return "DONE";

  if (
    normalized === "TODO" ||
    normalized === "IN_PROGRESS" ||
    normalized === "IN_REVIEW" ||
    normalized === "DONE"
  ) {
    return normalized;
  }

  return "TODO";
}

export async function getTasksByBoard(projectId) {
  try {
    return await sendKanbanRequest("GET", `/company/kanban/${projectId}/tasks`);
  } catch (error) {
    if (error?.response?.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function getKanbanBoardWithTasks(projectId) {
  const [board, tasks] = await Promise.all([
    getKanbanBoard(projectId),
    getTasksByBoard(projectId),
  ]);

  const groupedTasks = {
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
  };

  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const normalizedStatus = normalizeTaskStatus(task?.status);
    groupedTasks[normalizedStatus].push({
      ...task,
      status: normalizedStatus,
    });
  });

  return {
    ...(board || {}),
    name: board?.name || board?.title || "Kanban Board",
    tasksByStatus: Object.entries(groupedTasks).map(([status, taskList]) => ({
      status,
      tasks: taskList,
    })),
  };
}

export async function createTask(projectId, boardId, data) {
  if (!projectId) throw new Error("Project ID is missing");

  return sendKanbanRequest("POST", `/company/kanban/${projectId}/tasks`, data);
}

export async function updateTask(projectId, taskId, data) {
  if (!projectId) throw new Error("Project ID is missing");
  if (!taskId) throw new Error("Task ID is missing");

  return sendKanbanRequest(
    "PUT",
    `/company/kanban/${projectId}/tasks/${taskId}`,
    data,
  );
}

export async function updateTaskStatus(projectId, taskId, data) {
  if (!taskId) throw new Error("Task ID is missing");

  return sendKanbanRequest(
    "PUT",
    `/company/kanban/tasks/${taskId}/status`,
    data,
  );
}

export async function deleteTask(projectId, taskId) {
  if (!projectId) throw new Error("Project ID is missing");
  if (!taskId) throw new Error("Task ID is missing");

  return sendKanbanRequest(
    "DELETE",
    `/company/kanban/${projectId}/tasks/${taskId}`,
  );
}

export async function addTaskComment(projectId, taskId, comment) {
  if (!projectId) throw new Error("Project ID is missing");
  if (!taskId) throw new Error("Task ID is missing");

  return sendKanbanRequest(
    "POST",
    `/company/kanban/${projectId}/tasks/${taskId}/comments?comment=${encodeURIComponent(
      comment,
    )}`,
  );
}
export function getClientProjectKanban(projectId) {
  return request(`/client/projects/${projectId}/kanban`, {
    method: "GET",
  });
}
export async function uploadTaskAttachments(projectId, taskId, files) {
  if (!Array.isArray(files) || files.length === 0) return null;

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  return sendKanbanMultipartRequest(
    "POST",
    `/company/kanban/${projectId}/tasks/${taskId}/attachments`,
    formData,
  );
}

export async function downloadTaskAttachment(
  projectId,
  taskId,
  attachmentId,
  fileName,
) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("crms_token") : null;
  const companyId = getCompanyId();
  const downloadUrl =
    `${API_BASE}/company/kanban/${encodeURIComponent(
      projectId,
    )}/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(
      attachmentId,
    )}`;

  const response = await fetch(downloadUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { "X-Company-Id": companyId } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }

    throw new Error(`Request failed with status code ${response.status}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const matchedFileName = contentDisposition.match(
    /filename\*?=(?:UTF-8'')?["']?([^;"']+)["']?/i,
  );
  const resolvedFileName =
    fileName ||
    (matchedFileName?.[1] ? decodeURIComponent(matchedFileName[1]) : "") ||
    "attachment";
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = resolvedFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(objectUrl);
  return true;
}
const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("crms_token") || localStorage.getItem("token");
};

export const getCurrentUserProfile = async () => {
  const token = getToken();

  const res = await fetch(`${API_BASE}/user-profile/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(
      `Profile API Error → status: ${res.status}, url: ${API_BASE}/user-profile/me, response: ${text}`
    );
    throw new Error(`Failed to fetch profile. Status: ${res.status}`);
  }

  return text ? JSON.parse(text) : {};
};

export const updateCurrentUserProfile = async (data) => {
  const token = getToken();

  const res = await fetch(`${API_BASE}/user-profile/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(
      `Profile Update Error → status: ${res.status}, url: ${API_BASE}/user-profile/me, response: ${text}`
    );
    throw new Error(`Failed to update profile. Status: ${res.status}`);
  }

  return text ? JSON.parse(text) : {};
};


export { API_BASE };
