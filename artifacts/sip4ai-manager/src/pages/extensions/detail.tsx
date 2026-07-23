import React from "react";
import { Link, useParams } from "wouter";
import {
  useGetExtension,
  generateConfig,
  generateServiceFile,
  getGetExtensionQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, Server, FileJson, TerminalSquare, Play, Square, RotateCcw, Terminal, Loader2, AlertCircle } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import { useToast } from "@/hooks/use-toast";
import { maskString } from "@/lib/utils";
import {
  useDeployStatus,
  useDeployLogs,
  useStartExtension,
  useStopExtension,
  useRestartExtension,
  statusLabel,
  statusColor,
} from "@/hooks/use-deploy";

export default function ExtensionDetail() {
  const { id } = useParams();
  const extensionId = Number(id);
  const { toast } = useToast();

  const [showLogs, setShowLogs] = React.useState(false);
  const [downloadingJson, setDownloadingJson] = React.useState(false);
  const [downloadingService, setDownloadingService] = React.useState(false);

  const { data: extension, isLoading } = useGetExtension(extensionId, {
    query: { enabled: !!extensionId, queryKey: getGetExtensionQueryKey(extensionId) }
  });

  const { data: deployStatus, isLoading: statusLoading } = useDeployStatus(extensionId, !!extensionId);
  const { data: logs } = useDeployLogs(extensionId, showLogs);

  const start = useStartExtension(extensionId);
  const stop = useStopExtension(extensionId);
  const restart = useRestartExtension(extensionId);

  const isRunning = deployStatus?.status === "registered" || deployStatus?.status === "starting";
  const isStarting = deployStatus?.status === "starting";

  const handleAction = (
    action: typeof start | typeof stop | typeof restart,
    label: string
  ) => {
    action.mutate(undefined, {
      onSuccess: () => toast({ title: `${label} succeeded` }),
      onError: (e) => toast({ variant: "destructive", title: `${label} failed`, description: e.message }),
    });
  };

  const handleDownloadConfig = async () => {
    try {
      setDownloadingJson(true);
      const res = await generateConfig(extensionId);
      const blob = new Blob([JSON.stringify(res.content, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename || "config.json";
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      toast({ title: "Config Downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Download Failed" });
    } finally { setDownloadingJson(false); }
  };

  const handleDownloadService = async () => {
    try {
      setDownloadingService(true);
      const res = await generateServiceFile(extensionId);
      const blob = new Blob([res.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename || `sip4ai-${extension?.extensionNumber}.service`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      toast({ title: "Service File Downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Download Failed" });
    } finally { setDownloadingService(false); }
  };

  if (isLoading) return <div className="p-8 animate-pulse text-muted-foreground">Loading extension data...</div>;
  if (!extension) return <div className="p-8 text-destructive">Extension not found.</div>;

  const hasAgentConfig = !!extension.agentConfig;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/extensions">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Extension {extension.extensionNumber}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{extension.displayName || "No display name"}</p>
          </div>
        </div>
        {!statusLoading && deployStatus && (
          <Badge variant="outline" className={`text-sm px-3 py-1 font-semibold ${statusColor(deployStatus.status)}`}>
            {statusLabel(deployStatus.status)}
          </Badge>
        )}
      </div>

      {/* ── LIVE DEPLOYMENT PANEL ── */}
      <Card className={`border-l-4 ${isRunning ? "border-l-green-500" : deployStatus?.status === "error" ? "border-l-red-500" : "border-l-muted"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                SIP4AI Agent
              </CardTitle>
              <CardDescription>
                {hasAgentConfig
                  ? "Deploy and manage this extension's AI voice agent."
                  : "Add an Agent Config below before deploying."}
              </CardDescription>
            </div>
            {deployStatus && (
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                {deployStatus.pid && <p>PID: {deployStatus.pid}</p>}
                {deployStatus.uptimeSeconds != null && (
                  <p>Up {Math.floor(deployStatus.uptimeSeconds / 60)}m {deployStatus.uptimeSeconds % 60}s</p>
                )}
                {deployStatus.lastStartedAt && (
                  <p>Started: {new Date(deployStatus.lastStartedAt).toLocaleTimeString()}</p>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {deployStatus?.lastError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="font-mono text-xs break-all">{deployStatus.lastError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isRunning ? (
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={!hasAgentConfig || start.isPending}
                onClick={() => handleAction(start, "Deploy")}
              >
                {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {start.isPending ? "Deploying…" : "Deploy"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  disabled={stop.isPending}
                  onClick={() => handleAction(stop, "Stop")}
                >
                  {stop.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  Stop
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={restart.isPending}
                  onClick={() => handleAction(restart, "Restart")}
                >
                  {restart.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Restart
                </Button>
              </>
            )}
            {isStarting && (
              <span className="flex items-center gap-1 text-sm text-yellow-600">
                <Loader2 className="h-3 w-3 animate-spin" /> Waiting for SIP registration…
              </span>
            )}
            <Button
              variant="ghost"
              className="gap-2 ml-auto"
              onClick={() => setShowLogs(v => !v)}
            >
              <Terminal className="h-4 w-4" />
              {showLogs ? "Hide Logs" : "Show Logs"}
            </Button>
          </div>

          {showLogs && (
            <div className="rounded-md bg-black border border-muted overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b border-muted text-xs text-muted-foreground">
                <span>Process Logs</span>
                <span>{logs?.lines.length ?? 0} lines</span>
              </div>
              <div className="p-3 h-56 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
                {!logs?.lines.length ? (
                  <p className="text-muted-foreground italic">No logs yet. Deploy the agent to see output.</p>
                ) : (
                  logs.lines.map((line, i) => <p key={i}>{line}</p>)
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SIP Credentials */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> SIP Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {[
                ["Extension Number", extension.extensionNumber],
                ["SIP Username", extension.sipUsername],
                ["SIP Auth ID", extension.sipAuthId],
                ["SIP Password", maskString(extension.sipPassword)],
                ["SIP Domain", extension.sipDomain],
                ["SIP Server", extension.sipServer],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground font-medium shrink-0">{label}</dt>
                  <dd className="font-mono text-xs text-right truncate max-w-[200px]">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* AI Agent Config */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" /> AI Agent Config</CardTitle>
              {extension.agentConfig && <ProviderBadge provider={extension.agentConfig.provider} />}
            </div>
          </CardHeader>
          <CardContent>
            {!extension.agentConfig ? (
              <div className="text-sm text-muted-foreground space-y-3">
                <p>No AI config linked. Add one to enable deployment.</p>
                <Link href={`/agent-configs/new?extensionId=${extensionId}`}>
                  <Button size="sm">Add Agent Config</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground font-medium">Provider</dt><dd className="capitalize">{extension.agentConfig.provider}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground font-medium">API Key</dt><dd className="font-mono text-xs">{maskString(extension.agentConfig.apiKey)}</dd></div>
                  {extension.agentConfig.modelId && <div className="flex justify-between"><dt className="text-muted-foreground font-medium">Model</dt><dd className="text-xs">{extension.agentConfig.modelId}</dd></div>}
                  {extension.agentConfig.voiceId && <div className="flex justify-between"><dt className="text-muted-foreground font-medium">Voice</dt><dd className="text-xs">{extension.agentConfig.voiceId}</dd></div>}
                </dl>
                <Separator />
                <div className="flex justify-end">
                  <Link href={`/agent-configs/${extension.agentConfig.id}/edit`}>
                    <Button variant="outline" size="sm">Edit AI Config</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Download Assets */}
      {hasAgentConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Deployment Files</CardTitle>
            <CardDescription>Download config files to deploy on a remote server manually.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" className="gap-2 h-16 flex-1 flex-col items-center justify-center border-dashed" onClick={handleDownloadConfig} disabled={downloadingJson}>
              <FileJson className="h-5 w-5 text-blue-500" />
              <span className="text-xs">{downloadingJson ? "Generating…" : "config.json"}</span>
            </Button>
            <Button variant="outline" className="gap-2 h-16 flex-1 flex-col items-center justify-center border-dashed" onClick={handleDownloadService} disabled={downloadingService}>
              <TerminalSquare className="h-5 w-5 text-purple-500" />
              <span className="text-xs">{downloadingService ? "Generating…" : "Systemd Service"}</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
