import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { NAV_ITEMS } from './nav-items';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Jump to a page or take an action">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.to} onSelect={() => go(item.to)}>
              <item.icon />
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go('/students/new')}>
            <PlusCircle />
            <span>Add new student</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/reports')}>
            <PlusCircle />
            <span>Generate report</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/templates')}>
            <PlusCircle />
            <span>Upload template</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
