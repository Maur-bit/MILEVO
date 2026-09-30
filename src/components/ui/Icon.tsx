import {
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Filter,
  Headphones,
  Heart,
  Home,
  Laptop,
  LayoutDashboard,
  Link2,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Moon,
  Sun,
  Star,
  Store,
  Tag,
  Tv,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from 'cn';

const icons = {
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-down-up': ArrowDownUp,
  'bar-chart': BarChart3,
  bell: Bell,
  check: Check,
  close: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-dollar': CircleDollarSign,
  'external-link': ExternalLink,
  filter: Filter,
  headphones: Headphones,
  heart: Heart,
  home: Home,
  laptop: Laptop,
  dashboard: LayoutDashboard,
  link: Link2,
  moon: Moon,
  package: Package,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  smartphone: Smartphone,
  sun: Sun,
  star: Star,
  store: Store,
  tag: Tag,
  tv: Tv,
  user: UserRound,
  users: UsersRound,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 18,
  className,
  filled = false,
}: {
  name: IconName;
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  const Component = icons[name];
  return (
    <Component
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
      className={cn('shrink-0', className)}
      fill={filled ? 'currentColor' : 'none'}
    />
  );
}
