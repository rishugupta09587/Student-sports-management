import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(value: string | Date): string {
  return format(new Date(value), 'dd MMM yyyy');
}

export function formatRelative(value: string | Date): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
