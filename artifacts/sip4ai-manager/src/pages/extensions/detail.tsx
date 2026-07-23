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
import { ArrowLeft, Phone, Server, FileJson, TerminalSquare, AlertCircle } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import { useToast } from "@/hooks/use-toast";
import { maskString } from "@/lib/utils";

export default function ExtensionDetail() {
  const { id } = useParams();
  const extensionId = Number(id);
  const { toast } = useToast();
  
  const [downloadingJson, setDownloadingJson] = React.useState(false);
  const [downloadingService, setDownloadingService] = React.useState(false);

  const { data: extension, isLoading } = useGetExtension(extensionId, { 
    query: { enabled: !!extensionId, queryKey: getGetExtensionQueryKey(extensionId) } 
  });

  const handleDownloadConfig = async () => {
    try {
      setDownloadingJson(true);
      const res = await generateConfig(extensionId);
      
      const blob = new Blob([JSON.stringify(res.content, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || 'config.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Config Downloaded", description: "config.json has been saved." });
    } catch (err) {
      toast({ variant: "destructive", title: "Download Failed", description: "Could not generate config.json." });
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleDownloadService = async () => {
    try {
      setDownloadingService(true);
      const res = await generateServiceFile(extensionId);
      
      const blob = new Blob([res.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `sip4ai-${extension?.extensionNumber}.service`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Service File Downloaded", description: "Systemd service file has been saved." });
    } catch (err) {
      toast({ variant: "destructive", title: "Download Failed", description: "Could not generate service file." });
    } finally {
      setDownloadingService(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 animate-pulse text-muted-foreground">Loading extension data...</div>;
  }

  if (!extension) {
    return <div className="p-8 text-destructive">Extension not found.</div>;
  }

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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" />
              SIP Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground font-medium">Username</dt>
                <dd className="font-mono">{extension.sipUsername}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground font-medium">Auth ID</dt>
                <dd className="font-mono">{extension.sipAuthId}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground font-medium">Password</dt>
                <dd className="font-mono">{maskString(extension.sipPassword, 2)}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground font-medium">Domain</dt>
                <dd className="font-mono">{extension.sipDomain}</dd>
              </div>
              <div className="flex justify-between pb-2">
                <dt className="text-muted-foreground font-medium">Server</dt>
                <dd className="font-mono">{extension.sipServer}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              AI Agent Configuration
            </CardTitle>
            {extension.agentConfig && (
              <ProviderBadge provider={extension.agentConfig.provider} />
            )}
          </CardHeader>
          <CardContent>
            {!extension.agentConfig ? (
              <div className="py-6 text-center border border-dashed rounded-md flex flex-col items-center gap-3 bg-muted/20">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">No AI Agent attached</p>
                  <p className="text-xs text-muted-foreground mt-1">This extension will not process voice.</p>
                </div>
                <Link href={`/agent-configs/new?ext=${extension.id}`}>
                  <Button size="sm" className="mt-2">Configure Agent</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground font-medium">Language</dt>
                    <dd>{extension.agentConfig.language || "Default"}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground font-medium">Model</dt>
                    <dd>{extension.agentConfig.modelId || "Default"}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground font-medium">Voice ID</dt>
                    <dd className="font-mono text-xs max-w-[200px] truncate" title={extension.agentConfig.voiceId || ""}>
                      {extension.agentConfig.voiceId || "Default"}
                    </dd>
                  </div>
                </dl>
                
                <div className="pt-2 flex justify-end">
                  <Link href={`/agent-configs/${extension.agentConfig.id}/edit`}>
                    <Button variant="outline" size="sm">Edit AI Config</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {extension.agentConfig && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg">Deployment Assets</CardTitle>
            <CardDescription>Generate the necessary files to deploy this agent on your server.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button 
              variant="outline" 
              className="gap-2 h-20 flex-1 flex-col items-center justify-center bg-card hover:bg-accent border-dashed"
              onClick={handleDownloadConfig}
              disabled={downloadingJson}
            >
              <FileJson className="h-6 w-6 text-blue-500" />
              <span>{downloadingJson ? "Generating..." : "Download config.json"}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="gap-2 h-20 flex-1 flex-col items-center justify-center bg-card hover:bg-accent border-dashed"
              onClick={handleDownloadService}
              disabled={downloadingService}
            >
              <TerminalSquare className="h-6 w-6 text-purple-500" />
              <span>{downloadingService ? "Generating..." : "Download Systemd Service"}</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
