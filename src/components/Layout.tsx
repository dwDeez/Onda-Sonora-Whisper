import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();
  const isAirlock = location.pathname === '/';

  if (isAirlock) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-dark text-text-main font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full bg-grid-pattern-archive relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
