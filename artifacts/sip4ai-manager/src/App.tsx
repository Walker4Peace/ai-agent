import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AppLayout } from '@/components/layout/app-layout';

import Dashboard from '@/pages/dashboard';
import ClientsList from '@/pages/clients/index';
import ClientDetail from '@/pages/clients/detail';
import ExtensionsList from '@/pages/extensions/index';
import ExtensionDetail from '@/pages/extensions/detail';
import AgentConfigsList from '@/pages/agent-configs/index';
import AgentConfigForm from '@/pages/agent-configs/form';

// Minimal Not Found for now
function NotFound() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
      <h1 className="text-4xl font-bold tracking-tight text-destructive">404</h1>
      <p className="text-muted-foreground">This page could not be found.</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        <Route path="/clients" component={ClientsList} />
        <Route path="/clients/:id" component={ClientDetail} />
        
        <Route path="/extensions" component={ExtensionsList} />
        <Route path="/extensions/:id" component={ExtensionDetail} />
        
        <Route path="/agent-configs" component={AgentConfigsList} />
        <Route path="/agent-configs/new" component={AgentConfigForm} />
        <Route path="/agent-configs/:id/edit" component={AgentConfigForm} />
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
