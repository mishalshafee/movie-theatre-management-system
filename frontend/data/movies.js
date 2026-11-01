/**
 * Demo movie data for the Home page ONLY.
 *
 * These are FICTIONAL demonstration records used purely to showcase the
 * visual design of the homepage. They are NOT connected to the backend and
 * are NOT used by any booking / authentication logic.
 *
 * Posters live in /images/movies as local SVG files so there are
 * never broken images.
 */
export const movies = [
  {
    id: 'demo-1',
    title: 'Stellar Horizon',
    genre: 'Sci-Fi',
    duration: '2h 18m',
    rating: 8.7,
    status: 'now', // 'now' | 'soon'
    poster: 'images/movies/movie-1.svg',
    synopsis:
      'A lone navigator drifts toward the edge of charted space in search of a signal that could rewrite humanity.',
  },
  {
    id: 'demo-2',
    title: 'Midnight Reverie',
    genre: 'Thriller',
    duration: '1h 56m',
    rating: 8.2,
    status: 'now',
    poster: 'images/movies/movie-2.svg',
    synopsis:
      'A sleep researcher discovers her dreams are being broadcast to strangers across the city.',
  },
  {
    id: 'demo-3',
    title: 'Crimson Vale',
    genre: 'Drama',
    duration: '2h 04m',
    rating: 8.9,
    status: 'now',
    poster: 'images/movies/movie-3.svg',
    synopsis:
      'Three generations of a family confront a long-buried secret in a valley that never forgets.',
  },
  {
    id: 'demo-4',
    title: 'Echoes of Tomorrow',
    genre: 'Sci-Fi',
    duration: '2h 31m',
    rating: 8.5,
    status: 'soon',
    poster: 'images/movies/movie-4.svg',
    synopsis:
      'When the future starts leaving voicemails, a historian must decide which one to answer.',
  },
  {
    id: 'demo-5',
    title: 'The Last Cartographer',
    genre: 'Adventure',
    duration: '2h 09m',
    rating: 8.0,
    status: 'soon',
    poster: 'images/movies/movie-5.svg',
    synopsis:
      'The final mapmaker embarks on one last expedition to chart a forest that keeps moving.',
  },
  {
    id: 'demo-6',
    title: 'Paper Moon Boulevard',
    genre: 'Romance',
    duration: '1h 48m',
    rating: 7.8,
    status: 'soon',
    poster: 'images/movies/movie-6.svg',
    synopsis:
      'Two strangers keep meeting on the same neon street at the same impossible hour every night.',
  },
];

export const nowShowing = movies.filter((m) => m.status === 'now');
export const comingSoon = movies.filter((m) => m.status === 'soon');
