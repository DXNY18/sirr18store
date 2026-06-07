import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  clearAdminSession,
  clearUserSession, loginUser, registerUser, storeUserSession,
  fetchUserOrders,
  getUserProfile,
  isAdminAuthenticated,
  isUserAuthenticated
} from "../api/client";
import { confirmAdminLogoutAlert, confirmUserLogoutAlert, showErrorAlert, showValidationAlert, showUserLoginSuccessToast, showUserRegisterSuccessToast } from "../utils/authToast";
import { GAMES_CHANGE_EVENT, getStoredGames, refreshGames } from "../data/gameStore";
import { buildGameCatalog, getPlatformLabel } from "../data/gameCatalog";

function Navbar() {
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // const [adminProfile, setAdminProfile] = useState(null);
  const [isUser, setIsUser] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [isSubmittingUserLogin, setIsSubmittingUserLogin] = useState(false);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [gamesData, setGamesData] = useState(() => getStoredGames());
  const navigate = useNavigate();
  const location = useLocation();
  const searchWrapperRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Tentukan area navigasi
  const isAdminPath = location.pathname.startsWith("/admin") || 
                      location.pathname.startsWith("/admin-login");

  const isRestrictedPath = isAdminPath || location.pathname.startsWith("/payment");

  const gameCatalog = useMemo(() => buildGameCatalog(gamesData), [gamesData]);
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = useMemo(
    () =>
      normalizedSearch
        ? gameCatalog
            .filter((game) => game.name.toLowerCase().includes(normalizedSearch))
            .sort((firstGame, secondGame) => firstGame.name.localeCompare(secondGame.name, "id-ID"))
        : [],
    [gameCatalog, normalizedSearch]
  );

  useEffect(() => {
    const syncAuthState = () => {
      setIsAdmin(isAdminAuthenticated());
      // setAdminProfile(getAdminProfile()); // Panggilan ke setter dihapus
      setIsUser(isUserAuthenticated());
      setUserProfile(getUserProfile());
    };

    syncAuthState();
    window.addEventListener("authchange", syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener("authchange", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

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
    if (location.pathname !== "/") {
      return;
    }

    setSearch(new URLSearchParams(location.search).get("q") || "");
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = search.trim();

    if (!keyword) {
      setIsSearchOpen(false);
      navigate("/");
      return;
    }

    setIsSearchOpen(true);
    navigate(`/?q=${encodeURIComponent(keyword)}`);
  };

  const handleSearchInputChange = (e) => {
    const nextValue = e.target.value;
    setSearch(nextValue);
    setIsSearchOpen(Boolean(nextValue.trim()));

    if (nextValue.trim() === "") {
      setIsSearchOpen(false);
    }
  };

  const handleSelectGame = (game) => {
    setSearch(game.name);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    navigate(`/game/${game.id}`);
  };

  const handleUserLogout = async () => {
    const isConfirmed = await confirmUserLogoutAlert();
    if (!isConfirmed) {
      return;
    }

    if (isUser) {
      clearUserSession();
      setUserProfile(null);
    }
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  const handleAdminLogout = async () => {
    const isConfirmed = await confirmAdminLogoutAlert();
    if (!isConfirmed) {
      return;
    }

    if (isAdmin) {
      clearAdminSession();
      // setAdminProfile(null); // Panggilan ke setter dihapus
    }
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  useEffect(() => {
    if (!isUser || !isOrdersOpen) {
      return undefined;
    }

    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoadingOrders(true);
        const orders = await fetchUserOrders();
        if (isMounted) {
          setUserOrders(orders);
        }
      } catch (error) {
        if (isMounted) {
          showErrorAlert("Gagal memuat pesanan user.", error.message || "Gagal memuat pesanan user.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingOrders(false);
        }
      }
    };

    loadOrders();
    const intervalId = window.setInterval(loadOrders, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isOrdersOpen, isUser]);

  const resetUserForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterEmail("");
    setRegisterUsername("");
    setRegisterPassword("");
  };

  const openUserModal = (tab) => {
    setActiveTab(tab);
    setIsUserModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      showValidationAlert("Input diperlukan", "Email dan password wajib diisi.");
      return;
    }

    try {
      setIsSubmittingUserLogin(true);
      const session = await loginUser(loginEmail.trim(), loginPassword);
      storeUserSession(session);
      setIsUser(true);
      setUserProfile(session.user);
      resetUserForms();
      closeUserModal();
      showUserLoginSuccessToast();
    } catch (error) {
      showErrorAlert("Login gagal", error.message || "Login user gagal.");
    } finally {
      setIsSubmittingUserLogin(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerEmail.trim() || !registerUsername.trim() || !registerPassword.trim()) {
      showValidationAlert("Input diperlukan", "Email, username, dan password wajib diisi.");
      return;
    }

    try {
      setIsSubmittingRegister(true);
      const session = await registerUser(
        registerUsername.trim(),
        registerEmail.trim(),
        registerPassword
      );
      storeUserSession(session);
      setIsUser(true);
      setUserProfile(session.user);
      resetUserForms();
      closeUserModal();
      showUserRegisterSuccessToast();
    } catch (error) {
      showErrorAlert("Registrasi gagal", error.message || "Registrasi user gagal.");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const getStatusLabel = (status) => {
    if (status === "completed") {
      return "Sudah Diverifikasi";
    }

    if (status === "rejected") {
      return "Ditolak Admin";
    }

    return "Menunggu Verifikasi";
  };

  const getStatusStyle = (status) => {
    if (status === "completed") {
      return styles.orderStatusSuccess;
    }

    if (status === "rejected") {
      return styles.orderStatusDanger;
    }

    return styles.orderStatusWarning;
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  };

  const modalContentStyle = {
    background: "#1e1e1e",
    padding: "30px",
    borderRadius: "10px",
    width: "90%",
    maxWidth: "400px",
    position: "relative",
    color: "white"
  };

  const tabsStyle = {
    display: "flex",
    marginBottom: "20px",
    borderBottom: "1px solid #444"
  };

  const tabStyle = {
    flex: 1,
    padding: "12px",
    background: "transparent",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "16px"
  };

  const activeTabStyle = {
    flex: 1,
    padding: "12px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "16px"
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  };

  const inputStyle = {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#2a3550",
    color: "white",
    fontSize: "14px"
  };

  const submitStyle = {
    padding: "12px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold"
  };

  const closeStyle = {
    position: "absolute",
    top: "10px",
    right: "15px",
    background: "none",
    border: "none",
    color: "white",
    fontSize: "24px",
    cursor: "pointer"
  };

  return (
    <div className="site-navbar" style={styles.nav}>
      <div className="site-navbar__left" style={styles.left}>
        <img src="/assets/logo.png" alt="sirr18 store" style={styles.logo} />
        {isUser && !isAdminPath && (
          <Link to="/" style={{ textDecoration: "none" }}>
            <button style={styles.homeBtn}>Beranda</button>
          </Link>
        )}
      </div>

      <div className="site-navbar__right" style={styles.right}>
        {!isRestrictedPath && (
          <div
          className="site-navbar__search"
          style={styles.searchWrapper}
          ref={searchWrapperRef}
        >
          <form id="site-search-form" className="site-navbar__search-form" onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="search"
              placeholder="Cari game..."
              value={search}
              onChange={handleSearchInputChange}
              onFocus={() => setIsSearchOpen(Boolean(search.trim()))}
              style={styles.searchInput}
            />
            <button className="site-navbar__search-button" type="submit" style={styles.searchBtn} aria-label="Cari game">
              Cari
            </button>
          </form>

          {isSearchOpen && normalizedSearch && (
            <div className="site-navbar__search-dropdown" style={styles.searchDropdown}>
              {searchResults.length ? (
                searchResults.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectGame(game)}
                    style={styles.searchResultButton}
                  >
                    <img src={game.icon} alt={game.name} style={styles.searchResultIcon} />
                    <div style={styles.searchResultContent}>
                      <span style={styles.searchResultName}>{game.name}</span>
                      <span style={styles.searchResultMeta}>{getPlatformLabel(game.platform)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div style={styles.searchEmpty}>Game tidak ditemukan.</div>
              )}
            </div>
          )}
          </div>
        )}

        <div className="desktop-auth-actions">
          {isAdminPath ? (
            isAdmin && (
              <>
              <Link to="/admin" style={{ textDecoration: "none" }}>
                <button style={styles.btn}>Admin Panel</button>
              </Link>
              <button style={styles.btnDanger} onClick={handleAdminLogout}>
                Logout Admin
              </button>
            </>
            )
          ) : !isUser ? (
            <button style={styles.btn} onClick={() => openUserModal("login")}>Masuk / Daftar</button>
          ) : (
            <>
              <div style={{ color: "white", fontSize: "14px", marginRight: "5px" }}>
                Halo, {userProfile?.username || "User"}
              </div>
              <button style={styles.btn} onClick={() => setIsOrdersOpen(true)}>
                Pesanan Saya
              </button>
              <button style={styles.btnSecondary} onClick={handleUserLogout}>
                Logout
              </button>
            </>
          )}
        </div>

        <div className="mobile-account-menu" ref={mobileMenuRef}>
          <button
            type="button"
            className="mobile-menu-button"
            style={styles.btnSecondary}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-account-panel"
            aria-label="Buka menu akun"
          >
            <span className="mobile-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {isMobileMenuOpen && (
            <div id="mobile-account-panel" className="mobile-account-panel">
              {isAdminPath ? (
                isAdmin && (
                  <>
                  <Link
                    to="/admin"
                    className="mobile-account-panel__link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                  <button
                    type="button"
                    className="mobile-account-panel__button mobile-account-panel__button--danger" // Adjusted class name
                    onClick={handleAdminLogout}
                  >
                    Logout Admin
                  </button>
                  </>
                )
              ) : !isUser ? ( // If not admin path and not user
                  <>
                  <div className="mobile-account-panel__info">
                    <span className="mobile-account-panel__label">Akun</span>
                    <strong>Belum masuk</strong>
                  </div>
                  <button type="button" className="mobile-account-panel__button" onClick={() => openUserModal("login")}>Masuk</button>
                  <button type="button" className="mobile-account-panel__button mobile-account-panel__button--secondary" onClick={() => openUserModal("register")}>Daftar</button>
                </>
              ) : (
                <>
                  <div className="mobile-account-panel__info">
                    <strong style={{ display: 'block', fontSize: '16px' }}>Halo, {userProfile?.username || "User"}</strong>
                    <span style={{ fontSize: '12px', color: '#aab7e4' }}>{userProfile?.email || "Akun aktif"}</span>
                  </div>
                  <button
                    type="button"
                    className="mobile-account-panel__button"
                    onClick={() => {
                      setIsOrdersOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Pesanan Saya
                  </button>
                  <button
                    type="button"
                    className="mobile-account-panel__button mobile-account-panel__button--secondary"
                    onClick={handleUserLogout}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {isOrdersOpen && (
          <div className="app-modal" style={modalStyle}>
            <div className="app-modal__content app-modal__content--wide" style={{ ...modalContentStyle, maxWidth: "700px" }}>
              <div className="orders-modal__header" style={styles.ordersHeader}>
                <div>
                  <h3 style={styles.ordersTitle}>Pesanan Saya</h3>
                  <p style={styles.ordersSubtitle}>
                    Status pesanan akan berubah di sini setelah admin melakukan verifikasi.
                  </p>
                </div>
                <button style={styles.closeStyleInline} onClick={() => setIsOrdersOpen(false)}>
                  Tutup
                </button>
              </div>

              {isLoadingOrders && (
                <div style={styles.orderEmptyState}>Memuat pesanan...</div>
              )}

              {!isLoadingOrders && !userOrders.length && (
                <div style={styles.orderEmptyState}>Belum ada pesanan yang terhubung ke akun ini.</div>
              )}

              {!isLoadingOrders && userOrders.length > 0 && (
                <div style={styles.ordersList}>
                  {userOrders.map((order) => (
                    <div key={order.id} style={styles.orderCard}>
                      <div style={styles.orderCardTop}>
                        <strong>{order.game}</strong>
                        <span style={{ ...styles.orderStatus, ...getStatusStyle(order.status) }}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div style={styles.orderMeta}>ID Pesanan: {order.id}</div>
                      <div style={styles.orderMeta}>Item: {order.item}</div>
                      <div style={styles.orderMeta}>Metode: {order.paymentMethod}</div>
                      {Number(order.discountAmount || 0) > 0 ? (
                        <>
                          <div style={styles.orderMeta}>
                            Harga awal: Rp {Number(order.originalPrice || 0).toLocaleString()}
                          </div>
                          <div style={styles.orderMeta}>
                            Voucher {order.customerVoucher}: -Rp {Number(order.discountAmount || 0).toLocaleString()}
                          </div>
                        </>
                      ) : null}
                      <div style={styles.orderMeta}>Total: Rp {Number(order.price || 0).toLocaleString()}</div>
                      {order.status === "rejected" && order.rejectionReason ? (
                        <div style={styles.orderReason}>
                          Alasan ditolak: {order.rejectionReason}
                        </div>
                      ) : null}
                      <div style={styles.orderMeta}>
                        Dibuat: {order.createdAt ? new Date(order.createdAt).toLocaleString("id-ID") : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isUserModalOpen && (
          <div className="app-modal" style={modalStyle}>
            <div className="app-modal__content" style={modalContentStyle}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>
                    {activeTab === "login" ? "Masuk User" : "Daftar User"}
                  </h3>
                  <p style={styles.modalSubtitle}>
                    Akses akun untuk melacak pesanan dan status verifikasi.
                  </p>
                </div>
              </div>
              <div style={tabsStyle}>
                <button style={activeTab === "login" ? activeTabStyle : tabStyle} onClick={() => setActiveTab("login")}>
                  Masuk
                </button>
                <button style={activeTab === "register" ? activeTabStyle : tabStyle} onClick={() => setActiveTab("register")}>
                  Daftar
                </button>
              </div>
              {activeTab === "login" ? (
                <div style={formStyle}>
                  <input style={inputStyle} placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  <input style={inputStyle} type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  <button style={submitStyle} onClick={handleLogin} disabled={isSubmittingUserLogin}>
                    {isSubmittingUserLogin ? "Memproses..." : "Masuk"}
                  </button>
                </div>
              ) : activeTab === "register" ? (
                <div style={formStyle}>
                  <input style={inputStyle} placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
                  <input style={inputStyle} placeholder="Username" value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} />
                  <input style={inputStyle} type="password" placeholder="Password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
                  <button style={submitStyle} onClick={handleRegister} disabled={isSubmittingRegister}>
                    {isSubmittingRegister ? "Memproses..." : "Daftar"}
                  </button>
                </div>
              ) : null}
              <button style={closeStyle} onClick={closeUserModal} aria-label="Tutup modal">
                x
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 30px",
    background: "#111"
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  userBadge: {
    padding: "8px 14px",
    borderRadius: "20px",
    background: "#1f2747",
    color: "white",
    border: "1px solid #3a4060",
    fontSize: "14px"
  },
  adminBadge: {
    padding: "8px 14px",
    borderRadius: "20px",
    background: "#3b1f1f",
    color: "#ffd6d6",
    border: "1px solid #8b3a3a",
    fontSize: "14px"
  },
  modalHeader: {
    marginBottom: "18px"
  },
  modalTitle: {
    margin: 0,
    fontSize: "22px"
  },
  modalSubtitle: {
    margin: "8px 0 0 0",
    color: "#c8d0ef",
    fontSize: "14px",
    lineHeight: 1.5
  },
  searchForm: {
    display: "flex",
    gap: "0"
  },
  searchWrapper: {
    position: "relative"
  },
  searchInput: {
    padding: "8px 12px",
    border: "1px solid #444",
    borderRadius: "20px 0 0 20px",
    background: "#333",
    color: "white",
    outline: "none",
    width: "200px",
    fontSize: "14px"
  },
  searchBtn: {
    padding: "8px 12px",
    background: "#444",
    border: "1px solid #444",
    borderRadius: "0 20px 20px 0",
    color: "white",
    cursor: "pointer",
    borderLeft: "none",
    fontSize: "14px"
  },
  searchDropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    left: 0,
    width: "100%",
    minWidth: "280px",
    background: "#182042",
    border: "1px solid #334071",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
    zIndex: 1200
  },
  searchResultButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(90, 109, 163, 0.28)",
    color: "white",
    cursor: "pointer",
    textAlign: "left"
  },
  searchResultIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    objectFit: "cover",
    flexShrink: 0
  },
  searchResultContent: {
    display: "grid",
    gap: "4px"
  },
  searchResultName: {
    fontSize: "14px",
    fontWeight: "600"
  },
  searchResultMeta: {
    fontSize: "12px",
    color: "#aab7e4"
  },
  searchEmpty: {
    padding: "14px",
    color: "#d7def5",
    fontSize: "14px",
    textAlign: "center"
  },
  homeBtn: {
    padding: "5px 12px",
    borderRadius: "20px",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    border: "none"
  },
  logo: {
    height: "30px"
  },
  btn: {
    padding: "8px 15px",
    borderRadius: "20px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    cursor: "pointer"
  },
  btnSecondary: {
    padding: "8px 15px",
    borderRadius: "20px",
    background: "#2a3550",
    color: "white",
    border: "1px solid #3a4060",
    cursor: "pointer"
  },
  btnDanger: {
    padding: "8px 15px",
    borderRadius: "20px",
    background: "#f44336",
    color: "white",
    border: "none",
    cursor: "pointer"
  },
  ordersHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px"
  },
  ordersTitle: {
    margin: 0
  },
  ordersSubtitle: {
    margin: "8px 0 0 0",
    color: "#c8d0ef",
    fontSize: "14px",
    lineHeight: 1.5
  },
  closeStyleInline: {
    background: "#2a3550",
    color: "white",
    border: "1px solid #3a4060",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer"
  },
  ordersList: {
    display: "grid",
    gap: "14px",
    maxHeight: "60vh",
    overflowY: "auto"
  },
  orderCard: {
    background: "#182042",
    border: "1px solid #334071",
    borderRadius: "12px",
    padding: "16px"
  },
  orderCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginBottom: "10px"
  },
  orderStatus: {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  orderStatusSuccess: {
    background: "rgba(76, 175, 80, 0.18)",
    color: "#9df5a1",
    border: "1px solid rgba(76, 175, 80, 0.45)"
  },
  orderStatusWarning: {
    background: "rgba(255, 193, 7, 0.18)",
    color: "#ffe08a",
    border: "1px solid rgba(255, 193, 7, 0.45)"
  },
  orderStatusDanger: {
    background: "rgba(244, 67, 54, 0.18)",
    color: "#ff9b92",
    border: "1px solid rgba(244, 67, 54, 0.45)"
  },
  orderMeta: {
    color: "#d7def5",
    fontSize: "14px",
    marginTop: "6px"
  },
  orderReason: {
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "rgba(244, 67, 54, 0.12)",
    border: "1px solid rgba(244, 67, 54, 0.3)",
    color: "#ffd1cb",
    fontSize: "14px",
    lineHeight: 1.5
  },
  orderEmptyState: {
    background: "#182042",
    border: "1px solid #334071",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    color: "#d7def5"
  }
};

export default Navbar;
