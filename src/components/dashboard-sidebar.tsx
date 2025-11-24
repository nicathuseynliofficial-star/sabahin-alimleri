"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth-provider";
import { LogOut, Map, Shield, UserCircle, Users } from "lucide-react";
import EncryptionLogPanel from "./encryption-log-panel";

type View = 'map' | 'units';

interface DashboardSidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

export function DashboardSidebar({ activeView, setActiveView }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const isCommander = user?.role === 'commander';

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Shield className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground">GeoGuard</span>
                    <span className="text-xs text-muted-foreground">{isCommander ? 'Baş Komandir' : 'Sub-Komandir'}</span>
                </div>
            </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => setActiveView('map')}
                        isActive={activeView === 'map'}
                        tooltip="Xəritə"
                    >
                        <Map />
                        <span>Xəritə Görünüşü</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                {isCommander && (
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveView('units')}
                            isActive={activeView === 'units'}
                            tooltip="Bölüklər"
                        >
                            <Users />
                            <span>Bölüklərin İdarəsi</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
            </SidebarMenu>
            
            {isCommander && <EncryptionLogPanel />}
        </SidebarContent>

        <SidebarFooter>
            <div className="flex items-center gap-3 p-2">
                <Avatar>
                    <AvatarImage />
                    <AvatarFallback className="bg-muted-foreground text-background">
                       {user?.username ? getInitials(user.username) : <UserCircle/>}
                    </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground truncate">{user?.username}</span>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span>Çıxış</span>
            </Button>
        </SidebarFooter>
    </Sidebar>
  );
}
