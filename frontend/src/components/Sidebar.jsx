import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Upload, FileSearch, AlertTriangle,
  ShieldCheck, BookOpen, Image, ArrowLeftRight, History,
  Settings, LogOut, ChevronRight, Layers, Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Applications',
    items: [
      { to: '/applications', label: 'All Applications', icon: FolderOpen },
      { to: '/applications/new', label: 'New Application', icon: Upload, roles: ['institution_user', 'admin'] },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/findings', label: 'Findings', icon: AlertTriangle },
      { to: '/verification', label: 'Verification', icon: ShieldCheck },
      { to: '/regulations', label: 'Regulatory RAG', icon: BookOpen },
      { to: '/evidence', label: 'Infrastructure', icon: Image },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { to: '/rectifications', label: 'Rectifications', icon: ArrowLeftRight },
      { to: '/audit', label: 'Audit Trail', icon: History },
    ],
  },
];

const adminItems = [
  { to: '/admin/institutions', label: 'Institutions', icon: Building2 },
  { to: '/admin/users', label: 'User Management', icon: Layers },
  { to: '/admin/rules', label: 'Rule Config', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-navy-900 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-navy-900" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">Pramaan AI</div>
          <div className="text-navy-400 text-xs">Compliance Platform</div>
        </div>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 border-b border-navy-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-navy-400 text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-navy-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items
                .filter((item) => !item.roles || item.roles.includes(user?.role))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'nav-item-active' : ''}`
                    }
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </NavLink>
                ))}
            </div>
          </div>
        ))}

        {user?.role === 'admin' && (
          <div>
            <p className="text-navy-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-navy-700">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-navy-300 hover:text-white"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
        <p className="text-navy-600 text-[10px] text-center mt-2">
          Advisory only — not regulatory decisions
        </p>
      </div>
    </aside>
  );
}
