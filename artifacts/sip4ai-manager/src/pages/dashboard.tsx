import React from "react";
import { Link } from "wouter";
import { useGetStats, useListExtensions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, Server, Activity, Play, RotateCcw } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import { useAllDeployStatuses, useStartExtension, useRestartExtension, statusLabel, statusColor, type DeployStatus } from "@/hooks/use-deploy";
import { useToast } from "@/hooks/use-toast";

function AgentRow({ ext, status }: { ext: { id: number; extensionNumber: string; displayName?: string | null; agentConfig?: { provider: string } | null }; status: DeployStatus | undefined }) {
  const { toast } = useToast();
  const start = useStartExtension(ext.id);
  const restart = useRestartExtension(ext.id);
  const isRunning = status?.status === "registered" || status?.status === "starting";

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
        {status ? (
          <span className={`text-sm font-medium ${statusColor(status.status)}`}>
            {statusLabel(status.status)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">⚫ Stopped</span>
        )}
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
          <Link href="/clients"><Button variant="outline">Manage Clients</Button></Link>
          <Link href="/extensions"><Button>Add Extension</Button></Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
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
