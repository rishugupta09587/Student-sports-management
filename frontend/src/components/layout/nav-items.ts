import { FileText, LayoutDashboard, Trophy, Users } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, shortcut: 'G D' },
  { label: 'Students', to: '/students', icon: Users, shortcut: 'G S' },
  { label: 'Reports', to: '/reports', icon: FileText, shortcut: 'G R' },
  { label: 'Templates', to: '/templates', icon: Trophy, shortcut: 'G T' },
];
