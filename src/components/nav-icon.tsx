import type { ReactNode } from 'react';
import {
  Backpack,
  Bell,
  BookOpen,
  Brain,
  ClipboardList,
  FileText,
  Flame,
  FolderOpen,
  Gamepad2,
  Globe,
  Home,
  KeyRound,
  List,
  ListChecks,
  Mail,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Palette,
  School,
  Search,
  Settings,
  Target,
  Timer,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';

export type NavIconName =
  | 'home'
  | 'questions'
  | 'categories'
  | 'blog'
  | 'designs'
  | 'discover'
  | 'popular'
  | 'all'
  | 'contact'
  | 'admin'
  | 'expert'
  | 'teacher'
  | 'bell'
  | 'profile'
  | 'student'
  | 'challenge'
  | 'trophy'
  | 'gamepad'
  | 'parent'
  | 'timer'
  | 'chat'
  | 'messages'
  | 'announce'
  | 'login'
  | 'site'
  | 'homework'
  | 'tests'
  | 'documents';

const ICON_COLOR: Record<NavIconName, string> = {
  home: 'text-rose-500',
  questions: 'text-sky-500',
  categories: 'text-amber-500',
  blog: 'text-indigo-500',
  designs: 'text-fuchsia-500',
  discover: 'text-cyan-500',
  popular: 'text-orange-500',
  all: 'text-zinc-500',
  contact: 'text-emerald-500',
  admin: 'text-violet-500',
  expert: 'text-pink-500',
  teacher: 'text-blue-500',
  bell: 'text-yellow-500',
  profile: 'text-indigo-600',
  student: 'text-lime-500',
  challenge: 'text-purple-500',
  trophy: 'text-amber-500',
  gamepad: 'text-teal-500',
  parent: 'text-rose-500',
  timer: 'text-cyan-600',
  chat: 'text-sky-500',
  messages: 'text-cyan-600',
  announce: 'text-rose-600',
  homework: 'text-orange-500',
  tests: 'text-sky-600',
  documents: 'text-violet-500',
  login: 'text-violet-600',
  site: 'text-emerald-600',
};

export function NavIcon({ name, className = 'h-4 w-4' }: { name: NavIconName; className?: string }): ReactNode {
  const tone = ICON_COLOR[name];
  /** Özel text-* rengi verildiyse varsayılan tona ekleme (ör. alt menü orta düğmesi). */
  const useTone = !/\btext-[a-zA-Z0-9/[\].%-]+/.test(className || '');
  const cls = useTone ? `${className} ${tone}` : className;
  switch (name) {
    case 'home':
      return <Home className={cls} aria-hidden />;
    case 'questions':
      return <MessageCircle className={cls} aria-hidden />;
    case 'categories':
      return <FolderOpen className={cls} aria-hidden />;
    case 'blog':
      return <BookOpen className={cls} aria-hidden />;
    case 'designs':
      return <Palette className={cls} aria-hidden />;
    case 'discover':
      return <Search className={cls} aria-hidden />;
    case 'popular':
      return <Flame className={cls} aria-hidden />;
    case 'all':
      return <List className={cls} aria-hidden />;
    case 'contact':
      return <Mail className={cls} aria-hidden />;
    case 'admin':
      return <Settings className={cls} aria-hidden />;
    case 'expert':
      return <Brain className={cls} aria-hidden />;
    case 'teacher':
      return <School className={cls} aria-hidden />;
    case 'bell':
      return <Bell className={cls} aria-hidden />;
    case 'profile':
      return <UserRound className={cls} aria-hidden />;
    case 'student':
      return <Backpack className={cls} aria-hidden />;
    case 'challenge':
      return <Target className={cls} aria-hidden />;
    case 'trophy':
      return <Trophy className={cls} aria-hidden />;
    case 'gamepad':
      return <Gamepad2 className={cls} aria-hidden />;
    case 'parent':
      return <Users className={cls} aria-hidden />;
    case 'timer':
      return <Timer className={cls} aria-hidden />;
    case 'chat':
      return <MessageCircle className={cls} aria-hidden />;
    case 'messages':
      return <MessagesSquare className={cls} aria-hidden />;
    case 'homework':
      return <ClipboardList className={cls} aria-hidden />;
    case 'tests':
      return <ListChecks className={cls} aria-hidden />;
    case 'documents':
      return <FileText className={cls} aria-hidden />;
    case 'announce':
      return <Megaphone className={cls} aria-hidden />;
    case 'login':
      return <KeyRound className={cls} aria-hidden />;
    case 'site':
      return <Globe className={cls} aria-hidden />;
    default:
      return <Home className={cls} aria-hidden />;
  }
}

