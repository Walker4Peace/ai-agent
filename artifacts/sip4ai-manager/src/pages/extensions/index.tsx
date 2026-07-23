import React from "react";
import { Link } from "wouter";
import { 
  useListExtensions, 
  useDeleteExtension,
  useListClients,
  useCreateExtension,
  getListExtensionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ProviderBadge } from "@/components/provider-badge";
import { Plus, Phone, Trash2, ArrowRight } from "lucide-react";

const formSchema = z.object({
  clientId: z.string().optional(),
  extensionNumber: z.string().min(1, "Extension number is required."),
  displayName: z.string().optional(),
  sipUsername: z.string().min(1, "SIP Username is required."),
  sipAuthId: z.string().min(1, "SIP Auth ID is required."),
  sipPassword: z.string().min(1, "SIP Password is required."),
  sipDomain: z.string().min(1, "SIP Domain is required."),
  sipServer: z.string().min(1, "SIP Server is required."),
});

export default function ExtensionsList() {
  const { data: extensions, isLoading } = useListExtensions();
  const { data: clients } = useListClients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const createExtension = useCreateExtension();
  const deleteExtension = useDeleteExtension();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "none",
      extensionNumber: "",
      displayName: "",
      sipUsername: "",
      sipAuthId: "",
      sipPassword: "",
      sipDomain: "",
      sipServer: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const data = {
      ...values,
      clientId: values.clientId === "none" ? null : Number(values.clientId),
    };

    createExtension.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExtensionsQueryKey() });
          setOpen(false);
          form.reset();
          toast({
            title: "Extension created",
            description: "The SIP extension has been configured.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create extension.",
          });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this extension? This will also remove its agent config.")) return;
    
    deleteExtension.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExtensionsQueryKey() });
          toast({
            title: "Extension deleted",
            description: "The extension has been removed.",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Extensions</h1>
          <p className="text-muted-foreground mt-1">SIP extensions registered to AI agents.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Extension
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure New Extension</DialogTitle>
              <DialogDescription>
                Add SIP credentials for a new extension.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Client</SelectItem>
                            {clients?.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="extensionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extension Number</FormLabel>
                        <FormControl>
                          <Input placeholder="1001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Sales AI Agent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sipUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIP Username</FormLabel>
                        <FormControl>
                          <Input placeholder="1001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sipAuthId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIP Auth ID</FormLabel>
                        <FormControl>
                          <Input placeholder="1001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sipPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIP Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="Secret password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sipDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIP Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="pbx.acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sipServer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIP Server:Port</FormLabel>
                        <FormControl>
                          <Input placeholder="pbx.acme.com:5060" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={createExtension.isPending}>
                    {createExtension.isPending ? "Saving..." : "Save Extension"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ext</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>AI Engine</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Loading extensions...
                </TableCell>
              </TableRow>
            ) : !extensions || extensions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-48 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Phone className="h-8 w-8 text-muted-foreground/50" />
                    <p>No extensions configured.</p>
                    <Button variant="link" onClick={() => setOpen(true)}>Add your first extension</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              extensions.map((ext) => (
                <TableRow key={ext.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-mono text-primary">{ext.extensionNumber}</span>
                      <span className="text-xs text-muted-foreground">{ext.displayName || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ext.client ? (
                      <Link href={`/clients/${ext.clientId}`} className="hover:underline text-sm font-medium">
                        {ext.client.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{ext.sipDomain}</TableCell>
                  <TableCell>
                    <ProviderBadge provider={ext.agentConfig?.provider} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/extensions/${ext.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
                          Config <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDelete(ext.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
