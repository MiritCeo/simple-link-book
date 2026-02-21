import { Outlet } from 'react-router-dom';
import ClientBottomNav, { ClientSidebar } from './ClientBottomNav';

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <ClientSidebar />

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-40 lg:hidden">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
            <span className="font-bold text-sm">Moje konto</span>
          </div>
        </header>

        <main className="max-w-lg mx-auto pb-24 lg:max-w-4xl lg:pb-6">
          <Outlet />
        </main>
      </div>

      <ClientBottomNav />
    </div>
  );
}
