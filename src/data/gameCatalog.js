import defaultGames from "./games";

export const FALLBACK_GAME_ICON = "/assets/ff_icon.jpeg";

const gameMetadata = {
  ml: {
    img: "/assets/ml_poster.jpg",
    icon: "/assets/ml_icon.jpeg",
    platform: "mobile"
  },
  ff: {
    img: "/assets/ff_poster.jpg",
    icon: "/assets/ff_icon.jpeg",
    platform: "mobile"
  },
  genshin: {
    img: "/assets/genshin_poster.jpg",
    icon: "/assets/genshin_icon.jpeg",
    platform: ["pc", "mobile"]
  },
  pubg: {
    img: "/assets/pubg_poster.jpg",
    icon: "/assets/pubg_icon.jpeg",
    platform: "mobile"
  },
  arena: {
    img: "/assets/ab_background.jpg",
    icon: "/assets/ab_icon.jpeg",
    platform: "mobile"
  },
  valorant: {
    img: "/assets/valorant_poster.jpg",
    icon: "/assets/Valorant Icon.jpeg",
    platform: "pc"
  }
};

const inferPlatform = (game) => {
  const category = game.category?.toLowerCase() || "";

  if (category.includes("pc") && category.includes("mobile")) {
    return ["pc", "mobile"];
  }

  if (category.includes("pc")) {
    return "pc";
  }

  return "mobile";
};

export const getGameIcon = (gameId, gamesSource = defaultGames) =>
  gamesSource?.[gameId]?.icon || gameMetadata[gameId]?.icon || FALLBACK_GAME_ICON;

export const getPlatformLabel = (platform) => {
  if (Array.isArray(platform)) {
    return "PC & Mobile";
  }

  return platform === "pc" ? "PC Game" : "Mobile Game";
};

export function buildGameCatalog(gamesSource = defaultGames) {
  return Object.entries(gamesSource).map(([id, game]) => {
    const metadata = gameMetadata[id] || {};

    return {
      id,
      name: game.name,
      img: game.poster || metadata.img || game.banner,
      icon: game.icon || metadata.icon || FALLBACK_GAME_ICON,
      platform: metadata.platform || inferPlatform(game)
    };
  });
}
