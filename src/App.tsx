import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Clients from "./pages/Clients";
import Articles from "./pages/Articles";
import Devis from "./pages/Devis";
import Factures from "./pages/Factures";
import Achats from "./pages/Achats";
import Banque from "./pages/Banque";
import Comptabilite from "./pages/Comptabilite";
import Rapports from "./pages/Rapports";
import Parametres from "./pages/Parametres";
import Depenses from "./pages/Depenses";
import CRM from "./pages/CRM";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OrganizationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/onboarding" 
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/articles" 
                element={
                  <ProtectedRoute>
                    <Articles />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/devis" 
                element={
                  <ProtectedRoute>
                    <Devis />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/factures" 
                element={
                  <ProtectedRoute>
                    <Factures />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/achats" 
                element={
                  <ProtectedRoute>
                    <Achats />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/depenses" 
                element={
                  <ProtectedRoute>
                    <Depenses />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/banque" 
                element={
                  <ProtectedRoute>
                    <Banque />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/comptabilite" 
                element={
                  <ProtectedRoute>
                    <Comptabilite />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/rapports" 
                element={
                  <ProtectedRoute>
                    <Rapports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/crm" 
                element={
                  <ProtectedRoute>
                    <CRM />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/parametres" 
                element={
                  <ProtectedRoute>
                    <Parametres />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
