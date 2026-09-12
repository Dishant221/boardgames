/**
 * Public-domain paintings served from Wikimedia Commons (Special:FilePath
 * redirects to the scaled original). All works listed are out of copyright.
 */
export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  file: string; // Commons file name
  tags: string[]; // rome, venice, florence, paris, europe, portrait, landscape...
  focus?: string; // CSS object-position hint
}

export const ARTWORKS: Artwork[] = [
  { id: 'panini-ancient-rome', title: 'Ancient Rome', artist: 'Giovanni Paolo Panini', year: '1757', file: 'Giovanni_Paolo_Panini_(Italian,_Piacenza_1691–1765_Rome)_-_Ancient_Rome_-_Google_Art_Project.jpg', tags: ['rome', 'europe', 'gallery', 'hero'] },
  { id: 'panini-modern-rome', title: 'Modern Rome', artist: 'Giovanni Paolo Panini', year: '1757', file: 'Giovanni_Paolo_Pannini_-_Picture_Gallery_with_Views_of_Modern_Rome_-_Google_Art_Project.jpg', tags: ['rome', 'europe', 'gallery', 'hero'] },
  { id: 'panini-pantheon', title: 'Interior of the Pantheon, Rome', artist: 'Giovanni Paolo Panini', year: 'c. 1734', file: 'Giovanni_Paolo_Panini_-_Interior_of_the_Pantheon,_Rome_-_Google_Art_Project.jpg', tags: ['rome', 'europe', 'interior', 'hero'] },
  { id: 'panini-pantheon-fantasy', title: 'Fantasy View with the Pantheon and other Monuments of Ancient Rome', artist: 'Giovanni Paolo Panini', year: '1737', file: 'Giovanni_Pauolo_Panini_-_Fantasy_View_with_the_Pantheon_and_other_Monuments_of_Ancient_Rome_-_Google_Art_Project.jpg', tags: ['rome', 'europe', 'ruins', 'hero'] },
  { id: 'canaletto-constantine', title: 'Rome: The Arch of Constantine', artist: 'Canaletto', year: '1742', file: 'Canaletto,_Rome_-_the_Arch_of_Constantine,_1742.jpg', tags: ['rome', 'europe', 'ruins'] },
  { id: 'robert-colosseum', title: 'Inside the Colosseum', artist: 'Hubert Robert', year: 'c. 1780', file: 'Hubert_Robert_-_Inside_the_Colosseum.jpg', tags: ['rome', 'europe', 'ruins'] },
  { id: 'corot-colosseum', title: 'The Colosseum seen from the Farnese Gardens', artist: 'Jean-Baptiste-Camille Corot', year: '1826', file: 'Corot_-_The_Colosseum_seen_from_the_Farnese_Garden.jpg', tags: ['rome', 'europe', 'landscape'] },
  { id: 'piranesi-colosseum', title: 'View of the Colosseum', artist: 'Giovanni Battista Piranesi', year: '1760', file: 'Giovanni_Battista_Piranesi,_Colosseum,_1760,_KKSgb9862,_Statens_Museum_for_Kunst.jpg', tags: ['rome', 'europe', 'engraving'] },
  { id: 'turner-rome-vatican', title: 'Rome, from the Vatican', artist: 'J. M. W. Turner', year: '1820', file: 'Turner_-_Rome,_from_the_Vatican._Raffaelle,_Accompanied_by_La_Fornarina,_Preparing_his_Pictures_for_the_Decoration_of_the_Loggia,_exhibited_1820,_N00503.jpg', tags: ['rome', 'europe', 'hero'] },
  { id: 'raphael-athens', title: 'The School of Athens', artist: 'Raphael', year: '1509–1511', file: '"The_School_of_Athens"_by_Raffaello_Sanzio_da_Urbino.jpg', tags: ['rome', 'europe', 'fresco', 'hero'] },
  { id: 'michelangelo-adam', title: 'The Creation of Adam', artist: 'Michelangelo', year: 'c. 1512', file: 'Creación_de_Adán_(Miguel_Ángel).jpg', tags: ['rome', 'europe', 'fresco'] },
  { id: 'michelangelo-pieta', title: 'Pietà', artist: 'Michelangelo', year: '1498–1499', file: "Michelangelo's_Pieta_5450_cropncleaned_edit.jpg", tags: ['rome', 'europe', 'sculpture'] },
  { id: 'canaletto-bucentaur', title: "The Bucintoro returning to the Molo on Ascension Day", artist: 'Canaletto', year: 'c. 1745', file: "Canaletto_-_Bucentaur's_return_to_the_pier_by_the_Palazzo_Ducale_-_Google_Art_Project.jpg", tags: ['venice', 'europe', 'hero'] },
  { id: 'canaletto-sanmarco', title: 'The Piazza San Marco in Venice', artist: 'Canaletto', year: 'c. 1723', file: 'Canaletto_-_The_Piazza_San_Marco_in_Venice_-_Google_Art_Project.jpg', tags: ['venice', 'europe', 'hero'] },
  { id: 'turner-venice', title: 'Venice, the Mouth of the Grand Canal', artist: 'J. M. W. Turner', year: 'c. 1840', file: 'Joseph_Mallord_William_Turner_-_Venice,_The_Mouth_of_the_Grand_Canal_-_Google_Art_Project.jpg', tags: ['venice', 'europe', 'landscape'] },
  { id: 'bellotto-florence', title: 'The Piazza della Signoria in Florence', artist: 'Bernardo Bellotto', year: '1742', file: 'Bernardo_Bellotto_-_The_Piazza_della_Signoria_in_Florence_-_Google_Art_Project.jpg', tags: ['florence', 'europe', 'hero'] },
  { id: 'botticelli-venus', title: 'The Birth of Venus', artist: 'Sandro Botticelli', year: 'c. 1485', file: 'Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg', tags: ['florence', 'europe', 'hero'] },
  { id: 'lorrain-seaport', title: 'Seaport at Sunset', artist: 'Claude Lorrain', year: '1639', file: 'Claude_Lorrain_008.jpg', tags: ['europe', 'landscape', 'harbour'] },
  { id: 'friedrich-wanderer', title: 'Wanderer above the Sea of Fog', artist: 'Caspar David Friedrich', year: '1818', file: 'Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg', tags: ['germany', 'europe', 'landscape', 'traveller', 'hero'] },
  { id: 'vermeer-delft', title: 'View of Delft', artist: 'Johannes Vermeer', year: 'c. 1660', file: 'Vermeer-view-of-delft.jpg', tags: ['netherlands', 'europe', 'landscape'] },
  { id: 'vermeer-pearl', title: 'Girl with a Pearl Earring', artist: 'Johannes Vermeer', year: 'c. 1665', file: 'Meisje_met_de_parel.jpg', tags: ['netherlands', 'europe', 'portrait'] },
  { id: 'vermeer-milkmaid', title: 'The Milkmaid', artist: 'Johannes Vermeer', year: 'c. 1658', file: 'Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg', tags: ['netherlands', 'europe', 'interior'] },
  { id: 'rembrandt-self', title: 'Self-Portrait', artist: 'Rembrandt', year: '1659', file: 'Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg', tags: ['netherlands', 'europe', 'portrait'] },
  { id: 'caillebotte-paris', title: 'Paris Street; Rainy Day', artist: 'Gustave Caillebotte', year: '1877', file: 'Gustave_Caillebotte_-_Paris_Street;_Rainy_Day_-_Google_Art_Project.jpg', tags: ['paris', 'europe', 'city', 'hero'] },
  { id: 'pissarro-montmartre', title: 'Boulevard Montmartre, Spring', artist: 'Camille Pissarro', year: '1897', file: 'Camille_Pissarro_-_Boulevard_Montmartre,_Spring_-_Google_Art_Project.jpg', tags: ['paris', 'europe', 'city'] },
  { id: 'renoir-galette', title: 'Bal du moulin de la Galette', artist: 'Pierre-Auguste Renoir', year: '1876', file: 'Pierre-Auguste_Renoir,_Le_Moulin_de_la_Galette.jpg', tags: ['paris', 'europe', 'people'] },
  { id: 'monet-lilies', title: 'Water Lilies', artist: 'Claude Monet', year: '1906', file: 'Claude_Monet_-_Water_Lilies_-_1906,_Ryerson.jpg', tags: ['paris', 'europe', 'nature'] },
  { id: 'vangogh-starry', title: 'The Starry Night', artist: 'Vincent van Gogh', year: '1889', file: 'Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', tags: ['europe', 'night', 'hero'] },
  { id: 'greco-toledo', title: 'View of Toledo', artist: 'El Greco', year: 'c. 1600', file: 'El_Greco_-_View_of_Toledo_-_Google_Art_Project.jpg', tags: ['spain', 'europe', 'landscape'] },
  { id: 'klimt-kiss', title: 'The Kiss', artist: 'Gustav Klimt', year: '1908', file: 'Gustav_Klimt_016.jpg', tags: ['vienna', 'europe', 'gold'] }
];

