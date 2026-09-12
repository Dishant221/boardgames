import { NavLink, useNavigate } from 'react-router-dom';
import { Compass, Map, BookOpen, Route, MessageCircle, Ticket, CalendarDays, Settings, LogOut, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';

const NAV = [
  { to: '/', label: 'Atrium', icon: Compass, end: true },
  { to: '/explore', label: 'Explore', icon: Map },
  { to: '/guide', label: 'Guide', icon: BookOpen },
  { to: '/trips', label: 'Itineraries', icon: Route },
  { to: '/assistant', label: 'Assistant', icon: MessageCircle },
  { to: '/bookings', label: 'Bookings', icon: Ticket },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function AppShell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const { user, logout } = useAuthStore();
  const { label, status, locate } = useLocationStore();
  const navigate = useNavigate();

  return (
    <div className={`${dark ? 'gallery-wall-dark' : 'gallery-wall'} min-h-screen`}>
      {/* Top bar */}
      <header className="relative z-10 border-b border-gilt/30 bg-ink/95 text-ivory backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-sm border border-gilt/70 bg-gradient-to-br from-gilt to-gold text-ink shadow-inset">
              <Compass size={18} strokeWidth={2.2} />
            </span>
            <span className="h-display text-base sm:text-lg leading-none">
              Grand <span className="text-gilt">Tour</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs">
            <button
              onClick={() => locate()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gilt/40 px-3 py-1 text-ivory/90 hover:bg-ivory/10"
              title="Use my location"
            >
              <MapPin size={13} className={status === 'locating' ? 'animate-pulse text-gilt' : 'text-gilt'} />
              <span className="max-w-[180px] truncate">{status === 'locating' ? 'Locating…' : label ?? (status === 'denied' ? 'Location blocked' : 'Share location')}</span>
            </button>
            <span className="hidden md:inline text-ivory/60">{user?.username}</span>
            <button onClick={logout} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-ivory/70 hover:bg-ivory/10 hover:text-ivory" title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
        {/* Nav */}
        <nav className="mx-auto max-w-7xl px-2 sm:px-4">
          <ul className="flex gap-1 overflow-x-auto pb-2 text-[13px]">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${isActive ? 'bg-gilt text-ink shadow-inset' : 'text-ivory/80 hover:bg-ivory/10 hover:text-ivory'}`
                  }
                >
                  <n.icon size={15} />
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="relative z-[1] mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">{children}</main>

      <footer className={`relative z-[1] border-t ${dark ? 'border-gilt/20 text-ivory/50' : 'border-umber/15 text-umber/70'} py-6 text-center text-xs font-serif`}>
        Grand Tour · Local AI travel companion · Data: OpenStreetMap, Wikivoyage, Wikipedia, Open-Meteo · Paintings: public domain via Wikimedia Commons
      </footer>
    </div>
  );
}
