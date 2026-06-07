import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import GameCard from "../components/GameCard";
import { buildGameCatalog, getPlatformLabel, getGameIcon } from "../data/gameCatalog";
import { GAMES_CHANGE_EVENT, getStoredGames, refreshGames } from "../data/gameStore";
import { fetchBanners } from "../api/client";

function Home() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q")?.trim().toLowerCase() || "";
  const [homeBanners, setHomeBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [gamesData, setGamesData] = useState(() => getStoredGames());

  const gameCatalog = useMemo(() => {
    return buildGameCatalog(gamesData);
  }, [gamesData]);

  const filteredGames = useMemo(() => {
    const searchedGames = gameCatalog.filter((game) => game.name.toLowerCase().includes(keyword));
    const categoryGames =
      activeCategory === "all"
        ? searchedGames
        : searchedGames.filter((game) => {
            const platform = String(game.platform || "").toLowerCase();
            const target = activeCategory.toLowerCase();
            // Cek apakah kategori mengandung kata kunci (misal: "Mobile Game" mengandung "mobile")
            return platform.includes(target);
          });

    return [...categoryGames].sort((firstGame, secondGame) =>
      firstGame.name.localeCompare(secondGame.name, "id-ID")
    );
  }, [activeCategory, gameCatalog, keyword]);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const data = await fetchBanners();
        setHomeBanners(data || []);
      } catch (err) {
        console.error("Gagal memuat banner:", err);
      }
    };
    loadBanners();
  }, []);

  useEffect(() => {
    if (homeBanners.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % homeBanners.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [homeBanners.length]);

  useEffect(() => {
    let isMounted = true;

    const syncGames = () => {
      setGamesData(getStoredGames());
    };

    const hydrateGames = async () => {
      const latestGames = await refreshGames();
      if (isMounted) {
        setGamesData(latestGames);
      }
    };

    hydrateGames();
    window.addEventListener("storage", syncGames);
    window.addEventListener(GAMES_CHANGE_EVENT, syncGames);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncGames);
      window.removeEventListener(GAMES_CHANGE_EVENT, syncGames);
    };
  }, []);

  const goToBanner = (index) => {
    setActiveBanner(index);
  };

  const goToPrevBanner = () => {
    setActiveBanner((current) => (current - 1 + homeBanners.length) % homeBanners.length);
  };

  const goToNextBanner = () => {
    setActiveBanner((current) => (current + 1) % homeBanners.length);
  };

  return (
    <div className="home-page" style={styles.container}>
      <div className="home-banner" style={styles.bannerSection}>
        <div className="home-banner__viewport" style={styles.bannerViewport}>
          <div
            style={{
              ...styles.bannerTrack,
              width: `${homeBanners.length * 100}%`,
              transform: `translateX(-${activeBanner * (100 / homeBanners.length)}%)`
            }}
          >
            {homeBanners.map((banner) => (
              <div
                key={banner.id}
                style={{
                  ...styles.bannerSlide,
                  width: `${100 / homeBanners.length}%`,
                  flex: `0 0 ${100 / homeBanners.length}%`
                }}
              >
                <img src={banner.image} alt={banner.alt} style={styles.bannerImage} />
              </div>
            ))}
          </div>

          {homeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevBanner}
                style={{ ...styles.bannerArrow, ...styles.bannerArrowLeft }}
                aria-label="Banner sebelumnya"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={goToNextBanner}
                style={{ ...styles.bannerArrow, ...styles.bannerArrowRight }}
                aria-label="Banner berikutnya"
              >
                &#8250;
              </button>
            </>
          )}
        </div>

        {homeBanners.length > 1 && (
          <div style={styles.bannerDots}>
            {homeBanners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goToBanner(index)}
                style={{
                  ...styles.bannerDot,
                  ...(activeBanner === index ? styles.bannerDotActive : {})
                }}
                aria-label={`Pindah ke banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <p className="home-section-heading" style={styles.sectionHeading}>pilih produk faforitmu</p>

      <div className="home-filters" style={styles.filters}>
        <button
          type="button"
          style={activeCategory === "all" ? styles.activeChip : styles.chip}
          onClick={() => setActiveCategory("all")}
        >
          Semua Game
        </button>
        <button
          type="button"
          style={activeCategory === "pc" ? styles.activeChip : styles.chip}
          onClick={() => setActiveCategory("pc")}
        >
          PC Game
        </button>
        <button
          type="button"
          style={activeCategory === "mobile" ? styles.activeChip : styles.chip}
          onClick={() => setActiveCategory("mobile")}
        >
          Mobile Game
        </button>
      </div>
      {keyword && (
        <p style={styles.searchInfo}>
          Hasil pencarian untuk "{searchParams.get("q")}" ({filteredGames.length} game)
        </p>
      )}

      {keyword ? (
        <div className="home-search-results" style={styles.searchResultsList}>
          {filteredGames.map((game) => (
            <Link key={game.id} to={`/game/${game.id}`} style={styles.searchResultLink}>
              <div style={styles.searchResultCard}>
                <img 
                  src={game.icon || getGameIcon(game.id)} 
                  alt={game.name} 
                  style={styles.searchResultIcon} 
                />
                <div style={styles.searchResultText}>
                  <strong style={styles.searchResultName}>{game.name}</strong>
                  <span style={styles.searchResultMeta}>{getPlatformLabel(game.platform)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="home-game-grid" style={styles.grid}>
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {!filteredGames.length && (
        <p style={styles.emptyState}>Game tidak ditemukan.</p>
      )}
    </div>
  );
}

const chipBase = {
  padding: "8px 16px",
  color: "white",
  borderRadius: "20px",
  cursor: "default"
};

const styles = {
  container: {
    background: "#3b3f6b",
    minHeight: "100vh",
    padding: "20px 12px"
  },
  bannerSection: {
    width: "100%",
    maxWidth: "1560px",
    margin: "0 auto 32px auto"
  },
  bannerViewport: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "8px",
    border: "1px solid #4c5787",
    background: "#1f2747",
    aspectRatio: "16 / 4.5",
    minHeight: "320px"
  },
  bannerTrack: {
    display: "flex",
    height: "100%",
    transition: "transform 0.45s ease"
  },
  bannerSlide: {
    height: "100%"
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  },
  bannerArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    background: "rgba(12, 17, 34, 0.65)",
    color: "white",
    fontSize: "28px",
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  bannerArrowLeft: {
    left: "12px"
  },
  bannerArrowRight: {
    right: "12px"
  },
  bannerDots: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginTop: "12px"
  },
  bannerDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    border: "none",
    background: "#7f8bb8",
    cursor: "pointer",
    padding: 0
  },
  bannerDotActive: {
    background: "#4CAF50"
  },
  filters: {
    display: "flex",
    gap: "10px",
    margin: "0 auto 20px auto",
    flexWrap: "wrap",
    maxWidth: "1560px"
  },
  sectionHeading: {
    maxWidth: "1560px",
    margin: "0 auto 14px auto",
    color: "white",
    fontSize: "28px",
    fontWeight: "700",
    textTransform: "capitalize"
  },
  activeChip: {
    ...chipBase,
    background: "#4CAF50",
    border: "none"
  },
  chip: {
    ...chipBase,
    background: "#2a3550",
    border: "1px solid #3a4060"
  },
  searchInfo: {
    color: "#d7def5",
    textAlign: "center",
    margin: "0 0 24px 0"
  },
  searchResultsList: {
    display: "grid",
    gap: "14px",
    maxWidth: "960px",
    margin: "0 auto"
  },
  searchResultLink: {
    textDecoration: "none"
  },
  searchResultCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 16px",
    background: "#1f2747",
    borderRadius: "16px",
    border: "1px solid #4c5787"
  },
  searchResultIcon: {
    width: "58px",
    height: "58px",
    objectFit: "cover",
    borderRadius: "14px",
    flexShrink: 0
  },
  searchResultText: {
    display: "grid",
    gap: "4px"
  },
  searchResultName: {
    color: "white",
    fontSize: "16px"
  },
  searchResultMeta: {
    color: "#c8d0ef",
    fontSize: "13px"
  },
  grid: {
    display: "flex",
    gap: "50px",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: "1560px",
    margin: "0 auto"
  },
  emptyState: {
    color: "#d7def5",
    textAlign: "center",
    marginTop: "24px"
  }
};

export default Home;
