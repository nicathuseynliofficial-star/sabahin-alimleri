"use client";

import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import MapPlaceholder from './map-placeholder';
import UnitsDashboard from './units-dashboard';
import { useAuth } from '@/hooks/use-auth-provider';

type View = 'map' | 'units';

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState<View>('map');
  const { user } = useAuth();

  const isCommander = user?.role === 'commander';

  return (
    <SidebarProvider>
        <DashboardSidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1">
            {activeView === 'map' && <MapPlaceholder />}
            {activeView === 'units' && isCommander && <UnitsDashboard />}
        </main>
    </SidebarProvider>
  );
}
