function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.content}>
        <div style={styles.brandBlock}>
          <p style={styles.brand}>SIRR18 STORE</p>
          <p style={styles.tagline}>Top up game cepat, aman, dan praktis untuk kebutuhan gaming harian.</p>
        </div>

        <div style={styles.aboutBlock}>
          <p style={styles.heading}>About</p>
          <p style={styles.aboutText}>
            Sirr18 Store adalah platform top up game yang membantu pemain membeli item game favorit
            dengan proses yang sederhana dan verifikasi yang jelas.
          </p>
        </div>
      </div>

      <div style={styles.bottomBar}>
        <span>&copy; 2026 Sirr18 Store. All rights reserved.</span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    background: "#111827",
    borderTop: "1px solid #26314f",
    color: "#e5ecff",
    padding: "28px 20px 16px"
  },
  content: {
    maxWidth: "1560px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    flexWrap: "wrap"
  },
  brandBlock: {
    flex: "1 1 260px"
  },
  aboutBlock: {
    flex: "1 1 320px"
  },
  brand: {
    margin: "0 0 10px 0",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "0.08em"
  },
  tagline: {
    margin: 0,
    color: "#b8c3e0",
    lineHeight: 1.6
  },
  heading: {
    margin: "0 0 10px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#ffffff"
  },
  aboutText: {
    margin: 0,
    color: "#b8c3e0",
    lineHeight: 1.6
  },
  bottomBar: {
    maxWidth: "1560px",
    margin: "18px auto 0",
    paddingTop: "14px",
    borderTop: "1px solid rgba(184, 195, 224, 0.16)",
    color: "#92a0c2",
    fontSize: "13px"
  }
};

export default Footer;
