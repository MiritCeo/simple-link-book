import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SalonBooking from "./pages/booking/SalonBooking";
import LoginPage from "./pages/auth/LoginPage";
import PanelLayout from "./components/layout/PanelLayout";
import DashboardPage from "./pages/panel/DashboardPage";
import CalendarPage from "./pages/panel/CalendarPage";
import AppointmentsPage from "./pages/panel/AppointmentsPage";
import ClientsPage from "./pages/panel/ClientsPage";
import SettingsPage from "./pages/panel/SettingsPage";
import NotificationsPage from "./pages/panel/NotificationsPage";
import ClientLayout from "./components/layout/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfile from "./pages/client/ClientProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public booking */}
          <Route path="/s/:slug" element={<SalonBooking />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Client panel */}
          <Route path="/konto" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="wizyty" element={<ClientAppointments />} />
            <Route path="profil" element={<ClientProfile />} />
          </Route>

          {/* Salon panel */}
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="kalendarz" element={<CalendarPage />} />
            <Route path="wizyty" element={<AppointmentsPage />} />
            <Route path="klienci" element={<ClientsPage />} />
            <Route path="powiadomienia" element={<NotificationsPage />} />
            <Route path="ustawienia" element={<SettingsPage />} />
          </Route>

          {/* Root redirects to demo booking page */}
          <Route path="/" element={<Navigate to="/s/studio-bella" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
