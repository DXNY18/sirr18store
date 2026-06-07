import defaultGames from "./games";
import { fetchGames } from "../api/client";

export const GAMES_STORAGE_KEY = "dstoreGames";
export const GAMES_CHANGE_EVENT = "gameschange";

const cloneGames = (source) => JSON.parse(JSON.stringify(source));
let memoryGames = null;

export function getStoredGames() {
  if (memoryGames) {
    return cloneGames(memoryGames);
  }

  if (typeof window === "undefined") {
    return cloneGames(defaultGames);
  }

  const rawGames = localStorage.getItem(GAMES_STORAGE_KEY);
  if (!rawGames) {
    return cloneGames(defaultGames);
  }

  try {
    const parsedGames = JSON.parse(rawGames);
    if (!parsedGames || typeof parsedGames !== "object" || Array.isArray(parsedGames)) {
      return cloneGames(defaultGames);
    }

    return parsedGames;
  } catch (error) {
    return cloneGames(defaultGames);
  }
}

export function saveGames(updatedGames) {
  memoryGames = cloneGames(updatedGames);

  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));
  } catch (error) {
    console.warn("Cache katalog game terlalu besar untuk localStorage. Data tetap dipakai dari memori/API.", error);
  }

  window.dispatchEvent(new Event(GAMES_CHANGE_EVENT));
}

export async function refreshGames() {
  try {
    const gamesFromApi = await fetchGames();
    saveGames(gamesFromApi);
    return gamesFromApi;
  } catch (error) {
    console.warn("Gagal memuat katalog game dari API. Menggunakan cache lokal jika tersedia.", error);
    return getStoredGames();
  }
}
