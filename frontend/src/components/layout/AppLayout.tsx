import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import { SidebarNav } from './SidebarNav';
import { CommandPalette } from './CommandPalette';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteHint, setPaletteHint] = React.useState(false);

  React.useEffect(() => {
    setPaletteHint(navigator.platform.toUpperCase().indexOf('MAC') < 0);
  }, []);

  return (
    <div className="bg-muted/20 flex min-h-svh w-full">
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <SidebarNav />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-4" />
          </Button>

          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="text-muted-foreground hover:bg-accent flex h-9 w-full max-w-sm items-center gap-2 rounded-md border px-3 text-sm transition-colors"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search or jump to...</span>
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{paletteHint ? 'Ctrl K' : '⌘K'}</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
