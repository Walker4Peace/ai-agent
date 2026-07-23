import React from "react";
import { Link, useParams } from "wouter";
import { 
  useGetClient,
  useListExtensions,
  getListExtensionsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);

  const { data: client, isLoading: isLoadingClient } = useGetClient(clientId, { 
    query: { enabled: !!clientId, queryKey: ['client', clientId] } 
  });
  
  const { data: extensions, isLoading: isLoadingExtensions } = useListExtensions(
    { clientId }, 
    { query: { enabled: !!clientId, queryKey: getListExtensionsQueryKey({ clientId }) } }
  );

  if (isLoadingClient) {
    return <div className="p-8 animate-pulse text-muted-foreground">Loading client data...</div>;
  }

  if (!client) {
    return <div className="p-8 text-destructive">Client not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono">{client.serverIp || 'No server IP specified'}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
              <div className="text-sm">{client.description || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Added On</div>
              <div className="text-sm">{formatDate(client.createdAt)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extensions</CardTitle>
            <Link href="/extensions">
              <Button variant="outline" size="sm" className="h-8">Add Extension</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingExtensions ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Loading extensions...</div>
            ) : !extensions || extensions.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-md flex flex-col items-center gap-2">
                <Phone className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No extensions configured for this client.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ext</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>AI Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extensions.map((ext) => (
                      <TableRow key={ext.id}>
                        <TableCell className="font-mono font-medium">
                          <Link href={`/extensions/${ext.id}`} className="hover:underline text-primary">
                            {ext.extensionNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{ext.displayName || "—"}</TableCell>
                        <TableCell>
                          <ProviderBadge provider={ext.agentConfig?.provider} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
