/**
 * Interface representing a background music track.
 */
export interface BackgroundMusicTrack {
  /** Unique identifier for the music track. */
  id: string;
  /** Display title of the music track. */
  title: string;
  /** Source path of the music file, relative to the /public directory. */
  src: string; // Path relative to /public directory
}

/**
 * Array of available background music tracks.
 */
export const BACKGROUND_MUSIC_TRACKS: BackgroundMusicTrack[] = [
  {
    id: 'trailer-music',
    title: 'Trailer Music',
    src: '/assets/trailer_music.mp3',
  },
];

/**
 * The ID of the default background music track to be used.
 */
export const DEFAULT_BACKGROUND_MUSIC_ID = 'trailer-music';

/**
 * Retrieves all available background music tracks.
 * @returns {BackgroundMusicTrack[]} An array of all background music tracks.
 * @example
 * const tracks = getAllBackgroundMusicTracks();
 * console.log(tracks[0].title); // "Trailer Music"
 */
export function getAllBackgroundMusicTracks(): BackgroundMusicTrack[] {
  return BACKGROUND_MUSIC_TRACKS;
}

/**
 * Retrieves a specific background music track by its ID.
 * @param {string} id - The ID of the music track to retrieve.
 * @returns {BackgroundMusicTrack | undefined} The music track if found, otherwise undefined.
 * @example
 * const track = getBackgroundMusicTrackById('trailer-music');
 * if (track) {
 *   console.log(track.src); // "/assets/trailer_music.mp3"
 * }
 */
export function getBackgroundMusicTrackById(id: string): BackgroundMusicTrack | undefined {
  return BACKGROUND_MUSIC_TRACKS.find(track => track.id === id);
}

/**
 * Retrieves a random background music track from the available list.
 * @returns {BackgroundMusicTrack} A randomly selected background music track.
 * @example
 * const randomTrack = getRandomBackgroundMusicTrack();
 * console.log(`Playing: ${randomTrack.title}`);
 */
export function getRandomBackgroundMusicTrack(): BackgroundMusicTrack {
  const randomIndex = Math.floor(Math.random() * BACKGROUND_MUSIC_TRACKS.length);
  return BACKGROUND_MUSIC_TRACKS[randomIndex];
}

/**
 * Retrieves the default background music track.
 * If the `DEFAULT_BACKGROUND_MUSIC_ID` is invalid, it falls back to the first track in the list.
 * @returns {BackgroundMusicTrack} The default background music track.
 * @example
 * const defaultMusic = getDefaultBackgroundMusicTrack();
 * console.log(`Default music is: ${defaultMusic.title}`);
 */
export function getDefaultBackgroundMusicTrack(): BackgroundMusicTrack {
  const defaultTrack = getBackgroundMusicTrackById(DEFAULT_BACKGROUND_MUSIC_ID);
  // Fallback to the first track if the default ID is somehow invalid
  return defaultTrack || BACKGROUND_MUSIC_TRACKS[0];
} 