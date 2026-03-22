import { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Settings,
  ScatterChart,
  MessageSquare,
  CopyPlus,
  LogOut,
  Activity,
  FolderKanban,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { signOut } from "aws-amplify/auth";

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.75} />
            <span className="sr-only">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const submitSignOut = async () => {
    try {
      await signOut();
      // @ts-ignore
      navigate({ to: "/signin" });
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="flex min-h-screen w-full flex-col">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r border-sidebar-border bg-sidebar sm:flex">
        <nav className="flex flex-col items-center gap-1 px-2 py-4">
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/chat" icon={MessageSquare} label="Neptune GraphDB Chatbot" />
          <NavItem to="/register" icon={CopyPlus} label="Add Vertex/Edge" />
          <NavItem to="/graph" icon={ScatterChart} label="Graph Visualization" />
          <NavItem to="/monitoring" icon={Activity} label="Monitoring" />
          <NavItem to="/projects" icon={FolderKanban} label="Business Services" />
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-1 px-2 py-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  onClick={() => submitSignOut()}
                  href="/signin"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground hover:bg-sidebar-foreground/5 md:h-8 md:w-8"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <span className="sr-only">Sign out</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </nav>
      </aside>
      <main className="grid flex-1 pl-14 items-start animate-fade-in">{children}</main>
    </div>
  );
};
