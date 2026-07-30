import { NavLink } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2 pt-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Trophy className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Sports Staff</span>
          <span className="text-muted-foreground text-xs">Data Management</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
        Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Ctrl</kbd> + <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">K</kbd> to open the command palette
      </div>
    </div>
  );
}
