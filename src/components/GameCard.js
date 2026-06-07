import { useState } from "react";
import { Link } from "react-router-dom";

function GameCard({ game }) {
  const [isHovered, setIsHovered] = useState(false);
  const imageScale =
    game.id === "genshin" ? (isHovered ? "scale(1.18)" : "scale(1.12)") : "scale(1)";
  const imagePosition = game.id === "valorant" ? "center 30%" : "center";

  return (
    <Link to={`/game/${game.id}`} style={{ textDecoration: "none" }}>
      <div
        className="game-card"
        style={{
          ...styles.card,
          transform: isHovered ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
          boxShadow: isHovered ? "0 0 28px rgba(111, 155, 255, 0.55)" : "0 0 0 rgba(0, 0, 0, 0)"
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={styles.imageContainer}>
          <img
            src={game.img}
            alt={game.name}
            style={{
              ...styles.img,
              transform: imageScale,
              objectPosition: imagePosition
            }}
          />
          <div
            style={{
              ...styles.overlay,
              opacity: isHovered ? 1 : 0.72
            }}
          />
          <h4 style={styles.title}>{game.name}</h4>
        </div>
      </div>
    </Link>
  );
}

const styles = {
  card: {
    width: "169px",
    height: "289px",
    borderRadius: "15px",
    overflow: "hidden",
    background: "#000",
    cursor: "pointer",
    transition: "transform 0.22s ease, box-shadow 0.22s ease",
    position: "relative",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: "100%"
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.22s ease"
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(12,18,36,0.05) 20%, rgba(8,12,24,0.88) 100%)",
    transition: "opacity 0.22s ease"
  },
  title: {
    position: "absolute",
    bottom: "8px",
    left: "50%",
    transform: "translateX(-50%)",
    margin: "0",
    padding: "0 8px",
    background: "transparent",
    color: "white",
    textAlign: "center",
    textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
    fontWeight: "bold",
    fontSize: "14px",
    width: "100%",
    zIndex: 1
  }
};

export default GameCard;
