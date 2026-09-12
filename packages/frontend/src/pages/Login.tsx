import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Painting from '../components/Painting';
import { pickArt } from '../lib/art';
import { ErrorNote } from '../components/Section';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const art = pickArt('hero', new Date().getDate());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      /* error shown from store */
    }
  };

  return (
    <div className="gallery-wall-dark min-h-screen">
      <div className="relative z-[1] mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <div className="hidden lg:block animate-rise-in">
          <Painting art={art} ornate width={1400} />
        </div>
        <div className="marble-dark animate-fade-in p-8 shadow-frame sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-sm border border-gilt/70 bg-gradient-to-br from-gilt to-gold text-ink">
              <Compass size={22} />
            </span>
            <div>
              <h1 className="h-display text-xl leading-tight">
                Grand <span className="text-gilt">Tour</span>
              </h1>
              <p className="font-serif text-sm italic text-ivory/70">Your local guide, in your pocket.</p>
            </div>
          </div>

          <ErrorNote message={error} onClose={clearError} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field text-ivory/70">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div>
              <label className="field text-ivory/70">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required autoComplete="current-password" />
            </div>
            <button type="submit" disabled={isLoading} className="btn-gilt w-full">
              {isLoading ? 'Opening the doors…' : 'Enter the gallery'}
            </button>
          </form>

          <p className="mt-6 text-center font-serif text-sm text-ivory/70">
            New traveller?{' '}
            <Link to="/signup" className="text-gilt underline-offset-2 hover:underline">
              Create your atlas
            </Link>
          </p>
          <p className="mt-8 text-center text-[11px] text-ivory/40">
            Each account gets its own private workspace and a fair daily share of the free tier.
          </p>
        </div>
      </div>
    </div>
  );
}
