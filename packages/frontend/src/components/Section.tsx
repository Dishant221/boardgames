export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        {eyebrow && <div className="small-caps text-xs text-gold">{eyebrow}</div>}
        <h2 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Ornament({ children }: { children?: React.ReactNode }) {
  return <div className="ornament my-6 text-xs font-display uppercase tracking-[0.3em]">{children ?? '❧'}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="marble p-8 text-center">
      <div className="font-serif text-lg text-umber">{title}</div>
      {hint && <p className="mt-1 text-sm text-umber/70">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-venetian/40 bg-venetian/10 px-3 py-2 text-sm text-venetian">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-xs font-bold">
          ✕
        </button>
      )}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-umber/80">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gilt border-t-transparent" />
      {label && <span className="font-serif">{label}</span>}
    </div>
  );
}
