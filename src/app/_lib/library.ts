import "server-only";

import { getDb } from "@/modules/db";
import { createLibraryService, type LibraryService } from "@/modules/library";

let library: LibraryService | undefined;

/** One library service per server instance, for pages and server actions. */
export const getLibrary = () => (library ??= createLibraryService(getDb()));

/** Rows per page of /saved, for the first render and every "Cargar más". */
export const SAVED_PAGE_SIZE = 30;
