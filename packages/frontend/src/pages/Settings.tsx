import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import UsageMeters from '../components/UsageMeters';
import { SectionTitle, ErrorNote, Ornament, Spinner } from '../components/Section';
import { useAuthStore } from '../store/authStore';
import { discoverApi, errorMessage } from '../utils/api';
import type { Usage } from '../lib/types';

const ENGINES = ['google', 'bing', 'duckduckgo', 'brave', 'ecosia'] as const;
const INTERESTS = ['art', 'history', 'food', 'wine', 'architecture', 'museums', 'nature', 'hiking', 'nightlife', 'shopping', 'family', 'photography', 'music', 'beaches', 'slow travel'];

export default function Settings() {
  const { user, tenant, preferences, updatePreferences } = useAuthStore();
  const [form, setForm] = useState({
    home_city_query: preferences?.home_city ?? '',
    search_engine: preferences?.search_engine ?? 'google',
    units: preferences?.units ?? 'metric',
    language: preferences?.language ?? 'en',
    currency: preferences?.currency ?? 'EUR',
    interests: preferences?.interests ?? [],
    voice_enabled: preferences?.voice_enabled ?? true
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    if (preferences) {
      setForm({
        home_city_query: preferences.home_city ?? '',
        search_engine: preferences.search_engine,
        units: preferences.units,
        language: preferences.language,
        currency: preferences.currency,
        interests: preferences.interests ?? [],
        voice_enabled: preferences.voice_enabled
      });
    }
  }, [preferences]);

  useEffect(() => {
    discoverApi.usage().then((r) => setUsage(r.data.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updatePreferences(form);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (i: string) => setForm((f) => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i].slice(0, 12) }));

  return (
    <AppShell>
      <SectionTitle eyebrow="Settings" title="Your preferences" />
      <ErrorNote message={error} onClose={() => setError(null)} />

      <form onSubmit={save} className="marble grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="field">Home city</label>
          <input value={form.home_city_query} onChange={(e) => setForm({ ...form, home_city_query: e.target.value })} className="input" placeholder="Venice, Italy" />
          <p className="mt-1 text-xs text-umber/70">Used as the origin for flights and as a fallback when your location is unavailable. Currently: {preferences?.home_city ?? 'not set'}.</p>
        </div>
        <div>
          <label className="field">Preferred search engine</label>
          <select value={form.search_engine} onChange={(e) => setForm({ ...form, search_engine: e.target.value as (typeof ENGINES)[number] })} className="input">
            {ENGINES.map((e) => (
              <option key={e} value={e}>
                {e === 'duckduckgo' ? 'DuckDuckGo' : e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-umber/70">The assistant opens keyword searches in this engine.</p>
        </div>
        <div>
          <label className="field">Units</label>
          <select value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value as 'metric' | 'imperial' })} className="input">
            <option value="metric">Metric (km, °C)</option>
            <option value="imperial">Imperial (mi, °F)</option>
          </select>
        </div>
        <div>
          <label className="field">Language (voice & replies)</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input">
            {[['en', 'English'], ['it', 'Italiano'], ['fr', 'Français'], ['es', 'Español'], ['de', 'Deutsch'], ['pt', 'Português'], ['nl', 'Nederlands'], ['hi', 'हिन्दी'], ['ja', '日本語']].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field">Currency</label>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} className="input" placeholder="EUR" />
        </div>
        <div className="md:col-span-2">
          <label className="field">Interests (shape itineraries and suggestions)</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button type="button" key={i} onClick={() => toggleInterest(i)} className={`chip ${form.interests.includes(i) ? 'chip-active' : ''}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.voice_enabled} onChange={(e) => setForm({ ...form, voice_enabled: e.target.checked })} className="accent-terracotta" />
          Enable voice (call mode) in this browser
        </label>
        <div className="flex items-center gap-3 md:col-span-2">
          <button disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
          {saved && <span className="text-sm text-verdigris">Saved ✓</span>}
        </div>
      </form>

      <Ornament>Your workspace</Ornament>

      <div className="marble mb-6 grid gap-3 p-5 text-sm sm:grid-cols-3">
        <div>
          <div className="small-caps text-xs text-gold">Account</div>
          <div className="font-medium">{user?.username}</div>
          <div className="text-umber/70">{user?.email}</div>
        </div>
        <div>
          <div className="small-caps text-xs text-gold">Tenant</div>
          <div className="font-medium">{tenant?.name}</div>
          <div className="truncate text-umber/70" title={tenant?.id}>{tenant?.id}</div>
        </div>
        <div>
          <div className="small-caps text-xs text-gold">Isolation</div>
          <div className="font-medium">Private Durable Object + row-level D1 scoping</div>
          <div className="text-umber/70">Your conversations, quota counters and location live only in your own store.</div>
        </div>
      </div>

      {usage ? <UsageMeters usage={usage} /> : <Spinner label="Loading usage…" />}
    </AppShell>
  );
}
