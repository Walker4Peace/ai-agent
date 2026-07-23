import React from "react";
import { Link, useParams } from "wouter";
import {
  useGetExtension,
  useUpdateExtension,
  useListAgentConfigs,
  getGetExtensionQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Phone, Server, Play, Square, RotateCcw, Terminal, Loader2, AlertCircle, Bot } from "lucide-react";
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

const agentSchema = z.object({
  agentConfigId: z.string(),
});

export default function ExtensionDetail() {
  const { id } = useParams();
  const extensionId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showLogs, setShowLogs] = React.useState(false);

  const { data: extension, isLoading } = useGetExtension(extensionId, {
    query: { enabled: !!extensionId, queryKey: getGetExtensionQueryKey(extensionId) }
  });

  const { data: agentConfigs } = useListAgentConfigs();
  const updateExtension = useUpdateExtension();

  const { data: deployStatus, isLoading: statusLoading } = useDeployStatus(extensionId, !!extensionId);
  const { data: logs } = useDeployLogs(extensionId, showLogs);

  const start = useStartExtension(extensionId);
  const stop = useStopExtension(extensionId);
  const restart = useRestartExtension(extensionId);

  const isRunning = deployStatus?.status === "registered" || deployStatus?.status === "starting";
  const isStarting = deployStatus?.status === "starting";

  const agentForm = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: { agentConfigId: "none" },
  });

  React.useEffect(() => {
    if (extension) {
      agentForm.reset({
        agentConfigId: extension.agentConfigId ? extension.agentConfigId.toString() : "none",
      });
    }
  }, [extension, agentForm]);

  const handleAction = (
    action: typeof start | typeof stop | typeof restart,
    label: string
  ) => {
    action.mutate(undefined, {
      onSuccess: () => toast({ title: `${label} succeeded` }),
      onError: (e) => toast({ variant: "destructive", title: `${label} failed`, description: e.message }),
    });
  };

  const handleAgentSave = (values: z.infer<typeof agentSchema>) => {
    if (!extension) return;
    const agentConfigId = values.agentConfigId === "none" ? null : Number(values.agentConfigId);
    updateExtension.mutate(
      {
        id: extensionId,
        data: {
          extensionNumber: extension.extensionNumber,
          sipUsername: extension.sipUsername,
          sipAuthId: extension.sipAuthId,
          sipPassword: extension.sipPassword,
          clientId: extension.clientId ?? null,
          agentConfigId,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetExtensionQueryKey(extensionId) });
          toast({ title: "Agent updated" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to update agent" }),
      }
    );
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
                SIP Agent
              </CardTitle>
              <CardDescription>
                {hasAgentConfig
                  ? "Deploy and manage this extension's AI voice agent."
                  : "Assign an AI Agent below before deploying."}
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
                ["SIP Domain", extension.client?.sipDomain || "—  (set on IPBX)"],
                ["SIP Server", extension.client?.sipServer || "—  (set on IPBX)"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground font-medium shrink-0">{label}</dt>
                  <dd className="font-mono text-xs text-right truncate max-w-[200px]">{value}</dd>
                </div>
              ))}
            </dl>
            {extension.client && (
              <div className="mt-3 pt-3 border-t">
                <Link href={`/clients/${extension.clientId}`} className="text-xs text-primary hover:underline">
                  ↗ {extension.client.name}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Agent Assignment */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> AI Agent</CardTitle>
              {extension.agentConfig && <ProviderBadge provider={extension.agentConfig.provider} />}
            </div>
          </CardHeader>
          <CardContent>
            <Form {...agentForm}>
              <form onSubmit={agentForm.handleSubmit(handleAgentSave)} className="space-y-4">
                <FormField
                  control={agentForm.control}
                  name="agentConfigId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Agent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Agent</SelectItem>
                          {agentConfigs?.map((a) => (
                            <SelectItem key={a.id} value={a.id.toString()}>
                              {a.name} ({a.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {extension.agentConfig && (
                  <>
                    <Separator />
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{extension.agentConfig.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">API Key</dt><dd className="font-mono text-xs">{maskString(extension.agentConfig.apiKey)}</dd></div>
                      {extension.agentConfig.modelId && <div className="flex justify-between"><dt className="text-muted-foreground">Model</dt><dd className="text-xs">{extension.agentConfig.modelId}</dd></div>}
                      {extension.agentConfig.voiceId && <div className="flex justify-between"><dt className="text-muted-foreground">Voice</dt><dd className="text-xs">{extension.agentConfig.voiceId}</dd></div>}
                    </dl>
                    <div className="flex justify-end">
                      <Link href={`/agent-configs/${extension.agentConfig.id}/edit`}>
                        <Button variant="ghost" size="sm" type="button">Edit Agent</Button>
                      </Link>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  {!extension.agentConfig && (
                    <Link href="/agent-configs/new">
                      <Button variant="outline" size="sm" type="button">Create New Agent</Button>
                    </Link>
                  )}
                  <Button size="sm" type="submit" disabled={updateExtension.isPending}>
                    {updateExtension.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
