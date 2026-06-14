import { Activity, BarChart3, CalendarDays, Dumbbell, ListChecks, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: '記録', icon: Dumbbell },
  { to: '/graphs', label: 'グラフ', icon: BarChart3 },
  { to: '/history', label: '履歴', icon: CalendarDays },
  { to: '/exercises', label: '種目', icon: Activity },
  { to: '/menus', label: 'メニュー', icon: ListChecks },
  { to: '/settings', label: '設定', icon: Settings }
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="主要ナビゲーション">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p>Workout Diary</p>
            <h1>筋トレ日記</h1>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="主要ナビゲーション">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <item.icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
