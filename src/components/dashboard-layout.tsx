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
  
  // These states will be passed down to the sidebar and map
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState(0);

  const isCommander = user?.role === 'commander';

  // We need to lift state up so the map can control the sidebar animation
  const mapComponent = (
    <MapPlaceholder
      isEncrypting={isEncrypting}
      setIsEncrypting={setIsEncrypting}
      encryptionStep={encryptionStep}
      setEncryptionStep={setEncryptionStep}
    />
  );


  return (
    <SidebarProvider>
        <DashboardSidebar 
            activeView={activeView} 
            setActiveView={setActiveView}
            isEncrypting={isEncrypting}
            encryptionStep={encryptionStep}
        />
        <main className="flex-1">
            {activeView === 'map' && mapComponent}
            {activeView === 'units' && isCommander && <UnitsDashboard />}
        </main>
    </SidebarProvider>
  );
}
