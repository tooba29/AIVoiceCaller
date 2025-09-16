import { Route, Switch, Redirect } from "wouter";
import { useTranslation } from "react-i18next";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Voices from "@/pages/voices";
import Analytics from "@/pages/analytics";
import Home from "@/pages/home";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import { Loader2 } from "lucide-react";
import CampaignDetails from "./pages/campaign-details";
import CampaignCreation from "./pages/campaign-creation";
import CampaignEdit from "./pages/campaign-edit";

function AppRouter() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/home" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/dashboard" component={user ? Dashboard : Login} />
      <Route path="/campaigns">
        {!user ? <Redirect to="/login" /> : <Campaigns />}
      </Route>
      <Route path="/campaigns/new">
        {!user ? <Redirect to="/login" /> : <CampaignCreation />}
      </Route>
      <Route path="/campaigns/:id">
        {(params) =>
          !user ? <Redirect to="/login" /> : <CampaignDetails id={params.id} />
        }
      </Route>
      <Route path="/campaigns/:id/edit">
        {(params) =>
          !user ? <Redirect to="/login" /> : <CampaignEdit id={params.id} />
        }
      </Route>
      <Route path="/voices" component={user ? Voices : Login} />
      <Route path="/analytics" component={user ? Analytics : Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
