import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SalonBooking from "./pages/booking/SalonBooking";
import CancelBooking from "./pages/booking/CancelBooking";
import LoginPage from "./pages/auth/LoginPage";
import SalonSelectPage from "./pages/auth/SalonSelectPage";
import ClientLoginPage from "./pages/auth/ClientLoginPage";
import ClientResetPasswordPage from "./pages/auth/ClientResetPasswordPage";
import PanelLayout from "./components/layout/PanelLayout";
import DashboardPage from "./pages/panel/DashboardPage";
import CalendarPage from "./pages/panel/CalendarPage";
import AppointmentsPage from "./pages/panel/AppointmentsPage";
import ClientsPage from "./pages/panel/ClientsPage";
import SettingsPage from "./pages/panel/SettingsPage";
import ServicesSettingsPage from "./pages/panel/settings/ServicesSettingsPage";
import StaffSettingsPage from "./pages/panel/settings/StaffSettingsPage";
import StaffEditPage from "./pages/panel/settings/StaffEditPage";
import HoursSettingsPage from "./pages/panel/settings/HoursSettingsPage";
import BreaksSettingsPage from "./pages/panel/settings/BreaksSettingsPage";
import SalonsSettingsPage from "./pages/panel/settings/SalonsSettingsPage";
import NotificationsPage from "./pages/panel/NotificationsPage";
import StaffSchedulePage from "./pages/panel/StaffSchedulePage";
import StaffScheduleEditPage from "./pages/panel/StaffScheduleEditPage";
import ClientLayout from "./components/layout/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfile from "./pages/client/ClientProfile";
import SuperAdminPage from "./pages/admin/SuperAdminPage";
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
          <Route path="/cancel/:token" element={<CancelBooking />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logowanie" element={<Navigate to="/login" replace />} />
          <Route path="/konto/logowanie" element={<ClientLoginPage />} />
          <Route path="/konto/reset-hasla" element={<ClientResetPasswordPage />} />
          <Route path="/wybierz-salon" element={<SalonSelectPage />} />

          {/* Client panel */}
          <Route path="/konto" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="wizyty" element={<ClientAppointments />} />
            <Route path="profil" element={<ClientProfile />} />
          </Route>

          {/* Super admin */}
          <Route path="/admin" element={<SuperAdminPage />} />

          {/* Salon panel */}
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="kalendarz" element={<CalendarPage />} />
            <Route path="wizyty" element={<AppointmentsPage />} />
            <Route path="klienci" element={<ClientsPage />} />
            <Route path="grafik" element={<StaffSchedulePage />} />
            <Route path="grafik/:id" element={<StaffScheduleEditPage />} />
            <Route path="powiadomienia" element={<NotificationsPage />} />
            <Route path="ustawienia" element={<SettingsPage />} />
            <Route path="ustawienia/uslugi" element={<ServicesSettingsPage />} />
            <Route path="ustawienia/salony" element={<SalonsSettingsPage />} />
            <Route path="ustawienia/pracownicy" element={<StaffSettingsPage />} />
            <Route path="ustawienia/pracownicy/:id" element={<StaffEditPage />} />
            <Route path="ustawienia/godziny" element={<HoursSettingsPage />} />
            <Route path="ustawienia/przerwy" element={<BreaksSettingsPage />} />
          </Route>

          {/* Root redirects to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
