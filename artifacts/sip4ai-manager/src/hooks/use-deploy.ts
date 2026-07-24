import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DeployStatus {
  extensionId: number;
  status: "stopped" | "starting" | "registered" | "error";
  pid: number | null;
  sipLocalPort: number | null;
  httpPort: number | null;
  serviceName: string | null;
  sipRegistered: boolean;
  lastStartedAt: string | null;
  lastStoppedAt: string | null;
  lastError: string | null;
  uptimeSeconds: number | null;
}

async function apiFetch(path: string, method = "GET") {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

export function useDeployStatus(extensionId: number, enabled = true) {
  return useQuery<DeployStatus>({
    queryKey: ["deploy-status", extensionId],
    queryFn: () => apiFetch(`/api/deploy/${extensionId}/status`),
    refetchInterval: 3000,
    enabled: enabled && !!extensionId,
  });
}

export function useAllDeployStatuses() {
  return useQuery<DeployStatus[]>({
    queryKey: ["deploy-status-all"],
    queryFn: () => apiFetch("/api/deploy/all"),
    refetchInterval: 5000,
  });
}

export function useDeployLogs(extensionId: number, enabled = false, live = false) {
  return useQuery<{ extensionId: number; lines: string[] }>({
    queryKey: ["deploy-logs", extensionId],
    queryFn: () => apiFetch(`/api/deploy/${extensionId}/logs`),
    refetchInterval: (enabled && live) ? 2000 : false,
    enabled: enabled && !!extensionId,
  });
}

function useDeployAction(extensionId: number, action: "start" | "stop" | "restart") {
  const qc = useQueryClient();
  return useMutation<DeployStatus>({
    mutationFn: () => apiFetch(`/api/deploy/${extensionId}/${action}`, "POST"),
    onSuccess: (data) => {
      qc.setQueryData(["deploy-status", extensionId], data);
      qc.invalidateQueries({ queryKey: ["deploy-status-all"] });
    },
  });
}

export function useStartExtension(extensionId: number) {
  return useDeployAction(extensionId, "start");
}
export function useStopExtension(extensionId: number) {
  return useDeployAction(extensionId, "stop");
}
export function useRestartExtension(extensionId: number) {
  return useDeployAction(extensionId, "restart");
}

export function statusLabel(status: DeployStatus["status"]) {
  switch (status) {
    case "registered": return "Registered";
    case "starting":   return "Starting…";
    case "error":      return "Error";
    default:           return "Stopped";
  }
}

export function statusColor(status: DeployStatus["status"]) {
  switch (status) {
    case "registered": return "text-green-600";
    case "starting":   return "text-yellow-500";
    case "error":      return "text-red-500";
    default:           return "text-black dark:text-white";
  }
}
