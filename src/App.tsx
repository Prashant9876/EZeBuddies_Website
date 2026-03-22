import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/lib/language";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VatavaranPreLaunch from "./pages/VatavaranPreLaunch";
import LoginDashboard from "./pages/LoginDashboard";
import VataranPlanner from "./pages/VataranPlanner";
import SinchaiPlanner from "./pages/SinchaiPlanner";
import { PostLoginLayout } from "@/components/PostLoginLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pre-launch/vatavaran-monitor" element={<VatavaranPreLaunch />} />
            <Route path="/vatavaran-monitor-prelaunch" element={<VatavaranPreLaunch />} />
            <Route element={<PostLoginLayout />}>
              <Route path="/dashboard" element={<LoginDashboard />} />
              <Route path="/dashboard/vataran-planner" element={<VataranPlanner />} />
              <Route path="/dashboard/sinchai-planner" element={<SinchaiPlanner />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
