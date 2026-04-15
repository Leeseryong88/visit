import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, ClipboardList, QrCode, ShieldCheck, Palette, Menu, X } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const navItems = [
    { name: '대시보드', path: '/admin', icon: LayoutDashboard },
    { name: '방문 목적', path: '/admin/purposes', icon: ClipboardList },
    { name: '기록 조회', path: '/admin/logs', icon: FileText },
    { name: 'QR코드', path: '/admin/qrcodes', icon: QrCode },
    { name: '구독서비스', path: '/admin/subscription', icon: Palette, beta: true },
  ];

  if (auth.currentUser?.email === 'kidcap1001@gmail.com') {
    navItems.push({ name: '운영자 관리', path: '/admin/super', icon: ShieldCheck });
  }

  const currentItem = navItems.find(item => item.path === location.pathname) || navItems[0];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            디지털 방문일지
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Admin Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
              {item.beta && (
                <span className="ml-auto bg-blue-100 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  BETA
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-4">
          <div className="flex items-center gap-3 px-4 py-2">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                {auth.currentUser?.displayName?.charAt(0) || 'A'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{auth.currentUser?.displayName || '관리자'}</p>
              <p className="text-[10px] text-gray-400 truncate">{auth.currentUser?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header (Mobile) */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-sm font-bold text-gray-900">{currentItem.name}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400">
            <LogOut className="w-5 h-5" />
          </Button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </div>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe z-30">
          <div className="flex items-center justify-around h-16">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 min-w-0 h-full gap-1 transition-colors',
                  location.pathname === item.path
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <div className={cn(
                  "p-1 rounded-lg transition-colors",
                  location.pathname === item.path ? "bg-blue-50" : "bg-transparent"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold truncate px-1">
                  {item.name === '방문 목적 관리' ? '서식관리' : item.name}
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
};
