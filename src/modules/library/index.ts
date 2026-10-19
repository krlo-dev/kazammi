// Public API of the library module. Import this module only through this file.
// Every function takes the userId from requireUser() on the server, never from the client.
import "server-only";

import type { Database } from "@/modules/db";

import {
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  playlistsForTrack,
  removeFromPlaylist,
  renamePlaylist,
} from "./playlists";
import { isSaved, listSaved, recentSaved, saveTrack, unsaveTrack } from "./saved";
import type { Page, PlaylistDetail, PlaylistSummary, SavedTrack } from "./types";

export type { Page, PlaylistDetail, PlaylistSummary, SavedTrack } from "./types";

export interface LibraryService {
  saveTrack(userId: string, trackId: number): Promise<void>;
  unsaveTrack(userId: string, trackId: number): Promise<void>;
  isSaved(userId: string, trackId: number): Promise<boolean>;
  listSaved(userId: string, opts: { limit: number; cursor?: string }): Promise<Page<SavedTrack>>;
  recentSaved(userId: string, limit?: number): Promise<SavedTrack[]>;

  listPlaylists(userId: string): Promise<PlaylistSummary[]>;
  /** NotFoundError when the playlist is missing or belongs to another user. */
  getPlaylist(userId: string, playlistId: string): Promise<PlaylistDetail>;
  /** ValidationError for a bad or repeated name, LimitError past 50 playlists. */
  createPlaylist(userId: string, name: string): Promise<PlaylistSummary>;
  renamePlaylist(userId: string, playlistId: string, name: string): Promise<void>;
  deletePlaylist(userId: string, playlistId: string): Promise<void>;
  /** Also saves the track. LimitError past 500 tracks. */
  addToPlaylist(userId: string, playlistId: string, trackId: number): Promise<void>;
  removeFromPlaylist(userId: string, playlistId: string, trackId: number): Promise<void>;
  playlistsForTrack(
    userId: string,
    trackId: number,
  ): Promise<Array<{ id: string; name: string; contains: boolean }>>;
}

export function createLibraryService(db: Database): LibraryService {
  return {
    saveTrack: (userId, trackId) => saveTrack(db, userId, trackId),
    unsaveTrack: (userId, trackId) => unsaveTrack(db, userId, trackId),
    isSaved: (userId, trackId) => isSaved(db, userId, trackId),
    listSaved: (userId, opts) => listSaved(db, userId, opts),
    recentSaved: (userId, limit) => recentSaved(db, userId, limit),
    listPlaylists: (userId) => listPlaylists(db, userId),
    getPlaylist: (userId, playlistId) => getPlaylist(db, userId, playlistId),
    createPlaylist: (userId, name) => createPlaylist(db, userId, name),
    renamePlaylist: (userId, playlistId, name) => renamePlaylist(db, userId, playlistId, name),
    deletePlaylist: (userId, playlistId) => deletePlaylist(db, userId, playlistId),
    addToPlaylist: (userId, playlistId, trackId) => addToPlaylist(db, userId, playlistId, trackId),
    removeFromPlaylist: (userId, playlistId, trackId) =>
      removeFromPlaylist(db, userId, playlistId, trackId),
    playlistsForTrack: (userId, trackId) => playlistsForTrack(db, userId, trackId),
  };
}
