import React from "react";
import { Link } from "wouter";
import { useGetStats, useListExtensions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, Server, Activity, Play, RotateCcw, Square, PhoneCall, PhoneOff, PhoneIncoming, Building } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import { useListClients } from "@workspace/api-client-react";
import { useAllDeployStatuses, useStartExtension, useStopExtension, useRestartExtension, statusLabel, statusColor, type DeployStatus } from "@/hooks/use-deploy";
import { useToast } from "@/hooks/use-toast";

interface CallEvent {
  extensionId: number;
  callId: string;
  event: "invite" | "answered" | "ended" | "connected_ai" | "error";
  timestamp: string;
  detail?: string;
}

interface CallEventsResponse {
  events: CallEvent[];
  activeCallCount: number;
}

function useCallEvents() {
  return useQuery<CallEventsResponse>({
    queryKey: ["call-events"],
    queryFn: async () => {
      const res = await fetch("/api/deploy/call-events");
      if (!res.ok) return { events: [], activeCallCount: 0 };
      return res.json();
    },
    refetchInterval: 3000,
  });
}

const EVENT_ICONS: Record<CallEvent["event"], React.ReactNode> = {
  invite: <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />,
  answered: <PhoneCall className="h-3.5 w-3.5 text-green-500" />,
  ended: <PhoneOff className="h-3.5 w-3.5 text-muted-foreground" />,
  connected_ai: <Activity className="h-3.5 w-3.5 text-purple-500" />,
  error: <PhoneOff className="h-3.5 w-3.5 text-red-500" />,
};

const EVENT_LABELS: Record<CallEvent["event"], string> = {
  invite: "Incoming call",
  answered: "Answered",
  ended: "Call ended",
  connected_ai: "AI responded",
  error: "Error",
};

function AgentRow({ ext, status }: { ext: { id: number; extensionNumber: string; displayName?: string | null; agentConfig?: { provider: string } | null }; status: DeployStatus | undefined }) {
  const { toast } = useToast();
  const start = useStartExtension(ext.id);
  const stop = useStopExtension(ext.id);
  const restart = useRestartExtension(ext.id);
  const isRunning = status?.status === "registered" || status?.status === "starting";
  const currentStatus = status?.status ?? "stopped";

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-mono font-semibold text-sm">{ext.extensionNumber}</span>
          <span className="text-xs text-muted-foreground">{ext.displayName || "—"}</span>
        </div>
        <ProviderBadge provider={ext.agentConfig?.provider} />
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${statusColor(currentStatus)}`}>
          {statusLabel(currentStatus)}
        </span>
        {status?.uptimeSeconds != null && (
          <span className="text-xs text-muted-foreground">
            {Math.floor(status.uptimeSeconds / 60)}m {status.uptimeSeconds % 60}s
          </span>
        )}
        <div className="flex gap-1">
          {!isRunning ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              disabled={!ext.agentConfig || start.isPending}
              onClick={() => start.mutate(undefined, {
                onError: (e) => toast({ variant: "destructive", title: "Deploy failed", description: e.message })
              })}
            >
              <Play className="h-3 w-3" /> Deploy
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                disabled={stop.isPending}
                onClick={() => stop.mutate(undefined, {
                  onError: (e) => toast({ variant: "destructive", title: "Stop failed", description: e.message })
                })}
              >
                <Square className="h-3 w-3" /> Stop
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                disabled={restart.isPending}
                onClick={() => restart.mutate(undefined, {
                  onError: (e) => toast({ variant: "destructive", title: "Restart failed", description: e.message })
                })}
              >
                <RotateCcw className="h-3 w-3" /> Restart
              </Button>
            </>
          )}
          <Link href={`/extensions/${ext.id}`}>
            <Button size="sm" variant="ghost" className="h-7 text-xs">Details</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();
  const { data: extensions } = useListExtensions();
  const { data: allStatuses } = useAllDeployStatuses();
  const { data: callEvents } = useCallEvents();

  const statusMap = React.useMemo(() => {
    const m = new Map<number, DeployStatus>();
    for (const s of allStatuses ?? []) m.set(s.extensionId, s);
    return m;
  }, [allStatuses]);

  const registeredCount = (allStatuses ?? []).filter(s => s.status === "registered").length;
  const runningCount = (allStatuses ?? []).filter(s => s.status === "registered" || s.status === "starting").length;

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardHeader><CardTitle className="text-sm font-medium">Loading…</CardTitle></CardHeader><CardContent><div className="h-8 w-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your AI voice agent deployments.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ipbxs"><Button variant="outline">Manage IPBXs</Button></Link>
          <Link href="/extensions"><Button>Add Extension</Button></Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPBXs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.totalClients}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extensions</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.totalExtensions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🟢 Registered</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{registeredCount}</div>
            <p className="text-xs text-muted-foreground">{runningCount} total running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Configs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.extensionsByProvider?.length ?? 0}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Agent Status */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!extensions || extensions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No extensions yet.</p>
                <Link href="/extensions"><Button variant="link" className="mt-1">Add your first extension</Button></Link>
              </div>
            ) : (
              <div>
                {extensions.map(ext => (
                  <AgentRow key={ext.id} ext={ext} status={statusMap.get(ext.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calls Information */}
        <Card className="col-span-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Calls Information
              </CardTitle>
              <div className="flex items-center gap-2">
                {callEvents && (
                  <Badge variant={callEvents.activeCallCount > 0 ? "default" : "secondary"} className="gap-1">
                    {callEvents.activeCallCount > 0 ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    ) : null}
                    {callEvents.activeCallCount} active call{callEvents.activeCallCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">auto-refreshes every 3s</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!callEvents || callEvents.events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No call events yet.</p>
                <p className="text-xs mt-1">Events appear here when extensions are deployed and receive calls.</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y rounded-md border overflow-hidden">
                {callEvents.events.map((ev, i) => {
                  const ext = extensions?.find(e => e.id === ev.extensionId);
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="mt-0.5 shrink-0">{EVENT_ICONS[ev.event]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{EVENT_LABELS[ev.event]}</span>
                          {ext && (
                            <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                              ext {ext.extensionNumber}
                            </Badge>
                          )}
                          {ev.event !== "ended" && ev.event !== "invite" && ev.detail && (
                            <span className="text-xs text-muted-foreground truncate max-w-xs italic">"{ev.detail}"</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          call {ev.callId.slice(0, 8)}…
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </time>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        {stats.extensionsByProvider && stats.extensionsByProvider.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Provider Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {stats.extensionsByProvider.map((p: { provider: string; count: number }) => (
                <div key={p.provider} className="flex items-center justify-between">
                  <ProviderBadge provider={p.provider} />
                  <Badge variant="secondary">{p.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
