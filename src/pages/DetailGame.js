import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isUserAuthenticated, validateVoucher } from "../api/client";
import { getGameIcon } from "../data/gameCatalog";
import { GAMES_CHANGE_EVENT, getStoredGames, refreshGames } from "../data/gameStore";
import { getLastTransaction } from "../data/lastTransactionStore";
import { showErrorAlert, showValidationAlert } from "../utils/authToast";

const GAME_DESCRIPTIONS = {
  ml: {
    title: "Mobile Legends: Bang Bang - Aksi MOBA di Ujung Jari Anda",
    intro:
      "Mobile Legends: Bang Bang (MLBB) adalah game multiplayer online battle arena (MOBA) yang dikembangkan oleh Moonton dan menjadi salah satu game mobile paling populer di dunia. Dirilis pada tahun 2016, game ini telah menarik jutaan pemain dari seluruh dunia dengan gameplay yang cepat, kompetitif, dan mudah diakses. Dalam game ini, dua tim yang terdiri dari lima pemain akan bertarung di arena untuk menghancurkan markas lawan dan mempertahankan markas mereka sendiri.",
    sectionTitle: "Cerita dan Dunia: Pahlawan dan Petualangan",
    sectionBody:
      "Mobile Legends: Bang Bang memiliki cerita yang melibatkan berbagai pahlawan dan karakter dari dunia fantasi yang luas. Setiap hero memiliki latar belakang dan kemampuan unik, mulai dari pejuang kuat seperti Aldous hingga penyihir cerdas seperti Lylia. Pemain akan memilih hero favorit mereka dan bertempur untuk mengalahkan tim lawan dengan taktik dan kerjasama tim yang cermat. Meskipun game ini lebih menonjolkan gameplay kompetitif, setiap hero memiliki cerita yang membawa pemain ke dalam dunia yang kaya akan konflik dan intrik antara berbagai faksi, mulai dari kerajaan magis hingga pasukan monster dan dewa-dewa mitologis."
  },
  ff: {
    title: "Free Fire - Battle Royale Mobile yang Seru dan Cepat",
    intro:
      "Free Fire adalah game battle royale mobile yang dikembangkan oleh Garena. Dirilis pada tahun 2017, game ini dengan cepat menjadi salah satu game paling populer di dunia, terutama di kalangan pemain mobile. Free Fire menawarkan pengalaman pertempuran battle royale yang seru, dengan pertandingan yang berlangsung cepat, kontrol yang mudah, dan grafis yang cukup menarik untuk perangkat mobile. Dalam Free Fire, 50 pemain terjun ke dalam sebuah pulau besar dan harus bertarung hingga hanya ada satu pemain atau tim yang tersisa. Pemain dapat memilih untuk bertempur sendirian atau berkelompok dalam tim untuk bertahan hidup, mengumpulkan senjata, dan menghindari zona yang semakin sempit.",
    sectionTitle: "Cerita dan Latar Belakang: Bertahan Hidup di Pulau Terpencil",
    sectionBody:
      "Meskipun Free Fire lebih berfokus pada gameplay battle royale, ada narasi singkat yang melatarbelakangi setiap pertandingan. Pemain berperan sebagai bagian dari pasukan yang terdampar di sebuah pulau terpencil dan harus bertahan hidup melawan pemain lainnya. Setiap pertandingan diatur dalam format last man standing, di mana pemain yang terakhir hidup akan keluar sebagai pemenang."
  },
  genshin: {
    title: "Genshin Impact - Petualangan Dunia Terbuka Penuh Aksi",
    intro:
      "Genshin Impact adalah permainan yang bergenre dunia terbuka sekaligus bermain peran aksi. Pada permainan ini, pemain memungkinkan untuk mengendalikan salah satu karakter yang dapat digantikan di dalam sebuah party. Karakter-karakter yang ditukarkan dapat dilakukan dengan cepat selama melakukan kombat sehingga memungkinkan pemain untuk menggunakan kombinasi kemampuan dan serangan yang berbeda. Karakter yang dapat dimainkan memiliki kemampuan yang bisa diperkuat dengan berbagai cara, seperti menaikkan level secara langsung serta memperkuat artefak dan senjata yang digunakan.",
    sectionTitle: "Eksplorasi Teyvat dan Sistem Adventure Rank",
    sectionBody:
      "Selain berpetualang, pemain dapat mencoba berbagai tantangan untuk mendapatkan hadiah. Pemain dapat melawan bos dan tantangan berhadiah di seluruh dunia Teyvat, tetapi hadiah tersebut didapatkan dengan menggunakan mata uang yang disebut Original Resin. Menyelesaikan tantangan-tantangan tersebut dapat meningkatkan Adventure Rank, yang akan membuka misi baru, tantangan, dan menaikkan Level Dunia. Level Dunia adalah ukuran mengenai seberapa kuat musuh-musuh di dunia dan seberapa besar hadiah langka yang bisa diperoleh setelah mengalahkannya."
  },
  pubg: {
    title: "PUBG: Battlegrounds - Bertahan Hidup Sampai Akhir",
    intro:
      "PUBG: Battlegrounds adalah game bergenre battle royale yang dikembangkan oleh PUBG Corporation, bagian dari Krafton, di mana hingga 100 pemain diterjunkan ke sebuah pulau untuk saling bertarung dan menjadi yang terakhir bertahan hidup. Pemain memulai tanpa perlengkapan dan harus mencari senjata, armor, serta item lainnya sambil menghindari zona berbahaya yang terus menyempit atau zona biru, sehingga memaksa pertemuan antar pemain.",
    sectionTitle: "Strategi, Mode Permainan, dan Chicken Dinner",
    sectionBody:
      "Game ini menawarkan berbagai mode seperti solo, duo, dan squad, serta menghadirkan gameplay yang realistis dengan strategi penting seperti looting, positioning, dan kerja sama tim. Dengan map yang beragam dan pengalaman bermain yang menegangkan, PUBG menjadi salah satu game populer yang dikenal dengan slogan kemenangannya, Winner Winner Chicken Dinner."
  },
  arena: {
    title: "Arena Breakout - Extraction Shooter Taktis yang Intens",
    intro:
      "Arena Breakout adalah game tembak-menembak taktis dengan konsep extraction shooter yang dikembangkan dan dipublikasikan oleh Level Infinite. Dalam permainan ini, pemain memasuki area pertempuran untuk mengumpulkan berbagai loot seperti senjata, perlengkapan medis, armor, dan item berharga lainnya, kemudian harus berhasil keluar dari area tersebut melalui titik ekstraksi agar semua barang yang didapat bisa disimpan.",
    sectionTitle: "Fokus pada Taktik, Loot, dan Risiko",
    sectionBody:
      "Berbeda dengan game battle royale pada umumnya, Arena Breakout menekankan pada strategi, kehati-hatian, serta manajemen inventaris, karena jika pemain kalah atau gugur, seluruh perlengkapan yang dibawa berisiko hilang. Selain itu, game ini memiliki sistem senjata yang realistis dengan banyak modifikasi, mekanik pertempuran yang detail, serta suasana permainan yang intens dan menegangkan. Pemain dituntut untuk bermain secara taktis, mengatur perlengkapan dengan bijak, serta mampu mengambil keputusan cepat dalam situasi berbahaya agar bisa bertahan hidup dan mendapatkan keuntungan maksimal dari setiap misi."
  },
  valorant: {
    title: "Valorant - Tembak-Menembak Taktis 5v5 Berbasis Agent",
    intro:
      "Valorant adalah game tembak-menembak taktis berbasis tim 5v5 yang dikembangkan oleh Riot Games. Dalam permainan ini, dua tim akan bertanding sebagai penyerang dan bertahan dengan tujuan utama menanam atau menjinakkan Spike. Setiap pemain memilih karakter yang disebut Agent, di mana setiap Agent memiliki kemampuan unik seperti mengeluarkan asap, menyembuhkan, mendeteksi musuh, atau memberikan serangan khusus untuk mendukung strategi tim.",
    sectionTitle: "Akurasi, Ekonomi, dan Kerja Sama Tim",
    sectionBody:
      "Selain kemampuan karakter, Valorant juga sangat menekankan pada akurasi menembak, penguasaan map, serta kerja sama tim yang solid. Pemain harus mampu mengatur ekonomi dalam game untuk membeli senjata dan perlengkapan di setiap ronde, sehingga strategi tidak hanya ditentukan oleh kemampuan bertarung, tetapi juga pengelolaan sumber daya. Dengan berbagai map yang memiliki desain berbeda serta gameplay yang kompetitif, Valorant menjadi salah satu game esports populer yang menggabungkan strategi, kecepatan berpikir, dan keterampilan individu dalam satu permainan yang menegangkan."
  }
};

