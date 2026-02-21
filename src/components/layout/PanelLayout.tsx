import { Outlet } from 'react-router-dom';
import BottomNav, { Sidebar } from './BottomNav';
import { Scissors } from 'lucide-react';

export default function PanelLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <div className="flex-1 min-w-0">
        {/* Mobile top bar - hidden on desktop (sidebar has logo) */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-40 lg:hidden">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Scissors className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm">Studio Bella</span>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto pb-24 lg:max-w-none lg:pb-6">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
