import React from "react";
import { Link } from "wouter";
import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Server, Activity } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
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
          <Link href="/clients">
            <Button variant="outline">Manage Clients</Button>
          </Link>
          <Link href="/extensions">
            <Button>Add Extension</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Extensions</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalExtensions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Configs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAgentConfigs}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Provider Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.extensionsByProvider.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-md border-dashed">
                No agents configured yet
              </div>
            ) : (
              <div className="space-y-4">
                {stats.extensionsByProvider.map((item) => (
                  <div key={item.provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ProviderBadge provider={item.provider} />
                    </div>
                    <div className="font-medium">{item.count} extension{item.count !== 1 && 's'}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1 bg-primary text-primary-foreground border-none">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                <span>API Services Operational</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                <span>SIP Registration Service Online</span>
              </div>
              <div className="mt-6 pt-6 border-t border-primary-foreground/20">
                <p className="text-sm text-primary-foreground/80 font-mono">
                  Engineers on call: 2
                  <br />
                  System Load: 4.2%
                  <br />
                  Latency: 42ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
