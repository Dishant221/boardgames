import { useState } from 'react';
import { artUrl, type Artwork } from '../lib/art';

interface Props {
  art: Artwork;
  className?: string;
  width?: number;
  ornate?: boolean;
  caption?: boolean;
  aspect?: string; // e.g. 'aspect-[4/3]'
}

/** A gilt-framed painting with a museum placard. */
export default function Painting({ art, className = '', width = 1200, ornate = false, caption = true, aspect = 'aspect-[4/3]' }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <figure className={`relative ${className}`}>
      <div className={`frame ${ornate ? 'frame-ornate' : ''} shadow-frame ${aspect}`}>
        <div className={`frame-inner relative overflow-hidden bg-umber/80 ${aspect}`}>
          {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-umber/70 to-ink/80" />}
          <img
            src={artUrl(art, width)}
            alt={`${art.title} by ${art.artist}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ objectPosition: art.focus ?? 'center' }}
          />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 flex justify-center">
          <span className="placard">
            <span className="font-semibold">{art.artist}</span>
            <span className="mx-1.5 text-gilt">·</span>
            <em>{art.title}</em>
            <span className="mx-1.5 text-gilt">·</span>
            {art.year}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
