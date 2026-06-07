import { Home, ChevronRight, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageBreadcrumbProps {
  items: { label: string }[];
  className?: string;
}

export default function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  const { user } = useAuthStore();

  const elements: ReactNode[] = [];

  elements.push(<Home key="home" className="h-4 w-4" />);
  elements.push(<ChevronRight key="sep-home" className="h-3 w-3 text-white/30" />);

  if (user?.regionName) {
    elements.push(
      <div key="region" className="flex items-center gap-1 text-white/70">
        <MapPin className="h-3.5 w-3.5 text-eco-300" />
        <span>{user.regionName}</span>
      </div>
    );
    elements.push(<ChevronRight key="sep-region" className="h-3 w-3 text-white/30" />);
  }

  items.forEach((item, idx) => {
    elements.push(
      <span
        key={`item-${idx}`}
        className={cn(
          idx === items.length - 1 ? 'text-white font-medium' : 'text-white/70'
        )}
      >
        {item.label}
      </span>
    );
    if (idx < items.length - 1) {
      elements.push(<ChevronRight key={`sep-${idx}`} className="h-3 w-3 text-white/30" />);
    }
  });

  return (
    <div className={cn('flex items-center gap-2 text-sm text-white/50', className)}>
      {elements}
    </div>
  );
}