function DetailGame() {
  const { id } = useParams();
  const navigate = useNavigate();


  const [selected, setSelected] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVoucher, setCustomerVoucher] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherFeedback, setVoucherFeedback] = useState({ type: "", message: "" });
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
  const [mlServer, setMlServer] = useState('');
  const [server, setServer] = useState('');
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(() => isUserAuthenticated());
  const [gamesData, setGamesData] = useState(() => getStoredGames());

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

  useEffect(() => {
    const syncLastTransaction = () => {
      setLastTransaction(getLastTransaction(id));
    };

    syncLastTransaction();
    window.addEventListener("storage", syncLastTransaction);

    return () => {
      window.removeEventListener("storage", syncLastTransaction);
    };
  }, [id]);

  useEffect(() => {
    const syncUserAuthState = () => {
      if (!isUserAuthenticated()) setIsUserLoggedIn(false);
      setIsUserLoggedIn(isUserAuthenticated());
    };

    syncUserAuthState();
    window.addEventListener("authchange", syncUserAuthState);
    window.addEventListener("storage", syncUserAuthState);

    return () => {
      window.removeEventListener("authchange", syncUserAuthState);
      window.removeEventListener("storage", syncUserAuthState);
    };
  }, []);

  const game = gamesData[id];
  if (!game) return <h2>Game tidak ditemukan</h2>;

  const needsServerField = id === "ml" || id === "genshin";
  const basePrice = selected !== null ? game.items[selected].price : 0;
  const discountAmount = appliedVoucher?.discountAmount || 0;
  const totalPrice = appliedVoucher?.finalPrice ?? basePrice;
  const gameDescription = GAME_DESCRIPTIONS[id] || null;
  const lastTransactionTime = lastTransaction?.updatedAt
    ? new Date(lastTransaction.updatedAt).toLocaleString("id-ID")
    : "";

  const resetVoucherState = () => {
    setAppliedVoucher(null);
    setVoucherFeedback({ type: "", message: "" });
  };

  const normalizedPhone = customerPhone.replace(/\D/g, "");

  const isValidCustomerId = () => customerId.trim().length >= 4;
  const isValidPhoneNumber = () => {
    if (!/^[0-9+\-\s]+$/.test(customerPhone.trim())) {
      return false;
    }

    return normalizedPhone.length >= 10 && normalizedPhone.length <= 15;
  };

  const isValidMlServer = () => /^\d{2,10}$/.test(mlServer.trim());

  const applyLastTransaction = () => {
    if (!isUserLoggedIn || !lastTransaction) {
      return;
    }

    setCustomerId(lastTransaction.customerId || "");
    setCustomerPhone(lastTransaction.customerPhone || "");
    setSelectedPayment(lastTransaction.paymentMethod || "");
    setMlServer(id === "ml" ? lastTransaction.mlServer || "" : "");
    setServer(id === "genshin" ? lastTransaction.server || "" : "");
    setCustomerVoucher("");
    resetVoucherState();
  };

  const maskValue = (value) => {
    const normalizedValue = (value || "").trim();
    if (normalizedValue.length <= 4) {
      return normalizedValue || "-";
    }

    return `${normalizedValue.slice(0, 2)}***${normalizedValue.slice(-2)}`;
  };

  const handleApplyVoucher = async () => {
    if (selected === null) {
      showValidationAlert("Top up belum dipilih", "Pilih top up terlebih dahulu sebelum memakai voucher.");
      return;
    }

    const voucherCode = customerVoucher.trim();
    if (!voucherCode) {
      showValidationAlert("Voucher belum diisi", "Masukkan kode voucher terlebih dahulu.");
      return;
    }

    try {
      setIsCheckingVoucher(true);
      const voucherResult = await validateVoucher({
        code: voucherCode,
        gameId: id,
        price: basePrice
      });

      setAppliedVoucher(voucherResult);
      setCustomerVoucher(voucherResult.code);
      setVoucherFeedback({
        type: "success",
        message: `${voucherResult.message} Potongan ${voucherResult.discountAmount.toLocaleString("id-ID")}.`
      });
    } catch (error) {
      setAppliedVoucher(null);
      setVoucherFeedback({
        type: "error",
        message: error.message || "Voucher gagal dipakai."
      });
      showErrorAlert("Voucher tidak valid", error.message || "Voucher gagal dipakai.");
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  const handlePay = () => {
    if (selected === null) {
      showValidationAlert("Top up belum dipilih", "Silahkan Pilih top up terlebih dahulu.");
      return;
    }
    if (!customerId.trim()) {
      showValidationAlert("ID game belum diisi", "Silahkan Masukkan ID game terlebih dahulu.");
      return;
    }
    if (!isValidCustomerId()) {
      showValidationAlert("ID game tidak sesuai", "ID game minimal 4 karakter.");
      return;
    }
    if (id === 'ml' && !mlServer.trim()) {
      showValidationAlert("Server ID belum diisi", "Silahkan Masukkan Server ID terlebih dahulu.");
      return;
    }
    if (id === 'ml' && !isValidMlServer()) {
      showValidationAlert("Server ID tidak sesuai", "Server ID harus berupa angka 2 sampai 10 digit.");
      return;
    }
    if (id === 'genshin' && !server) {
      showValidationAlert("Server belum dipilih", "Silahkan Pilih server terlebih dahulu.");
      return;
    }
    if (!customerPhone.trim()) {
      showValidationAlert("Nomor HP belum diisi", "Silahkan Masukkan nomor HP terlebih dahulu.");
      return;
    }
    if (!isValidPhoneNumber()) {
      showValidationAlert("Nomor HP tidak sesuai", "Silahkan Masukkan nomor HP yang valid, sekitar 10 sampai 15 digit.");
      return;
    }
    if (!selectedPayment) {
      showValidationAlert("Metode pembayaran belum dipilih", "Silahkan Pilih metode pembayaran terlebih dahulu.");
      return;
    }
    if (customerVoucher.trim() && !appliedVoucher) {
      showValidationAlert("Voucher belum diverifikasi", "Klik cek voucher terlebih dahulu agar kode voucher tervalidasi.");
      return;
    }
    navigate('/payment', {
      state: {
        gameId: id,
        itemId: game.items[selected].id || null,
        itemIndex: selected,
        itemName: game.items[selected].name,
        paymentMethod: selectedPayment,
        price: totalPrice,
        originalPrice: basePrice,
        discountAmount,
        appliedVoucher,
        customerId,
        customerPhone,
        customerVoucher: appliedVoucher?.code || '',
        mlServer,
        server
      }
    });
  };

  const getLogoSrc = (gameId) => {
    const logos = {
      valorant: '/assets/VP.webp',
      ml: '/assets/MLDM.png',
      ff: '/assets/MLDM.png',
      genshin: '/assets/Crystals.png',
      pubg: '/assets/UC.png',
      arena: '/assets/BONDS.webp'
    };
    return logos[gameId] || null;
  };

  const sectionBoxStyle = {
    background: "#1a233f",
    borderRadius: "10px",
    padding: "15px",
    margin: "10px 0",
    border: "1px solid #3a4060",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
  };

  const stepNumberStyle = {
    background: "#4CAF50",
    color: "white",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    marginRight: "10px",
    flexShrink: 0
  };

  const stepHeaderStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    color: "white"
  };

  const h4Style = {
    margin: "0 0 15px 0",
    color: "white"
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#2a3550",
    color: "white",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  const labelStyle = {
    color: "#a0a8c0",
    fontSize: "12px",
    marginBottom: "8px",
    display: "block"
  };

  const paymentButtonStyle = (isActive) => ({
    padding: "10px 15px",
    background: isActive ? "#4CAF50" : "#2a3550",
    border: "1px solid " + (isActive ? "#45a049" : "#3a4060"),
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    flex: 1,
    minWidth: "70px",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  });

  const priceStyle = {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#4CAF50"
  };

  const methodStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    color: "white"
  };

  const styles = {
    container: {
      background: "transparent",
      minHeight: "100vh",
      padding: "20px",
      color: "white"
    },
    banner: {
      height: "300px",
      padding: "20px 0",
      borderRadius: "10px",
      position: "relative",
      overflow: "hidden"
    },
    box: {
      background: "#1e2a55",
      padding: "20px",
      borderRadius: "10px",
      marginTop: "20px"
    },
    lastTransactionCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
      background: "#24335d",
      border: "1px solid #3a4b80",
      borderRadius: "12px",
      padding: "14px 16px",
      marginBottom: "14px"
    },
    lastTransactionTitle: {
      fontWeight: "700",
      color: "#ffffff",
      marginBottom: "6px"
    },
    lastTransactionMeta: {
      color: "#d7def5",
      fontSize: "13px",
      lineHeight: 1.5
    },
    lastTransactionHint: {
      color: "#a0a8c0",
      fontSize: "12px",
      marginTop: "6px"
    },
    lastTransactionButton: {
      border: "none",
      borderRadius: "10px",
      background: "#4CAF50",
      color: "#ffffff",
      padding: "12px 16px",
      fontWeight: "700",
      cursor: "pointer",
      whiteSpace: "nowrap"
    },
    gameDescriptionCard: {
      margin: "24px 0 0 0",
      width: "100%",
      boxSizing: "border-box",
      padding: "16px",
      borderRadius: "12px",
      background: "#24335d",
      border: "1px solid #3a4b80",
      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.22)"
    },
    gameDescriptionTitle: {
      margin: "0 0 10px 0",
      color: "#ffffff",
      fontSize: "18px"
    },
    gameDescriptionSectionTitle: {
      margin: "14px 0 8px 0",
      color: "#9df5a1",
      fontSize: "15px"
    },
    gameDescriptionText: {
      margin: 0,
      color: "#d7def5",
      lineHeight: 1.7,
      fontSize: "14px"
    },
    idServerRow: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap"
    },
    inputHalf: {
      flex: "1 1 220px",
      padding: "12px 16px",
      margin: "0",
      borderRadius: "10px",
      border: "none",
      background: "#2a3550",
      color: "white",
      fontSize: "14px",
      boxSizing: "border-box"
    },
    inputFull: {
      width: "100%",
      padding: "12px 16px",
      margin: "0",
      borderRadius: "10px",
      border: "none",
      background: "#2a3550",
      color: "white",
      fontSize: "14px",
      boxSizing: "border-box"
    },
    selectInputFull: {
      width: "100%",
      padding: "12px 16px",
      margin: "0",
      borderRadius: "10px",
      border: "1px solid #444",
      background: "#2a3550",
      color: "white",
      fontSize: "14px"
    },
    selectInputHalf: {
      flex: "1 1 220px",
      padding: "12px 16px",
      margin: "0",
      borderRadius: "10px",
      border: "1px solid #444",
      background: "#2a3550",
      color: "white",
      fontSize: "14px"
    },
    grid: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap"
    },
    card: {
      padding: "15px 12px",
      borderRadius: "12px",
      cursor: "pointer",
      width: "160px",
      textAlign: "center",
      minHeight: "80px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
    },
    payment: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap"
    },
    btn: {
      padding: "12px 24px",
      background: "#4CAF50",
      border: "none",
      borderRadius: "10px",
      color: "white",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "pointer",
      marginLeft: 'auto',
      whiteSpace: "nowrap"
    }
  };

  return (
    <div className="detail-page" style={styles.container}>
      <div className="detail-hero" style={styles.banner}>
        <div className="detail-hero__content" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${game.banner})`,
          backgroundSize: 'cover',
          backgroundPosition: id === 'valorant' ? 'center 25%' : id === 'ff' ? 'center 52%' : id === 'genshin' ? 'center 5%' : id === 'pubg' ? 'center 10%' : id === 'arena' ? 'center 60%' : 'center 10%',
          backgroundRepeat: 'no-repeat',
          opacity: 1,
          zIndex: 1,
          width: '100%',
          height: '100%'
        }} />
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          zIndex: 3
        }}>
          <img 
            src={game.icon || getGameIcon(id)}
            alt="" 
            className="detail-hero__icon"
            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px' }} 
          />
          <div>
            <h1 className="detail-hero__title" style={{ color: 'white', fontSize: '2.2rem', margin: '0 0 5px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{game.name}</h1>
            <p className="detail-hero__meta" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '1.1rem', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              {game.category} - {game.dev}
            </p>
          </div>
        </div>
      </div>

      <div className="detail-box" style={styles.box}>
        <div
          style={{
            ...sectionBoxStyle,
            transform: hoveredSection === "id" ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hoveredSection === "id" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
          }}
          onMouseEnter={() => setHoveredSection("id")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div style={stepHeaderStyle}>
            <div style={stepNumberStyle}>1</div>
            <h4 style={h4Style}>Masukkan ID</h4>
          </div>
          {isUserLoggedIn && lastTransaction && (
            <div style={styles.lastTransactionCard}>
              <div>
                <div style={styles.lastTransactionTitle}>Data transaksi terakhir tersimpan</div>
                <div style={styles.lastTransactionMeta}>
                  ID {maskValue(lastTransaction.customerId)} | HP {maskValue(lastTransaction.customerPhone)}
                </div>
                <div style={styles.lastTransactionMeta}>
                  Pembayaran {lastTransaction.paymentMethod || "-"}
                  {needsServerField
                    ? ` | Server ${maskValue(id === "ml" ? lastTransaction.mlServer : lastTransaction.server)}`
                    : ""}
                </div>
                <div style={styles.lastTransactionHint}>
                  Disimpan pada {lastTransactionTime}. Data ini tidak diisi otomatis.
                </div>
              </div>
              <button style={styles.lastTransactionButton} onClick={applyLastTransaction}>
                Gunakan Data Terakhir
              </button>
            </div>
          )}
          <div style={{ width: '100%' }}>
            {needsServerField ? (
              <div style={styles.idServerRow}>
                <input placeholder={id === 'ml' ? "Player ID" : "ID"} style={styles.inputHalf} value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
                {id === 'ml' ? (
                  <input placeholder="Server ID" style={styles.inputHalf} value={mlServer} onChange={(e) => setMlServer(e.target.value)} />
                ) : (
                  <select style={styles.selectInputHalf} value={server} onChange={(e) => setServer(e.target.value)}>
                    <option value="">Pilih Server</option>
                    <option value="america">Amerika</option>
                    <option value="asia">Asia</option>
                    <option value="europa">Eropa</option>
                    <option value="tw_hk_mo">TW/HK/MO</option>
                  </select>
                )}
              </div>
            ) : (
              <input placeholder="ID/Player ID" style={styles.inputFull} value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
            )}
          </div>
        </div>

        <div
          style={{
            ...sectionBoxStyle,
            transform: hoveredSection === "topup" ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hoveredSection === "topup" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
          }}
          onMouseEnter={() => setHoveredSection("topup")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div style={stepHeaderStyle}>
            <div style={stepNumberStyle}>2</div>
            <h4 style={h4Style}>Pilih Top Up</h4>
          </div>
          <div className="topup-grid" style={styles.grid}>
            {game.items.map((item, i) => (
              <div
                key={i}
                className="topup-card"
                style={{
                  ...styles.card,
                  background: selected === i ? "#4CAF50" : "#2a3550",
                  color: "white",
                  border: selected === i ? "1px solid #45a049" : "1px solid #3a4060",
                  transform: hoveredCard === i ? "translateY(-4px)" : "translateY(0)",
                  boxShadow:
                    hoveredCard === i
                      ? selected === i
                        ? "0 0 24px rgba(76, 175, 80, 0.75)"
                        : "0 0 22px rgba(111, 155, 255, 0.45)"
                      : selected === i
                        ? "0 0 16px rgba(76, 175, 80, 0.35)"
                        : "none"
                }}
                onClick={() => {
                  setSelected(i);
                  resetVoucherState();
                }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {getLogoSrc(id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '4px' }}>
                    <img src={getLogoSrc(id)} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', marginRight: '8px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '500', lineHeight: 1.3 }}>{item.name}</span>
                  </div>
                ) : (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>{item.name}</p>
                )}
                <b style={{ fontSize: '14px', display: 'block', lineHeight: 1.2 }}>Rp {item.price.toLocaleString()}</b>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            ...sectionBoxStyle,
            transform: hoveredSection === "payment" ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hoveredSection === "payment" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
          }}
          onMouseEnter={() => setHoveredSection("payment")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div style={stepHeaderStyle}>
            <div style={stepNumberStyle}>3</div>
            <h4 style={h4Style}>Pilih Pembayaran</h4>
          </div>
          <div className="payment-method-grid" style={styles.payment}>
            {['DANA', 'GOPAY', 'OVO', 'QRIS'].map(method => (
              <button
                key={method}
                style={{
                  ...paymentButtonStyle(selectedPayment === method),
                  boxShadow: selectedPayment === method ? "0 0 18px rgba(76, 175, 80, 0.45)" : "0 0 18px rgba(111, 155, 255, 0)"
                }}
                onClick={() => setSelectedPayment(method)}
                onMouseEnter={(e) => {
                  if (selectedPayment !== method) {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(111, 155, 255, 0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPayment !== method) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 0 18px rgba(111, 155, 255, 0)";
                  }
                }}
              >
                <img 
                  src={method === 'DANA' ? '/assets/Dana_logo.png' : method === 'GOPAY' ? '/assets/Gopay_logo.png' : method === 'OVO' ? '/assets/ovo_logo.png' : '/assets/qris_logo.png'} 
                  alt={method}
                  style={{ width: '70px', height: '24px' }} 
                />
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            ...sectionBoxStyle,
            transform: hoveredSection === "voucher" ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hoveredSection === "voucher" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
          }}
          onMouseEnter={() => setHoveredSection("voucher")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div style={stepHeaderStyle}>
            <div style={stepNumberStyle}>4</div>
            <label style={labelStyle}>Kode Voucher (Opsional)</label>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              style={{ ...inputStyle, flex: "1 1 280px" }}
              placeholder="Masukkan kode voucher (kosongkan jika tidak ada)"
              value={customerVoucher}
              onChange={(e) => {
                setCustomerVoucher(e.target.value);
                resetVoucherState();
              }}
            />
            <button
              type="button"
              style={{
                ...paymentButtonStyle(Boolean(appliedVoucher)),
                flex: "0 0 auto",
                minWidth: "140px"
              }}
              onClick={handleApplyVoucher}
              disabled={isCheckingVoucher}
            >
              {isCheckingVoucher ? "Memeriksa..." : appliedVoucher ? "Voucher Aktif" : "Cek Voucher"}
            </button>
          </div>
          {voucherFeedback.message && (
            <p
              style={{
                margin: "12px 0 0 0",
                color: voucherFeedback.type === "success" ? "#8ef7a0" : "#ff9f97",
                fontSize: "13px"
              }}
            >
              {voucherFeedback.message}
            </p>
          )}
          {appliedVoucher && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "10px",
                background: "rgba(76, 175, 80, 0.12)",
                border: "1px solid rgba(76, 175, 80, 0.35)"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{appliedVoucher.voucher.title}</div>
              <div style={{ color: "#d7def5", fontSize: "13px" }}>
                Kode {appliedVoucher.code} memberi potongan Rp {appliedVoucher.discountAmount.toLocaleString("id-ID")}.
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            ...sectionBoxStyle,
            transform: hoveredSection === "phone" ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hoveredSection === "phone" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
          }}
          onMouseEnter={() => setHoveredSection("phone")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div style={stepHeaderStyle}>
            <div style={stepNumberStyle}>5</div>
            <label style={labelStyle}>Nomor HP (Wajib)</label>
          </div>
          <input style={inputStyle} placeholder="08xxxxxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>

        <div
          style={{
            ...sectionBoxStyle,
            transform: hoveredSection === "checkout" ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hoveredSection === "checkout" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
          }}
          onMouseEnter={() => setHoveredSection("checkout")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div style={stepHeaderStyle}>
            <div style={stepNumberStyle}>6</div>
            <h4 style={h4Style}>Lengkapi Pembayaran</h4>
          </div>
          <div className="checkout-row" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              {discountAmount > 0 && (
                <>
                  <span style={{ color: "#a0a8c0", fontSize: "14px" }}>
                    Harga awal: Rp {basePrice.toLocaleString()}
                  </span>
                  <span style={{ color: "#8ef7a0", fontSize: "14px", fontWeight: "bold" }}>
                    Diskon voucher: -Rp {discountAmount.toLocaleString()}
                  </span>
                </>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={priceStyle}>Rp {totalPrice.toLocaleString()}</span>
                <span style={methodStyle}>{selectedPayment || 'Pilih metode'}</span>
              </div>
            </div>
            <button style={styles.btn} onClick={handlePay}>
              Bayar Sekarang
            </button>
          </div>
        </div>

      </div>

      {gameDescription && (
        <div style={styles.gameDescriptionCard}>
          <h5 style={styles.gameDescriptionTitle}>{gameDescription.title}</h5>
          <p style={styles.gameDescriptionText}>{gameDescription.intro}</p>
          {gameDescription.sectionTitle && (
            <h6 style={styles.gameDescriptionSectionTitle}>{gameDescription.sectionTitle}</h6>
          )}
          {gameDescription.sectionBody && (
            <p style={styles.gameDescriptionText}>{gameDescription.sectionBody}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DetailGame;
