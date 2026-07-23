import React from "react";
import { Link, useParams } from "wouter";
import { 
  useGetClient,
  useUpdateClient,
  useListExtensions,
  getListExtensionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Phone, Edit, Save, X } from "lucide-react";
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

const editSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  sipDomain: z.string().optional(),
  sipServer: z.string().optional(),
});

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);

  const { data: client, isLoading: isLoadingClient } = useGetClient(clientId, { 
    query: { enabled: !!clientId, queryKey: ['client', clientId] } 
  });
  
  const { data: extensions, isLoading: isLoadingExtensions } = useListExtensions(
    { clientId }, 
    { query: { enabled: !!clientId, queryKey: getListExtensionsQueryKey({ clientId }) } }
  );

  const updateClient = useUpdateClient();

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", description: "", sipDomain: "", sipServer: "" },
  });

  React.useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        description: client.description ?? "",
        sipDomain: client.sipDomain ?? "",
        sipServer: client.sipServer ?? "",
      });
    }
  }, [client, form]);

  const onSave = (values: z.infer<typeof editSchema>) => {
    updateClient.mutate(
      { id: clientId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['client', clientId] });
          setEditing(false);
          toast({ title: "IPBX updated" });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update IPBX." }),
      }
    );
  };

  if (isLoadingClient) {
    return <div className="p-8 animate-pulse text-muted-foreground">Loading IPBX data...</div>;
  }

  if (!client) {
    return <div className="p-8 text-destructive">IPBX not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono">{client.sipDomain || 'No SIP domain configured'}</p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" /> Cancel
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">IPBX Details</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>IPBX Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sipDomain" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIP Domain</FormLabel>
                      <FormControl><Input placeholder="pbx.example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sipServer" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIP Server:Port</FormLabel>
                      <FormControl><Input placeholder="pbx.example.com:5060" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" size="sm" className="w-full gap-2" disabled={updateClient.isPending}>
                    <Save className="h-4 w-4" />
                    {updateClient.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">SIP Domain</div>
                  <div className="text-sm font-mono">{client.sipDomain || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">SIP Server:Port</div>
                  <div className="text-sm font-mono">{client.sipServer || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                  <div className="text-sm">{client.description || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Added On</div>
                  <div className="text-sm">{formatDate(client.createdAt)}</div>
                </div>
              </div>
            )}
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
                <p className="text-sm text-muted-foreground">No extensions configured for this IPBX.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ext</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>AI Agent</TableHead>
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
                          {ext.agentConfig ? (
                            <div className="flex items-center gap-2">
                              <ProviderBadge provider={ext.agentConfig.provider} />
                              <span className="text-xs text-muted-foreground">{ext.agentConfig.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No agent</span>
                          )}
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
