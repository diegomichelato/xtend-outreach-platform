import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import CampaignDetail from "@/pages/campaign-detail";
import Creators from "@/pages/creators";
import CreatorDetail from "./pages/creator-detail";
import Contacts from "@/pages/contacts";
import Settings from "@/pages/settings";
import EmailAccounts from "@/pages/email-accounts";
// Smartlead import removed
// Whiteboard removed
import EmailTemplates from "@/pages/email-templates";
import TemplateBuilder from "@/pages/template-builder";
import Outreach from "@/pages/outreach";
import EmailDeliverability from "@/pages/email-deliverability";
import InventoryTable from "@/pages/inventory-table-new";
import Inventory from "@/pages/inventory";
import ShareableLandingPages from "@/pages/shareable-landing-pages";
import SharedLandingPage from "@/pages/shared-landing-page";
import ShareableLandingPagesDashboard from "@/pages/shareable-landing-pages-dashboard";
import { ProposalLandingPage } from "@/pages/proposal-landing";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Sidebar } from "./components/layout/sidebar";
import { Header } from "./components/layout/header";
import { StemContactsPage } from "./pages/StemContacts";
import ProposalsPage from "@/pages/proposals";
import DealsPage from "@/pages/deals";
import SalesPipeline from "@/pages/sales-pipeline";

function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar open={sidebarOpen} />
      <main 
        id="main-content"
        className={`pt-14 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/campaigns/:id" component={CampaignDetail} />
      <Route path="/creators" component={Creators} />
      <Route path="/creators/:id" component={CreatorDetail} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/deals" component={DealsPage} />
      <Route path="/email-accounts" component={EmailAccounts} />
      <Route path="/settings" component={Settings} />
      {/* Smartlead route removed */}
      {/* Whiteboard route removed */}
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/template-builder" component={TemplateBuilder} />
      <Route path="/template-builder/:id" component={TemplateBuilder} />
      <Route path="/outreach" component={Outreach} />
      <Route path="/email-deliverability" component={EmailDeliverability} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory-table" component={InventoryTable} />
      <Route path="/stem-contacts" component={StemContactsPage} />
      <Route path="/proposals" component={ProposalsPage} />
      <Route path="/sales-pipeline" component={SalesPipeline} />
      <Route path="/crm-agent">
        {() => {
          const CRMAgent = React.lazy(() => import("./pages/crm-agent"));
          return (
            <React.Suspense fallback={<div>Loading CRM Agent...</div>}>
              <CRMAgent />
            </React.Suspense>
          );
        }}
      </Route>
      <Route path="/shareable-landing-pages" component={ShareableLandingPages} />
      <Route path="/shareable-landing-pages-dashboard" component={ShareableLandingPagesDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Switch>
            {/* Render shared landing pages without the main layout */}
            <Route path="/share/:uniqueId">
              {(params) => <SharedLandingPage />}
            </Route>
            
            {/* Render proposal landing pages without the main layout */}
            <Route path="/p/:uniqueId">
              {(params) => <ProposalLandingPage />}
            </Route>
            
            {/* Render shared proposal landing pages (new format) */}
            <Route path="/shared/:uniqueId">
              {(params) => <ProposalLandingPage />}
            </Route>
            
            {/* Render print version of proposal landing pages */}
            <Route path="/shared/:uniqueId/print">
              {() => <ProposalLandingPage printMode={true} />}
            </Route>
            
            {/* Render all other pages with the main layout */}
            <Route>
              <MainLayout>
                <Router />
              </MainLayout>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
