import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Painting from '../components/Painting';
import { pickArt } from '../lib/art';
import { ErrorNote } from '../components/Section';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const art = pickArt('venice', 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirm) return setLocalError('Passwords do not match');
    if (password.length < 8) return setLocalError('Password must be at least 8 characters');
    try {
      await signup(email, username, password, homeCity || undefined);
      navigate('/');
    } catch {
      /* error shown from store */
    }
  };

  return (
    <div className="gallery-wall-dark min-h-screen">
      <div className="relative z-[1] mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <div className="marble-dark order-2 animate-fade-in p-8 shadow-frame sm:p-10 lg:order-1">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-sm border border-gilt/70 bg-gradient-to-br from-gilt to-gold text-ink">
              <Compass size={22} />
            </span>
            <div>
              <h1 className="h-display text-xl leading-tight">Create your atlas</h1>
              <p className="font-serif text-sm italic text-ivory/70">A private workspace, provisioned just for you.</p>
            </div>
          </div>

          <ErrorNote message={error ?? localError} onClose={() => { clearError(); setLocalError(null); }} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field text-ivory/70">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" placeholder="marco.polo" required autoComplete="username" />
              </div>
              <div>
                <label className="field text-ivory/70">Home city (optional)</label>
                <input value={homeCity} onChange={(e) => setHomeCity(e.target.value)} className="input" placeholder="Venice" />
              </div>
            </div>
            <div>
              <label className="field text-ivory/70">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field text-ivory/70">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required autoComplete="new-password" />
              </div>
              <div>
                <label className="field text-ivory/70">Confirm</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" required autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-gilt w-full">
              {isLoading ? 'Preparing your workspace…' : 'Begin the Grand Tour'}
            </button>
          </form>

          <p className="mt-6 text-center font-serif text-sm text-ivory/70">
            Already a member?{' '}
            <Link to="/login" className="text-gilt underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </div>
        <div className="order-1 hidden lg:order-2 lg:block animate-rise-in">
          <Painting art={art} ornate width={1400} />
        </div>
      </div>
    </div>
  );
}
