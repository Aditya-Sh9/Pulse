import {
  LayoutDashboard, CheckCircle2, Inbox, MessageSquare, Trophy,
  Columns3, List, Table2, CalendarDays, Users, Settings, History,
} from 'lucide-react'

// Single source of truth for every page the landing page links into.
// `route` is what we display; `to` is where the link goes (project views need a
// project, so they land on the dashboard where the sidebar lists projects).
export const workspacePages = [
  { title: 'Home', route: '/dashboard', to: '/dashboard', icon: LayoutDashboard,
    desc: 'Total tasks, completion rate, work in progress and upcoming deadlines.' },
  { title: 'My Tasks', route: '/dashboard/my-tasks', to: '/dashboard/my-tasks', icon: CheckCircle2,
    desc: 'Everything assigned to you, across every project.' },
  { title: 'Inbox', route: '/dashboard/inbox', to: '/dashboard/inbox', icon: Inbox,
    desc: 'Assignments, mentions and invites in one activity feed.' },
  { title: 'Messages', route: '/dashboard/messages', to: '/dashboard/messages', icon: MessageSquare,
    desc: 'Direct messages with teammates, delivered over the socket.' },
  { title: 'Leaderboard', route: '/dashboard/leaderboard', to: '/dashboard/leaderboard', icon: Trophy,
    desc: 'XP for closed tasks, a live ticker and resettable seasons.' },
]

export const projectViews = [
  { title: 'Board', route: '/dashboard/board/:projectId', to: '/dashboard', icon: Columns3,
    desc: 'Drag cards between columns. Everyone sees the move instantly.' },
  { title: 'List', route: '/dashboard/list/:projectId', to: '/dashboard', icon: List,
    desc: 'A dense, scannable list grouped by status.' },
  { title: 'Table', route: '/dashboard/table/:projectId', to: '/dashboard', icon: Table2,
    desc: 'Assignee, priority and due date side by side.' },
  { title: 'Calendar', route: '/dashboard/calendar/:projectId', to: '/dashboard', icon: CalendarDays,
    desc: 'Tasks laid out on their due dates.' },
]

export const adminPages = [
  { title: 'Team', route: '/dashboard/team', to: '/dashboard/team', icon: Users,
    desc: 'Invite members by email and manage their roles.' },
  { title: 'Settings', route: '/dashboard/settings', to: '/dashboard/settings', icon: Settings,
    desc: 'Profile, notification preferences and workspace settings.' },
  { title: 'Activity log', route: '/dashboard/activity', to: '/dashboard/activity', icon: History,
    desc: 'A filterable history of everything that happened in the workspace.' },
]

export const sections = [
  { label: 'Views', href: '#views' },
  { label: 'Features', href: '#features' },
  { label: 'Pages', href: '#pages' },
  { label: 'How it works', href: '#stack' },
]

export const REPO_URL = 'https://github.com/Aditya-Sh9/Pulse'
