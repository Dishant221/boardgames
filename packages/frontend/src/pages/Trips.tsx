import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppShell from '../components/AppShell';
import Painting from '../components/Painting';
import { SectionTitle, Spinner, ErrorNote, Empty } from '../components/Section';
import { tripsApi, errorMessage } from '../utils/api';
import { artForDestination } from '../lib/art';
import type { Trip } from '../lib/types';
import { fmtDate } from '../lib/format';

export default function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ destination: '', title: '', start_date: '', end_date: '', notes: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    tripsApi
      .list()
      .then((r) => setTrips(r.data.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const r = await tripsApi.create({
        destination: form.destination,
        title: form.title || undefined,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null
      });
      navigate(`/trips/${r.data.data.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <SectionTitle
        eyebrow="Itineraries"
        title="Your journeys"
        action={
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> New trip
          </button>
        }
      />
      <ErrorNote message={error} onClose={() => setError(null)} />

      {open && (
        <form onSubmit={create} className="marble mb-8 grid gap-3 p-5 sm:grid-cols-2 animate-rise-in">
          <div className="sm:col-span-2">
            <label className="field">Destination</label>
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="input" placeholder="Rome, Italy" required autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="field">Title (optional)</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="Long weekend in the Eternal City" />
          </div>
          <div>
            <label className="field">Start</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" />
          </div>
          <div>
            <label className="field">End</label>
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input" min={form.start_date} />
          </div>
          <div className="sm:col-span-2">
            <label className="field">Notes for the planner</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={2} placeholder="Travelling with kids, love baroque churches, vegetarian, slow mornings…" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Create trip'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Spinner label="Fetching your journeys…" />}
      {!loading && trips.length === 0 && !open && <Empty title="No journeys yet" hint="Create a trip and let the guide draft a day-by-day plan from real places." />}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <Link key={t.id} to={`/trips/${t.id}`} className="group animate-fade-in">
            <Painting art={artForDestination(t.destination, t.id)} caption={false} width={900} />
            <div className="mt-3 flex items-start justify-between gap-2">
              <div>
                <div className="font-serif text-xl font-semibold leading-tight group-hover:text-terracotta">{t.title}</div>
                <div className="text-sm text-umber/80">{t.destination}</div>
              </div>
              <span className="placard shrink-0 !text-[10px] uppercase">{t.status}</span>
            </div>
            {t.start_date && (
              <div className="text-xs text-umber/70">
                {fmtDate(t.start_date)} {t.end_date && `– ${fmtDate(t.end_date)}`}
              </div>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
