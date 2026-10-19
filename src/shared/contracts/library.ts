// Library rules shared by the server actions, the library service and the UI forms.
import { z } from "zod";

export const PLAYLIST_NAME_MAX = 60;
export const MAX_PLAYLISTS_PER_USER = 50;
export const MAX_TRACKS_PER_PLAYLIST = 500;
/** Name of the general playlist (saved tracks). Reserved for custom playlists. */
export const SAVED_PLAYLIST_NAME = "Guardadas";

/** Trimmed name of 1 to 60 characters (code points, like char_length), never "Guardadas". */
export const playlistNameSchema = z
  .string()
  .trim()
  .refine((name) => name.length > 0, "Escribe un nombre para la playlist.")
  .refine(
    (name) => Array.from(name).length <= PLAYLIST_NAME_MAX,
    `El nombre puede tener hasta ${PLAYLIST_NAME_MAX} caracteres.`,
  )
  .refine(
    (name) => name.toLocaleLowerCase("es") !== SAVED_PLAYLIST_NAME.toLocaleLowerCase("es"),
    `"${SAVED_PLAYLIST_NAME}" es el nombre de tu playlist general.`,
  );

export const trackIdSchema = z.int().positive();
export const playlistIdSchema = z.uuid();