export function artUrl(a: Artwork, width = 1400): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(a.file)}?width=${width}`;
}

export function artByTag(tag: string): Artwork[] {
  const list = ARTWORKS.filter((a) => a.tags.includes(tag));
  return list.length ? list : ARTWORKS.filter((a) => a.tags.includes('europe'));
}

export function pickArt(tag: string, seed = 0): Artwork {
  const list = artByTag(tag);
  return list[Math.abs(seed) % list.length];
}

export function artById(id: string): Artwork | undefined {
  return ARTWORKS.find((a) => a.id === id);
}

/** Deterministic seed from a string so the same trip always gets the same painting. */
export function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function artForDestination(destination: string, seedStr = destination): Artwork {
  const d = destination.toLowerCase();
  const tag = /rome|roma|lazio|vatican/.test(d)
    ? 'rome'
    : /venice|venezia/.test(d)
      ? 'venice'
      : /florence|firenze|tuscany|toscana|siena|pisa/.test(d)
        ? 'florence'
        : /paris|france|lyon|nice|marseille/.test(d)
          ? 'paris'
          : /amsterdam|netherlands|delft|holland|rotterdam/.test(d)
            ? 'netherlands'
            : /spain|españa|madrid|toledo|barcelona|seville|sevilla/.test(d)
              ? 'spain'
              : /vienna|wien|austria/.test(d)
                ? 'vienna'
                : /germany|berlin|munich|dresden|hamburg/.test(d)
                  ? 'germany'
                  : 'europe';
  return pickArt(tag, seedFrom(seedStr));
}
