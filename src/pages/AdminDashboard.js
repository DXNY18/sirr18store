import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearAdminSession,
  deleteAdmin as deleteAdminApi,
  deleteUser as deleteUserApi,
  deleteVoucher as deleteVoucherApi,
  deleteBanner as deleteBannerApi,
  fetchAdmins,
  fetchOrders,
  fetchUsers,
  fetchVouchers,
  fetchBanners,
  getAdminProfile,
  isAdminAuthenticated,
  saveAdmin as saveAdminApi,
  deleteGame as deleteGameApi,
  saveGame as saveGameApi,
  saveBanner as saveBannerApi,
  saveGameItems,
  saveVoucher as saveVoucherApi,
  updateOrderStatus as updateOrderStatusApi
} from "../api/client";
import { showValidationAlert, showErrorAlert, showSuccessAlert, confirmAction } from "../utils/authToast";
import { GAMES_CHANGE_EVENT, getStoredGames, saveGames, refreshGames } from "../data/gameStore";
import { compressImage } from "../utils/imageCompression";
import { getGameIcon } from "../data/gameCatalog";

const stripItemSuffix = (rawName, suffix) => {
  const value = rawName.trim();
  if (!value || !suffix) return value;

  const suffixPattern = new RegExp(`\\s+${suffix}$`, "i");
  if (suffixPattern.test(value)) {
    return value.replace(suffixPattern, "").trim();
  }

  return value;
};

const composeItemName = (rawName, suffix) => {
  const value = stripItemSuffix(rawName, suffix);
  if (!value || !suffix) return value;
  return `${value} ${suffix}`;
};

const getStartOfWeek = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  return start;
};

const getStartOfNextMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

const getMonthKey = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const getYearValue = (date) => String(date.getFullYear());

const parseMonthKey = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

const formatMonthLabel = (monthKey) => {
  const date = parseMonthKey(monthKey);
  if (Number.isNaN(date.getTime())) {
    return "Bulan Ini";
  }

  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric"
  });
};

const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  const date = new Date(new Date().getFullYear(), index, 1);
  return { value, label: date.toLocaleDateString("id-ID", { month: "long" }) };
});

const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID");
};

const getOrderDate = (order) => {
  const dateStr = order.createdAt || order.created_at;
  if (!dateStr) {
    return null;
  }

  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [adminProfile, setAdminProfile] = useState(() => getAdminProfile());
  const [activeSection, setActiveSection] = useState("orders");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [gamesData, setGamesData] = useState(() => getStoredGames());
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedSalesMonth, setSelectedSalesMonth] = useState("");
  const [selectedSalesYear, setSelectedSalesYear] = useState("");
  const [hasTouchedSalesFilter, setHasTouchedSalesFilter] = useState(false);
  const [salesPeriodKey, setSalesPeriodKey] = useState("month");
  const [salesGameFilter, setSalesGameFilter] = useState("all");
  const [gameFormId, setGameFormId] = useState("");
  const [gameFormName, setGameFormName] = useState("");
  const [gameFormPublisher, setGameFormPublisher] = useState("");
  const [gameFormCategory, setGameFormCategory] = useState("");
  const [gameFormDeveloper, setGameFormDeveloper] = useState("");
  const [gameFormItemSuffix, setGameFormItemSuffix] = useState("");
  const [gameFormBanner, setGameFormBanner] = useState("");
  const [gameFormIcon, setGameFormIcon] = useState("");
  const [gameFormPoster, setGameFormPoster] = useState("");
  const [editingGameId, setEditingGameId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [hoveredCard, setHoveredCard] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(true);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannerFormId, setBannerFormId] = useState("");
  const [bannerFormImage, setBannerFormImage] = useState("");
  const [bannerFormAlt, setBannerFormAlt] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDescription, setVoucherDescription] = useState("");
  const [voucherGameId, setVoucherGameId] = useState("");
  const [voucherDiscountType, setVoucherDiscountType] = useState("fixed");
  const [voucherDiscountValue, setVoucherDiscountValue] = useState("");
  const [voucherMinOrderPrice, setVoucherMinOrderPrice] = useState("");
  const [voucherMaxDiscount, setVoucherMaxDiscount] = useState("");
  const [voucherUsageLimit, setVoucherUsageLimit] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const isSuperAdmin = adminProfile?.role === "super_admin" || adminProfile?.id === 1;

  useEffect(() => {
    const syncAdminProfile = () => {
      if (!isAdminAuthenticated()) setAdminProfile(null);
      setAdminProfile(getAdminProfile());
    };

    syncAdminProfile();
    window.addEventListener("authchange", syncAdminProfile);
    window.addEventListener("storage", syncAdminProfile);

    return () => {
      window.removeEventListener("authchange", syncAdminProfile);
      window.removeEventListener("storage", syncAdminProfile);
    };
  }, []);

  const handleRequestError = useCallback((error, fallbackMessage, fallbackSection = "") => {
    if (error?.status === 401) {
      // Pastikan clearAdminSession hanya menghapus 'admin_auth_token'
      clearAdminSession(); 
      navigate("/");
      return true;
    }

      if (error?.status === 403) {
      if (fallbackSection) {
        setActiveSection(fallbackSection);
      }
        showErrorAlert(fallbackMessage, error?.message || fallbackMessage);
      return true;
    }

    return false;
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoadingOrders(true);
        const nextOrders = await fetchOrders();
        if (!isMounted) {
          return;
        }

        setOrders(nextOrders);

      } catch (error) {
        if (isMounted) {
          if (handleRequestError(error, "Gagal memuat pesanan.")) {
            return;
          }
          showErrorAlert("Gagal memuat pesanan.", error?.message || "Gagal memuat pesanan.");
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
  }, [handleRequestError]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setUsers([]);
      setIsLoadingUsers(false);
      return undefined;
    }

    let isMounted = true;

    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const nextUsers = await fetchUsers();
        if (!isMounted) {
          return;
        }

        setUsers(nextUsers);
      } catch (error) {
        if (isMounted) {
          if (handleRequestError(error, "Gagal memuat akun user.", "orders")) {
            return;
          }
          showErrorAlert("Gagal memuat akun user.", error?.message || "Gagal memuat akun user.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [handleRequestError, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setAdmins([]);
      setIsLoadingAdmins(false);
      return undefined;
    }

    let isMounted = true;

    const loadAdmins = async () => {
      try {
        setIsLoadingAdmins(true);
        const nextAdmins = await fetchAdmins();
        if (!isMounted) {
          return;
        }

        setAdmins(nextAdmins);
      } catch (error) {
        if (isMounted) {
          if (handleRequestError(error, "Gagal memuat akun admin.", "orders")) {
            return;
          }
          showErrorAlert("Gagal memuat akun admin.", error?.message || "Gagal memuat akun admin.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingAdmins(false);
        }
      }
    };

    loadAdmins();

    return () => {
      isMounted = false;
    };
  }, [handleRequestError, isSuperAdmin]);

  useEffect(() => {
    let isMounted = true;

    const loadVouchers = async () => {
      try {
        setIsLoadingVouchers(true);
        const nextVouchers = await fetchVouchers();
        if (!isMounted) {
          return;
        }

        setVouchers(nextVouchers);
      } catch (error) {
        if (isMounted) {
          if (handleRequestError(error, "Gagal memuat voucher.")) {
            return;
          }
          showErrorAlert("Gagal memuat voucher.", error?.message || "Gagal memuat voucher.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingVouchers(false);
        }
      }
    };

    loadVouchers();

    return () => {
      isMounted = false;
    };
  }, [handleRequestError]);

  useEffect(() => {
    let isMounted = true;

    const loadBanners = async () => {
      try {
        setIsLoadingBanners(true);
        const nextBanners = await fetchBanners();
        if (isMounted) {
          setBanners(nextBanners);
        }
      } catch (error) {
        if (isMounted) {
          if (handleRequestError(error, "Gagal memuat banner.")) {
            return;
          }
          showErrorAlert("Gagal memuat banner.", error?.message || "Gagal memuat banner.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingBanners(false);
        }
      }
    };

    loadBanners();
    return () => { isMounted = false; };
  }, [handleRequestError]);

  useEffect(() => {
    let isMounted = true;

    const syncGames = () => {
      const cachedGames = getStoredGames();
      setGamesData(cachedGames);
    };

    const loadGames = async () => {
      try {
        setIsLoadingGames(true);
        const nextGames = await refreshGames();
        if (!isMounted) {
          return;
        }

        setGamesData(nextGames);

      } catch (error) {
        if (isMounted) {
          if (handleRequestError(error, "Gagal memuat data game.")) {
            return;
          }
          showErrorAlert("Gagal memuat data game.", error?.message || "Gagal memuat data game.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingGames(false);
        }
      }
    };

    loadGames();
    window.addEventListener("storage", syncGames);
    window.addEventListener(GAMES_CHANGE_EVENT, syncGames);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncGames);
      window.removeEventListener(GAMES_CHANGE_EVENT, syncGames);
    };
  }, [handleRequestError]);

  useEffect(() => {
    if (!selectedOrderId && orders.length) {
      setSelectedOrderId(orders[0].id);
      return;
    }

    if (selectedOrderId && !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0]?.id || "");
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    const nextSelectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
    setRejectionReason(nextSelectedOrder?.rejectionReason || "");
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!isSuperAdmin && (activeSection === "users" || activeSection === "admins")) {
      setActiveSection("orders");
    }
  }, [activeSection, isSuperAdmin]);

  useEffect(() => {
    const gameIds = Object.keys(gamesData);

    if (!selectedGameId && gameIds.length) {
      setSelectedGameId(gameIds[0]);
      return;
    }

    if (selectedGameId && !gamesData[selectedGameId]) {
      setSelectedGameId(gameIds[0] || "");
    }
  }, [gamesData, selectedGameId]);

  const completedOrders = useMemo(
    () => orders.filter((order) => String(order.status || "").toLowerCase() === "completed"),
    [orders]
  );

  const salesGameOptions = useMemo(() => {
    const games = new Map();

    completedOrders.forEach((order) => {
      const gameId = order.gameId || order.game_id || order.game || "";
      const gameName = order.game || gameId;
      if (gameId && !games.has(gameId)) {
        games.set(gameId, gameName);
      }
    });

    return Array.from(games, ([id, name]) => ({ id, name })).sort((left, right) =>
      left.name.localeCompare(right.name, "id-ID")
    );
  }, [completedOrders]);

  const salesSourceOrders = useMemo(() => {
    if (salesGameFilter === "all") {
      return completedOrders;
    }

    return completedOrders.filter((order) => (order.gameId || order.game_id || order.game) === salesGameFilter);
  }, [completedOrders, salesGameFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      completed: orders.filter((order) => order.status === "completed").length,
      today: orders.filter((order) => {
        const dateStr = order.createdAt || order.created_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !Number.isNaN(d.getTime()) && d >= todayStart && d < tomorrowStart;
      }).length
    };
  }, [orders]);

  const salesMonthKeys = useMemo(() => {
    const currentMonthKey = getMonthKey(new Date());
    const monthKeys = new Set([currentMonthKey]);

    salesSourceOrders.forEach((order) => {
      const orderDate = getOrderDate(order);
      if (orderDate) {
        monthKeys.add(getMonthKey(orderDate));
      }
    });

    return Array.from(monthKeys).sort((left, right) => right.localeCompare(left));
  }, [salesSourceOrders]);

  const salesYearOptions = useMemo(() => {
    const currentYear = getYearValue(new Date());
    const yearValues = new Set([currentYear]);

    salesSourceOrders.forEach((order) => {
      const orderDate = getOrderDate(order);
      if (orderDate) {
        yearValues.add(getYearValue(orderDate));
      }
    });

    return Array.from(yearValues).sort((left, right) => Number(right) - Number(left));
  }, [salesSourceOrders]);

  const preferredSalesMonthKey = useMemo(() => {
    const currentMonthKey = getMonthKey(new Date());
    const hasCurrentMonthSales = salesSourceOrders.some((order) => {
      const orderDate = getOrderDate(order);
      return orderDate && getMonthKey(orderDate) === currentMonthKey;
    });

    const latestSalesMonth = salesMonthKeys.find((monthKey) => monthKey !== currentMonthKey);
    return hasCurrentMonthSales ? currentMonthKey : latestSalesMonth || currentMonthKey;
  }, [salesSourceOrders, salesMonthKeys]);

  useEffect(() => {
    const [preferredYear, preferredMonthValue] = preferredSalesMonthKey.split("-");

    if (!hasTouchedSalesFilter) {
      setSelectedSalesMonth(preferredMonthValue);
      setSelectedSalesYear(preferredYear);
      return;
    }

    if (!selectedSalesMonth) {
      setSelectedSalesMonth(preferredMonthValue);
    }
    if (!selectedSalesYear || !salesYearOptions.includes(selectedSalesYear)) {
      setSelectedSalesYear(preferredYear);
    }
  }, [hasTouchedSalesFilter, preferredSalesMonthKey, salesYearOptions, selectedSalesMonth, selectedSalesYear]);

  const salesRecap = useMemo(() => {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const selectedMonthKey =
      selectedSalesMonth && selectedSalesYear
        ? `${selectedSalesYear}-${selectedSalesMonth}`
        : getMonthKey(now);

    const monthStart = parseMonthKey(selectedMonthKey);
    const monthEnd = getStartOfNextMonth(monthStart);
    const selectedYearValue = selectedSalesYear || getYearValue(now);
    const yearStart = new Date(Number(selectedYearValue), 0, 1);
    const yearEnd = new Date(Number(selectedYearValue) + 1, 0, 1);

    const periods = [
      { key: "today", label: "Hari Ini", startDate: todayStart, endDate: tomorrowStart },
      { key: "week", label: "Minggu Ini", startDate: getStartOfWeek(now), endDate: tomorrowStart },
      {
        key: "month",
        label: formatMonthLabel(selectedMonthKey),
        startDate: monthStart,
        endDate: monthEnd
      },
      {
        key: "year",
        label: `Tahun ${selectedYearValue}`,
        startDate: yearStart,
        endDate: yearEnd
      }
    ];

    return periods.map((period) => {
      const allPeriodOrders = completedOrders.filter((order) => {
        const orderDate = getOrderDate(order);
        return orderDate && orderDate >= period.startDate && orderDate < period.endDate;
      });
      const periodOrders = salesSourceOrders.filter((order) => {
        const orderDate = getOrderDate(order);
        return orderDate && orderDate >= period.startDate && orderDate < period.endDate;
      });

      const revenue = periodOrders.reduce((total, order) => total + Number(order.price || 0), 0);
      const discount = periodOrders.reduce((total, order) => total + Number(order.discountAmount || 0), 0);
      const totalRevenue = allPeriodOrders.reduce((total, order) => total + Number(order.price || 0), 0);
      const totalTransactionCount = allPeriodOrders.length;

      return {
        ...period,
        transactionCount: periodOrders.length,
        totalTransactionCount,
        revenue,
        totalRevenue,
        discount,
        grossRevenue: revenue + discount,
        averageOrderValue: periodOrders.length ? Math.round(revenue / periodOrders.length) : 0,
        revenueShare: totalRevenue ? Math.round((revenue / totalRevenue) * 100) : 0,
        transactionShare: totalTransactionCount ? Math.round((periodOrders.length / totalTransactionCount) * 100) : 0,
        orders: periodOrders
      };
    });
  }, [completedOrders, salesSourceOrders, selectedSalesMonth, selectedSalesYear]);

  const selectedSalesRecap = useMemo(
    () => salesRecap.find((recap) => recap.key === salesPeriodKey) || salesRecap[2] || salesRecap[0] || null,
    [salesRecap, salesPeriodKey]
  );
  const selectedSalesOrders = useMemo(
    () => selectedSalesRecap?.orders || [],
    [selectedSalesRecap]
  );
  const selectedSalesGameLabel =
    salesGameFilter === "all"
      ? "Semua Game"
      : salesGameOptions.find((game) => game.id === salesGameFilter)?.name || salesGameFilter;
  const topSalesGames = useMemo(() => {
    const gameTotals = new Map();

    selectedSalesOrders.forEach((order) => {
      const gameId = order.gameId || order.game_id || order.game || "unknown";
      const existing = gameTotals.get(gameId) || {
        id: gameId,
        name: order.game || gameId,
        transactionCount: 0,
        revenue: 0
      };

      existing.transactionCount += 1;
      existing.revenue += Number(order.price || 0);
      gameTotals.set(gameId, existing);
    });

    return Array.from(gameTotals.values())
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 5);
  }, [selectedSalesOrders]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const selectedGame = gamesData[selectedGameId] || null;
  const editingGame = editingGameId ? gamesData[editingGameId] || null : null;
  const gamesList = Object.entries(gamesData);
  const itemNameSuffix = selectedGame?.suffix || ""; // Ambil dari data game di state
  const itemNamePreview = composeItemName(itemName, itemNameSuffix); // Benarkan urutan argumen

  const persistGamesLocally = (updatedGames) => {
    setGamesData(updatedGames);
    try {
      saveGames(updatedGames);
      // Picu event agar halaman lain (landing page) mendeteksi perubahan data
      window.dispatchEvent(new Event(GAMES_CHANGE_EVENT));
    } catch (e) {
      console.warn("Gagal menyimpan ke cache browser (localStorage penuh). Data hanya akan tersedia sampai halaman direfresh.", e);
      // Jangan lempar error agar UI tetap bisa memproses suksesnya API
    }
  };

  const resetItemForm = () => {
    setItemName("");
    setItemPrice("");
    setEditingItemIndex(null);
  };

  const resetGameForm = () => {
    setGameFormId("");
    setGameFormName("");
    setGameFormPublisher("");
    setGameFormCategory("");
    setGameFormDeveloper("");
    setGameFormItemSuffix("");
    setGameFormBanner("");
    setGameFormIcon("");
    setGameFormPoster("");
    setEditingGameId("");
  };

  const handleFileUpload = async (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      showValidationAlert("Tipe file tidak valid", "Hanya file gambar (JPG, PNG, WEBP) yang diizinkan.");
      e.target.value = "";
      setter('');
      return;
    }

    try {
      // Kompresi gambar sebelum diubah ke Base64
      const compressedBase64 = await compressImage(file);
      setter(compressedBase64);
    } catch (err) {
      showErrorAlert("Gagal memproses gambar", err.message || "Terjadi kesalahan saat mengompres gambar.");
      setter(''); // Kosongkan state gambar jika gagal
    } finally {
      // Reset input file agar bisa memilih file yang sama lagi
      e.target.value = ""; 
    }
  };

  const resetVoucherForm = () => {
    setVoucherCode("");
    setVoucherTitle("");
    setVoucherDescription("");
    setVoucherGameId("");
    setVoucherDiscountType("fixed");
    setVoucherDiscountValue("");
    setVoucherMinOrderPrice("");
    setVoucherMaxDiscount("");
    setVoucherUsageLimit("");
  };

  const resetAdminForm = () => {
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
  };

  const resetBannerForm = () => {
    setBannerFormId("");
    setBannerFormImage("");
    setBannerFormAlt("");
  };

  const handleEditBanner = (banner) => {
    setBannerFormId(banner.id);
    setBannerFormImage(banner.image);
    setBannerFormAlt(banner.alt || "");
  };

  const handleBannerSubmit = async () => {
    if (!bannerFormImage) {
      showValidationAlert("Input diperlukan", "Gambar banner wajib diunggah.");
      return;
    }

    try {
      const updatedBanners = await saveBannerApi({
        id: bannerFormId,
        image: bannerFormImage,
        alt: bannerFormAlt.trim()
      });
      setBanners(updatedBanners);
      resetBannerForm();
      showSuccessAlert(bannerFormId ? "Banner berhasil diperbarui." : "Banner berhasil ditambahkan.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menyimpan banner.")) return;
      showErrorAlert("Gagal menyimpan banner.", error?.message || "Gagal menyimpan banner.");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    const confirmed = await confirmAction("Konfirmasi", "Hapus banner ini?", "Ya, hapus");
    if (!confirmed) return;
    try {
      const updatedBanners = await deleteBannerApi(bannerId);
      setBanners(updatedBanners);
      if (bannerFormId === bannerId) resetBannerForm();
      showSuccessAlert("Banner berhasil dihapus.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menghapus banner.")) return;
      showErrorAlert("Gagal menghapus banner.", error?.message || "Gagal menghapus banner.");
    }
  };

  const handleEditGame = (gameId, game) => {
    setEditingGameId(gameId);
    setSelectedGameId(gameId);
    resetItemForm();
    setGameFormId(gameId);
    setGameFormName(game.name || "");
    setGameFormPublisher(game.publisher || "");
    setGameFormCategory(game.category || "");
    setGameFormDeveloper(game.dev || "");
    setGameFormItemSuffix(game.suffix || "");
    setGameFormBanner(game.banner || "");
    setGameFormIcon(game.icon || "");
    setGameFormPoster(game.poster || "");
  };

  const handleGameSubmit = async () => {
    const nextGameId = gameFormId.trim().toLowerCase();
    const payload = {
      originalGameId: editingGameId,
      gameId: nextGameId,
      name: gameFormName.trim(),
      publisher: gameFormPublisher.trim(),
      category: gameFormCategory.trim(),
      developerName: gameFormDeveloper.trim(),
      itemSuffix: gameFormItemSuffix.trim(),
      banner: gameFormBanner,
      icon: gameFormIcon,
      poster: gameFormPoster
    };

    if (!payload.gameId || !payload.name || !payload.publisher || !payload.category || !payload.developerName || !payload.itemSuffix || !payload.banner || !payload.icon || !payload.poster) {
      showValidationAlert("Input diperlukan", "Semua data game wajib diisi.");
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(payload.gameId)) {
      showValidationAlert("ID tidak valid", "ID game hanya boleh berisi huruf kecil, angka, strip, atau underscore.");
      return;
    }

    try {
      const updatedGames = await saveGameApi(payload);
      persistGamesLocally(updatedGames);
      setSelectedGameId(payload.gameId);
      resetGameForm();
      showSuccessAlert(editingGameId ? "Game berhasil diperbarui." : "Game berhasil ditambahkan.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menyimpan game.")) {
        return;
      }
      showErrorAlert("Gagal menyimpan game.", error?.message || "Gagal menyimpan game.");
    }
  };

  const handleDeleteGame = async (gameId, game) => {
    if (!gameId || !game) {
      showValidationAlert("Game tidak ditemukan", "Pilih game yang ingin dihapus terlebih dahulu.");
      return;
    }

    const confirmed = await confirmAction(
      "Konfirmasi",
      `Hapus game "${game.name}" dari katalog? Riwayat pesanan lama tetap tersimpan.`,
      "Ya, hapus"
    );

    if (!confirmed) {
      return;
    }

    try {
      const updatedGames = await deleteGameApi(gameId);
      persistGamesLocally(updatedGames);
      if (selectedGameId === gameId) {
        setSelectedGameId(Object.keys(updatedGames)[0] || "");
      }
      if (editingGameId === gameId) {
        resetGameForm();
      }
      showSuccessAlert("Game berhasil dihapus dari katalog.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menghapus game.")) {
        return;
      }
      showErrorAlert("Gagal menghapus game.", error?.message || "Gagal menghapus game.");
    }
  };

  const handleItemSubmit = async () => {
    if (!selectedGameId || !selectedGame) {
      showValidationAlert("Input diperlukan", "Pilih game terlebih dahulu.");
      return;
    }

    const name = composeItemName(itemName, itemNameSuffix);
    const price = Number(itemPrice);

    if (!name) {
      showValidationAlert("Input diperlukan", "Nama item wajib diisi.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showValidationAlert("Input diperlukan", "Harga item harus lebih dari 0.");
      return;
    }

    const nextItems =
      editingItemIndex === null
        ? [...selectedGame.items, { name, price }]
        : selectedGame.items.map((item, index) =>
            index === editingItemIndex ? { ...item, name, price } : item
          );

    try {
      const updatedGames = await saveGameItems(selectedGameId, nextItems);
      persistGamesLocally(updatedGames);
      showSuccessAlert(editingItemIndex === null ? "Item berhasil ditambahkan." : "Item berhasil diperbarui.");
      resetItemForm();
    } catch (error) {
      if (handleRequestError(error, "Gagal menyimpan item game.")) {
        return;
      }
      showErrorAlert("Gagal menyimpan item game.", error?.message || "Gagal menyimpan item game.");
    }
  };

  const handleEditItem = (item, index) => {
    setItemName(stripItemSuffix(item.name, selectedGame?.suffix));
    setItemPrice(String(item.price));
    setEditingItemIndex(index);
  };

  const handleDeleteItem = async (index) => {
    if (!selectedGame) {
      return;
    }

    const targetItem = selectedGame.items[index];
    const confirmed = await confirmAction(
      "Konfirmasi",
      `Hapus item "${targetItem.name}" dari ${selectedGame.name}?`,
      "Ya, hapus"
    );

    if (!confirmed) {
      return;
    }

    const updatedItems = selectedGame.items.filter((_, itemIndex) => itemIndex !== index);

    try {
      const updatedGames = await saveGameItems(selectedGameId, updatedItems);
      persistGamesLocally(updatedGames);

      if (editingItemIndex === index) {
        resetItemForm();
      } else if (editingItemIndex !== null && editingItemIndex > index) {
        setEditingItemIndex(editingItemIndex - 1);
      }

      showSuccessAlert("Item berhasil dihapus.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menghapus item.")) {
        return;
      }

      showErrorAlert("Gagal menghapus item.", error?.message || "Gagal menghapus item.");
    }
  };

  const handleExportSalesPdf = () => {
    if (!selectedSalesRecap) {
      showValidationAlert("Data belum tersedia", "Tidak ada data rekap yang bisa diexport.");
      return;
    }

    const generatedAt = new Date().toLocaleString("id-ID");
    const rowsHtml = selectedSalesOrders.length
      ? selectedSalesOrders.map((order, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(formatDateTime(order.createdAt || order.created_at))}</td>
            <td>${escapeHtml(order.id)}</td>
            <td>${escapeHtml(order.username || "Guest")}</td>
            <td>${escapeHtml(order.game)}</td>
            <td>${escapeHtml(order.item)}</td>
            <td class="right">${escapeHtml(formatCurrency(order.price))}</td>
          </tr>
        `).join("")
      : '<tr><td colspan="7" class="empty">Tidak ada transaksi selesai pada filter ini.</td></tr>';

    const topGamesHtml = topSalesGames.length
      ? topSalesGames.map((game, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(game.name)}</td>
            <td class="right">${game.transactionCount}</td>
            <td class="right">${escapeHtml(formatCurrency(game.revenue))}</td>
          </tr>
        `).join("")
      : '<tr><td colspan="4" class="empty">Belum ada data game.</td></tr>';

    const reportWindow = window.open("", "_blank", "width=1024,height=768");
    if (!reportWindow) {
      showErrorAlert("Export gagal", "Izinkan popup browser untuk membuat PDF.");
      return;
    }

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Rekap Penjualan ${escapeHtml(selectedSalesRecap.label)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #172033; margin: 32px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            h2 { margin: 26px 0 10px; font-size: 16px; }
            .meta { color: #5c667a; font-size: 12px; margin-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .card { border: 1px solid #d9deea; border-radius: 8px; padding: 12px; }
            .label { color: #5c667a; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; }
            .value { font-size: 16px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border-bottom: 1px solid #e5e8f0; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f4f6fb; color: #3c465c; }
            .right { text-align: right; }
            .empty { text-align: center; color: #6d768a; padding: 18px; }
            @media print {
              body { margin: 18mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Rekap Penjualan</h1>
          <div class="meta">
            Periode: ${escapeHtml(selectedSalesRecap.label)} | Game: ${escapeHtml(selectedSalesGameLabel)} | Dibuat: ${escapeHtml(generatedAt)}
          </div>
          <div class="summary">
            <div class="card"><div class="label">Pendapatan Bersih</div><div class="value">${escapeHtml(formatCurrency(selectedSalesRecap.revenue))}</div></div>
            <div class="card"><div class="label">Transaksi</div><div class="value">${selectedSalesRecap.transactionCount}</div></div>
            <div class="card"><div class="label">Rata-rata Order</div><div class="value">${escapeHtml(formatCurrency(selectedSalesRecap.averageOrderValue))}</div></div>
            <div class="card"><div class="label">Diskon Voucher</div><div class="value">${escapeHtml(formatCurrency(selectedSalesRecap.discount))}</div></div>
          </div>
          <h2>Ranking Game</h2>
          <table>
            <thead><tr><th>No</th><th>Game</th><th class="right">Transaksi</th><th class="right">Pendapatan</th></tr></thead>
            <tbody>${topGamesHtml}</tbody>
          </table>
          <h2>Detail Transaksi</h2>
          <table>
            <thead><tr><th>No</th><th>Tanggal</th><th>ID Pesanan</th><th>User</th><th>Game</th><th>Item</th><th class="right">Total</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>
            window.addEventListener("load", function () {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  const handleVoucherSubmit = async () => {
    const discountValue = Number(voucherDiscountValue);
    const minOrderPrice = Number(voucherMinOrderPrice || 0);
    const maxDiscount = voucherMaxDiscount.trim();
    const usageLimit = voucherUsageLimit.trim();

    if (!voucherCode.trim() || !voucherTitle.trim()) {
      showValidationAlert("Input diperlukan", "Kode dan judul voucher wajib diisi.");
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      showValidationAlert("Input diperlukan", "Nilai diskon voucher harus lebih dari 0.");
      return;
    }

    if (!Number.isFinite(minOrderPrice) || minOrderPrice < 0) {
      showValidationAlert("Input diperlukan", "Minimal order voucher tidak valid.");
      return;
    }

    try {
      const createdVoucher = await saveVoucherApi({
        code: voucherCode,
        title: voucherTitle,
        description: voucherDescription,
        gameId: voucherGameId,
        discountType: voucherDiscountType,
        discountValue,
        minOrderPrice,
        maxDiscount,
        usageLimit
      });

      setVouchers((currentVouchers) => [createdVoucher, ...currentVouchers]);
      resetVoucherForm();
      showSuccessAlert("Voucher berhasil ditambahkan.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menambahkan voucher.")) {
        return;
      }
      showErrorAlert("Gagal menambahkan voucher.", error?.message || "Gagal menambahkan voucher.");
    }
  };

  const handleDeleteVoucher = async (voucherId, voucherLabel) => {
    const confirmed = await confirmAction(
      "Konfirmasi",
      `Hapus voucher "${voucherLabel}"?`,
      "Ya, hapus"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteVoucherApi(voucherId);
      setVouchers((currentVouchers) => currentVouchers.filter((voucher) => voucher.id !== voucherId));
      showSuccessAlert("Voucher berhasil dihapus.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menghapus voucher.")) {
        return;
      }

      showErrorAlert("Gagal menghapus voucher.", error?.message || "Gagal menghapus voucher.");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    const confirmed = await confirmAction(
      "Konfirmasi",
      `Hapus akun user "${username}"?`,
      "Ya, hapus"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUserApi(userId);
      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
      showSuccessAlert("Akun user berhasil dihapus.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menghapus akun user.", "orders")) {
        return;
      }

      showErrorAlert("Gagal menghapus akun user.", error?.message || "Gagal menghapus akun user.");
    }
  };

  const handleAdminSubmit = async () => {
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      showValidationAlert("Input diperlukan", "Nama, email, dan password admin wajib diisi.");
      return;
    }

    try {
      const createdAdmin = await saveAdminApi({
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword
      });

      setAdmins((currentAdmins) => [createdAdmin, ...currentAdmins]);
      resetAdminForm();
      showSuccessAlert("Admin baru berhasil ditambahkan.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menambahkan admin.", "orders")) {
        return;
      }
      showErrorAlert("Gagal menambahkan admin.", error?.message || "Gagal menambahkan admin.");
    }
  };

  const handleDeleteAdmin = async (adminId, adminLabel) => {
    const confirmed = await confirmAction(
      "Konfirmasi",
      `Hapus admin "${adminLabel}"?`,
      "Ya, hapus"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminApi(adminId);
      setAdmins((currentAdmins) => currentAdmins.filter((admin) => admin.id !== adminId));
      showSuccessAlert("Akun admin berhasil dihapus.");
    } catch (error) {
      if (handleRequestError(error, "Gagal menghapus admin.", "orders")) {
        return;
      }

      showErrorAlert("Gagal menghapus admin.", error?.message || "Gagal menghapus admin.");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const normalizedReason = rejectionReason.trim();

    if (status === "rejected" && !normalizedReason) {
      showValidationAlert("Input diperlukan", "Isi deskripsi penolakan terlebih dahulu.");
      return;
    }

    try {
      const updatedOrder = await updateOrderStatusApi(orderId, status, normalizedReason);
      const updatedOrders = orders.map((order) =>
        order.id === orderId ? updatedOrder : order
      );

      setOrders(updatedOrders);
      setRejectionReason(updatedOrder.rejectionReason || "");
      showSuccessAlert(status === "completed" ? "Pesanan berhasil dikonfirmasi." : "Pesanan ditolak.");
    } catch (error) {
      if (handleRequestError(error, "Gagal memperbarui status pesanan.")) {
        return;
      }
      showErrorAlert("Gagal memperbarui status pesanan.", error?.message || "Gagal memperbarui status pesanan.");
    }
  };

  return (
    <div className="admin-dashboard" style={styles.container}>
      <div className="admin-dashboard__header" style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>Kelola pesanan dan item game dari satu panel yang lebih rapi.</p>
        </div>
        <div style={styles.headerMeta}>
          <span
            style={{
              ...styles.accessBadge,
              ...(isSuperAdmin ? styles.accessBadgeSuper : styles.accessBadgeAdmin)
            }}
          >
            {isSuperAdmin ? "Admin Utama" : "Admin Operasional"}
          </span>
          <span style={styles.headerMetaText}>{adminProfile?.name || "Administrator"}</span>
        </div>
      </div>

      <div className="admin-dashboard__shell" style={styles.dashboardShell}>
        <aside className="admin-dashboard__sidebar" style={styles.sidebar}>
          <div className="admin-options-card" style={styles.optionsCard}>
            <h2 style={styles.sectionTitle}>Opsi Admin</h2>
            <p style={styles.sectionHint}>
              Pilih tugas yang ingin dikerjakan. Kelola user dan admin hanya tersedia untuk admin utama.
            </p>
            <div style={styles.optionsGrid}>
              <button
                style={{
                  ...styles.optionButton,
                  ...(activeSection === "orders" ? styles.optionButtonPrimary : styles.optionButtonMuted)
                }}
                onClick={() => setActiveSection("orders")}
              >
                Konfirmasi Pesanan
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  ...(activeSection === "banners" ? styles.optionButtonSecondary : styles.optionButtonMuted)
                }}
                onClick={() => setActiveSection("banners")}
              >
                Kelola Banner
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  ...(activeSection === "items" ? styles.optionButtonSecondary : styles.optionButtonMuted)
                }}
                onClick={() => setActiveSection("items")}
              >
                Tambah Item
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  ...(activeSection === "games" ? styles.optionButtonInfo : styles.optionButtonMuted)
                }}
                onClick={() => setActiveSection("games")}
              >
                Kelola Game
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  ...(activeSection === "vouchers" ? styles.optionButtonAccent : styles.optionButtonMuted)
                }}
                onClick={() => setActiveSection("vouchers")}
              >
                Kelola Voucher
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  ...(activeSection === "sales" ? styles.optionButtonSuccess : styles.optionButtonMuted)
                }}
                onClick={() => setActiveSection("sales")}
              >
                Rekap Penjualan
              </button>
              {isSuperAdmin && (
                <button
                  style={{
                    ...styles.optionButton,
                    ...(activeSection === "users" ? styles.optionButtonInfo : styles.optionButtonMuted)
                  }}
                  onClick={() => setActiveSection("users")}
                >
                  Kelola User
                </button>
              )}
              {isSuperAdmin && (
                <button
                  style={{
                    ...styles.optionButton,
                    ...(activeSection === "admins" ? styles.optionButtonDanger : styles.optionButtonMuted)
                  }}
                  onClick={() => setActiveSection("admins")}
                >
                  Kelola Admin
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="admin-dashboard__main" style={styles.mainContent}>
          <div className="admin-stats" style={styles.stats}>
            <div
              style={{
                ...styles.statCard,
                transform: hoveredCard === "stat-total" ? "translateY(-3px)" : "translateY(0)",
                boxShadow: hoveredCard === "stat-total" ? "0 0 22px rgba(111, 155, 255, 0.25)" : "none"
              }}
              onMouseEnter={() => setHoveredCard("stat-total")}
              onMouseLeave={() => setHoveredCard("")}
            >
              <div style={styles.statNumber}>{stats.total}</div>
              <div>Total Pesanan</div>
            </div>
            <div
              style={{
                ...styles.statCard,
                transform: hoveredCard === "stat-pending" ? "translateY(-3px)" : "translateY(0)",
                boxShadow: hoveredCard === "stat-pending" ? "0 0 22px rgba(111, 155, 255, 0.25)" : "none"
              }}
              onMouseEnter={() => setHoveredCard("stat-pending")}
              onMouseLeave={() => setHoveredCard("")}
            >
              <div style={styles.statNumber}>{stats.pending}</div>
              <div>Menunggu Konfirmasi</div>
            </div>
            <div
              style={{
                ...styles.statCard,
                transform: hoveredCard === "stat-completed" ? "translateY(-3px)" : "translateY(0)",
                boxShadow: hoveredCard === "stat-completed" ? "0 0 22px rgba(111, 155, 255, 0.25)" : "none"
              }}
              onMouseEnter={() => setHoveredCard("stat-completed")}
              onMouseLeave={() => setHoveredCard("")}
            >
              <div style={styles.statNumber}>{stats.completed}</div>
              <div>Sudah Selesai</div>
            </div>
            <div
              style={{
                ...styles.statCard,
                transform: hoveredCard === "stat-today" ? "translateY(-3px)" : "translateY(0)",
                boxShadow: hoveredCard === "stat-today" ? "0 0 22px rgba(111, 155, 255, 0.25)" : "none"
              }}
              onMouseEnter={() => setHoveredCard("stat-today")}
              onMouseLeave={() => setHoveredCard("")}
            >
              <div style={styles.statNumber}>{stats.today}</div>
              <div>Pesanan Hari Ini</div>
            </div>
          </div>

      {activeSection === "orders" && (
      <div style={styles.sectionCard}>
        <h2 style={styles.sectionTitle}>Kelola Pesanan</h2>
        <p style={styles.sectionHint}>
          Pantau order masuk, cek bukti transfer, lalu konfirmasi atau tolak pesanan.
        </p>
        <div className="admin-orders-layout" style={styles.layout}>
          <div className="admin-orders-panel" style={styles.ordersPanel}>
            <h2 style={styles.panelTitle}>Daftar Pesanan</h2>
            {isLoadingOrders && (
              <div style={styles.emptyState}>Memuat pesanan...</div>
            )}
            {!isLoadingOrders && !orders.length && (
              <div style={styles.emptyState}>Belum ada pesanan masuk.</div>
            )}
            {orders.map((order) => (
              <button
                key={order.id}
                style={{
                  ...styles.orderItem,
                  ...(selectedOrderId === order.id ? styles.orderItemActive : {}),
                  transform: hoveredCard === order.id ? "translateY(-3px)" : "translateY(0)",
                  boxShadow:
                    hoveredCard === order.id
                      ? "0 0 22px rgba(111, 155, 255, 0.28)"
                      : selectedOrderId === order.id
                        ? "0 0 18px rgba(76, 175, 80, 0.22)"
                        : "none"
                }}
                onClick={() => setSelectedOrderId(order.id)}
                onMouseEnter={() => setHoveredCard(order.id)}
                onMouseLeave={() => setHoveredCard("")}
              >
                <div style={styles.orderTopRow}>
                  <strong>{order.id}</strong>
                  <span style={{ ...styles.badge, ...(order.status === "completed" ? styles.badgeSuccess : order.status === "rejected" ? styles.badgeDanger : styles.badgeWarning) }}>
                    {order.status}
                  </span>
                </div>
                <div>{order.game}</div>
                <div style={styles.orderMeta}>
                  User: {order.username || "Guest"}
                </div>
                <div style={styles.orderMeta}>{order.item}</div>
                <div style={styles.orderMeta}>Rp {order.price.toLocaleString()}</div>
                {order.discountAmount > 0 && (
                  <div style={styles.orderMeta}>
                    Voucher {order.customerVoucher} - Rp {order.discountAmount.toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="admin-detail-panel" style={styles.detailPanel}>
            <h2 style={styles.panelTitle}>Detail Verifikasi</h2>
            {!selectedOrder && (
              <div style={styles.emptyState}>Pilih pesanan untuk melihat detail.</div>
            )}

            {selectedOrder && (
              <>
                <div
                  style={{
                    ...styles.detailCard,
                    transform: hoveredCard === "detail-card" ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: hoveredCard === "detail-card" ? "0 0 22px rgba(111, 155, 255, 0.25)" : "none"
                  }}
                  onMouseEnter={() => setHoveredCard("detail-card")}
                  onMouseLeave={() => setHoveredCard("")}
                >
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>ID Pesanan</span>
                    <span style={styles.infoValue}>{selectedOrder.id}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Username</span>
                    <span style={styles.infoValue}>{selectedOrder.username || "Guest"}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Game</span>
                    <span style={styles.infoValue}>{selectedOrder.game}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Item</span>
                    <span style={styles.infoValue}>{selectedOrder.item}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Metode</span>
                    <span style={styles.infoValue}>{selectedOrder.paymentMethod}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Harga Awal</span>
                    <span style={styles.infoValue}>Rp {selectedOrder.originalPrice.toLocaleString()}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Diskon</span>
                    <span style={styles.infoValue}>
                      {selectedOrder.discountAmount > 0
                        ? `-Rp ${selectedOrder.discountAmount.toLocaleString()}`
                        : "-"}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Total Bayar</span>
                    <span style={styles.infoValue}>Rp {selectedOrder.price.toLocaleString()}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>ID Customer</span>
                    <span style={styles.infoValue}>{selectedOrder.customerId}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Nomor HP</span>
                    <span style={styles.infoValue}>{selectedOrder.customerPhone}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Server</span>
                    <span style={styles.infoValue}>{selectedOrder.server}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Voucher</span>
                    <span style={styles.infoValue}>{selectedOrder.customerVoucher || "-"}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Waktu Masuk</span>
                    <span style={styles.infoValue}>{new Date(selectedOrder.createdAt).toLocaleString("id-ID")}</span>
                  </div>
                  {selectedOrder.status === "rejected" && (
                    <div style={styles.reasonBox}>
                      <div style={styles.reasonTitle}>Deskripsi Penolakan</div>
                      <div style={styles.reasonText}>{selectedOrder.rejectionReason || "-"}</div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    ...styles.proofCard,
                    transform: hoveredCard === "proof-card" ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: hoveredCard === "proof-card" ? "0 0 22px rgba(111, 155, 255, 0.25)" : "none"
                  }}
                  onMouseEnter={() => setHoveredCard("proof-card")}
                  onMouseLeave={() => setHoveredCard("")}
                >
                  <h3 style={styles.proofTitle}>Bukti Pembayaran</h3>
                  <p style={styles.proofName}>{selectedOrder.proofFileName}</p>
                  <img src={selectedOrder.proofImage} alt={`Bukti ${selectedOrder.id}`} style={styles.proofImage} />
                </div>

                <div style={styles.actions}>
                  <div style={styles.rejectReasonCard}>
                    <label style={styles.formLabel}>Deskripsi penolakan</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Contoh: bukti pembayaran kurang jelas atau nominal tidak sesuai."
                      style={styles.textArea}
                      disabled={selectedOrder.status !== "pending"}
                    />
                  </div>
                  <button
                    style={{
                      ...styles.actionBtn,
                      ...styles.confirmBtn,
                      ...(selectedOrder.status !== "pending" ? styles.disabledBtn : {})
                    }}
                    disabled={selectedOrder.status !== "pending"}
                    onClick={() => updateOrderStatus(selectedOrder.id, "completed")}
                  >
                    Konfirmasi Pesanan
                  </button>
                  <button
                    style={{
                      ...styles.actionBtn,
                      ...styles.rejectBtn,
                      ...(selectedOrder.status !== "pending" ? styles.disabledBtn : {})
                    }}
                    disabled={selectedOrder.status !== "pending"}
                    onClick={() => updateOrderStatus(selectedOrder.id, "rejected")}
                  >
                    Tolak Pesanan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )} 

      {activeSection === "games" && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Kelola Game</h2>
            <p style={styles.sectionHint}>Tambah, edit, dan hapus judul game yang tampil di katalog toko.</p>
          </div>
          <span style={styles.itemCountBadge}>
            {gamesList.length} game
          </span>
        </div>

        <div className="admin-items-layout" style={styles.itemsLayout}>
          <div className="admin-form-card" style={styles.itemFormCard}>
            <h3 style={styles.formTitle}>{editingGameId ? "Edit Game" : "Tambah Game"}</h3>
            <label style={styles.formLabel}>ID Game</label>
            <input
              value={gameFormId}
              onChange={(e) => setGameFormId(e.target.value.toLowerCase())}
              placeholder="contoh: honkai"
              disabled={Boolean(editingGameId)}
              style={{
                ...styles.textInput,
                ...(editingGameId ? styles.disabledInput : {})
              }}
            />
            <label style={styles.formLabel}>Nama Game</label>
            <input
              value={gameFormName}
              onChange={(e) => setGameFormName(e.target.value)}
              placeholder="Contoh: Honkai Star Rail"
              style={styles.textInput}
            />
            <label style={styles.formLabel}>Publisher</label>
            <input
              value={gameFormPublisher}
              onChange={(e) => setGameFormPublisher(e.target.value)}
              placeholder="Contoh: HoYoverse"
              style={styles.textInput}
            />
            <label style={styles.formLabel}>Developer</label>
            <input
              value={gameFormDeveloper}
              onChange={(e) => setGameFormDeveloper(e.target.value)}
              placeholder="Contoh: HoYoverse"
              style={styles.textInput}
            />
            <label style={styles.formLabel}>Kategori</label>
            <select
              value={gameFormCategory}
              onChange={(e) => setGameFormCategory(e.target.value)}
              style={styles.selectInputFull}
            >
              <option value="">Pilih Kategori</option>
              <option value="mobile">Mobile Game</option>
              <option value="pc">PC Game</option>
            </select>
            <label style={styles.formLabel}>Jenis Nilai (Diamonds, Bonds, VP, dll.)</label>
            <input
              value={gameFormItemSuffix}
              onChange={(e) => setGameFormItemSuffix(e.target.value)}
              placeholder="Contoh: Diamonds"
              style={styles.textInput}
            />
            <label style={styles.formLabel}>Banner Game</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setGameFormBanner)}
              style={styles.textInput}
            />
            {gameFormBanner && (
              <div style={styles.imagePreviewContainer}>
                <span style={styles.previewLabel}>Preview Banner:</span>
                <img 
                  src={gameFormBanner} 
                  alt="Banner Preview" 
                  style={styles.formImagePreview} 
                />
              </div>
            )}

            <label style={styles.formLabel}>Icon Game</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setGameFormIcon)}
              style={styles.textInput}
            />
            {gameFormIcon && (
              <div style={styles.imagePreviewContainer}>
                <span style={styles.previewLabel}>Preview Icon:</span>
                <img 
                  src={gameFormIcon} 
                  alt="Icon Preview" 
                  style={styles.formIconPreview} 
                />
              </div>
            )}

            <label style={styles.formLabel}>Poster Game</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setGameFormPoster)}
              style={styles.textInput}
            />
            {gameFormPoster && (
              <div style={styles.imagePreviewContainer}>
                <span style={styles.previewLabel}>Preview Poster:</span>
                <img 
                  src={gameFormPoster} 
                  alt="Poster Preview" 
                  style={styles.formPosterPreview} 
                />
              </div>
            )}

            <div style={styles.formActions}>
              <button style={{ ...styles.actionBtn, ...styles.confirmBtn }} onClick={handleGameSubmit}>
                {editingGameId ? "Simpan Game" : "Tambah Game"}
              </button>
              <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={resetGameForm}>
                Reset Form
              </button>
              {editingGameId && (
                <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={() => handleDeleteGame(editingGameId, editingGame)}>
                  Hapus Game
                </button>
              )}
            </div>
          </div>

          <div className="admin-list-card" style={styles.itemsListCard}>
            <div style={styles.gameInfoRow}>
              <div>
                <h3 style={styles.formTitle}>Daftar Game</h3>
                <p style={styles.gameMeta}>Game aktif yang tersimpan di database.</p>
              </div>
            </div>

            {isLoadingGames && (
              <div style={styles.emptyState}>Memuat data game...</div>
            )}

            {!isLoadingGames && !gamesList.length && (
              <div style={styles.emptyState}>Belum ada game aktif.</div>
            )}

            {gamesList.map(([gameId, game]) => (
              <div key={gameId} style={styles.itemRow}>
                <img src={game.icon || getGameIcon(gameId)} alt="" style={styles.listRowIcon} />
                <div style={styles.gameRowContent}>
                  <div style={styles.itemRowTitle}>{game.name}</div>
                  <div style={styles.orderMeta}>ID: {gameId}</div>
                  <div style={styles.orderMeta}>{game.category} - {game.dev}</div>
                </div>
                <div style={styles.rowActions}>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.editBtn }}
                    onClick={() => handleEditGame(gameId, game)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.deleteBtn }}
                    onClick={() => handleDeleteGame(gameId, game)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeSection === "items" && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Kelola Item</h2>
            <p style={styles.sectionHint}>Tambah, edit, dan hapus item top up per game langsung dari halaman ini.</p>
          </div>
          <select
            value={selectedGameId}
            onChange={(e) => {
              setSelectedGameId(e.target.value);
              resetItemForm();
            }}
            style={styles.selectInput}
          >
            {Object.entries(gamesData).map(([gameId, game]) => (
              <option key={gameId} value={gameId}>
                {game.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-items-layout" style={styles.itemsLayout}>
          <div className="admin-form-card" style={styles.itemFormCard}>
            <h3 style={styles.formTitle}>
              {editingItemIndex === null ? "Tambah Item Baru" : "Edit Item"}
            </h3>
            <label style={styles.formLabel}>Nama Item</label>
            <div style={styles.itemNameGroup}>
              <input
                value={itemName}
                onChange={(e) => setItemName(stripItemSuffix(e.target.value, itemNameSuffix))}
                placeholder="Contoh: 86 atau 335 (310+25)"
                style={{ ...styles.textInput, marginBottom: 0 }}
              />
              {itemNameSuffix && (
                <span style={styles.suffixBadge}>{itemNameSuffix}</span>
              )}
            </div>
            {itemNamePreview && (
              <p style={styles.previewHint}>Akan disimpan sebagai: {itemNamePreview}</p>
            )}
            <label style={styles.formLabel}>Harga</label>
            <input
              type="number"
              min="1"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="Contoh: 20000"
              style={styles.textInput}
            />
            <div style={styles.formActions}>
              <button style={{ ...styles.actionBtn, ...styles.confirmBtn }} onClick={handleItemSubmit}>
                {editingItemIndex === null ? "Tambah Item" : "Simpan Perubahan"}
              </button>
              <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={resetItemForm}>
                Reset Form
              </button>
            </div>
          </div>

          <div className="admin-list-card" style={styles.itemsListCard}>
            <div style={styles.gameInfoRow}>
              <div>
            <h3 style={styles.formTitle}>{selectedGame?.name || "Pilih Game"}</h3>
                <p style={styles.gameMeta}>
                  {selectedGame ? `${selectedGame.category} - ${selectedGame.dev}` : "Belum ada game dipilih."}
                </p>
              </div>
              <span style={styles.itemCountBadge}>
                {selectedGame?.items.length || 0} item
              </span>
            </div>

            {isLoadingGames && (
              <div style={styles.emptyState}>Memuat item game...</div>
            )}

            {!isLoadingGames && !selectedGame?.items.length && (
              <div style={styles.emptyState}>Belum ada item untuk game ini.</div>
            )}

            {selectedGame?.items.map((item, index) => (
              <div key={`${selectedGameId}-${index}`} style={styles.itemRow}>
                <div>
                  <div style={styles.itemRowTitle}>{item.name}</div>
                  <div style={styles.orderMeta}>Rp {item.price.toLocaleString()}</div>
                </div>
                <div style={styles.rowActions}>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.editBtn }}
                    onClick={() => handleEditItem(item, index)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.deleteBtn }}
                    onClick={() => handleDeleteItem(index)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeSection === "vouchers" && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Kelola Voucher</h2>
            <p style={styles.sectionHint}>Tambah voucher promo baru dan hapus voucher yang sudah tidak dipakai.</p>
          </div>
        </div>

        <div className="admin-items-layout" style={styles.itemsLayout}>
          <div className="admin-form-card" style={styles.itemFormCard}>
            <h3 style={styles.formTitle}>Tambah Voucher</h3>
            <label style={styles.formLabel}>Kode Voucher</label>
            <input
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Contoh: HEMAT50"
              style={styles.textInput}
            />

            <label style={styles.formLabel}>Judul Voucher</label>
            <input
              value={voucherTitle}
              onChange={(e) => setVoucherTitle(e.target.value)}
              placeholder="Contoh: Diskon ML 10%"
              style={styles.textInput}
            />

            <label style={styles.formLabel}>Deskripsi</label>
            <textarea
              value={voucherDescription}
              onChange={(e) => setVoucherDescription(e.target.value)}
              placeholder="Keterangan voucher"
              style={styles.textArea}
            />

            <label style={styles.formLabel}>Game Tujuan</label>
            <select
              value={voucherGameId}
              onChange={(e) => setVoucherGameId(e.target.value)}
              style={styles.selectInputFull}
            >
              <option value="">Semua Game</option>
              {Object.entries(gamesData).map(([gameId, game]) => (
                <option key={gameId} value={gameId}>
                  {game.name}
                </option>
              ))}
            </select>

            <label style={styles.formLabel}>Tipe Diskon</label>
            <select
              value={voucherDiscountType}
              onChange={(e) => setVoucherDiscountType(e.target.value)}
              style={styles.selectInputFull}
            >
              <option value="fixed">Nominal</option>
              <option value="percent">Persen</option>
            </select>

            <label style={styles.formLabel}>Nilai Diskon</label>
            <input
              type="number"
              min="1"
              value={voucherDiscountValue}
              onChange={(e) => setVoucherDiscountValue(e.target.value)}
              placeholder={voucherDiscountType === "percent" ? "Contoh: 10" : "Contoh: 5000"}
              style={styles.textInput}
            />

            <label style={styles.formLabel}>Minimal Order</label>
            <input
              type="number"
              min="0"
              value={voucherMinOrderPrice}
              onChange={(e) => setVoucherMinOrderPrice(e.target.value)}
              placeholder="Contoh: 10000"
              style={styles.textInput}
            />

            <label style={styles.formLabel}>Maksimal Diskon (Opsional)</label>
            <input
              type="number"
              min="1"
              value={voucherMaxDiscount}
              onChange={(e) => setVoucherMaxDiscount(e.target.value)}
              placeholder="Kosongkan jika tidak ada"
              style={styles.textInput}
            />

            <label style={styles.formLabel}>Batas Pemakaian (Opsional)</label>
            <input
              type="number"
              min="1"
              value={voucherUsageLimit}
              onChange={(e) => setVoucherUsageLimit(e.target.value)}
              placeholder="Kosongkan jika tidak ada"
              style={styles.textInput}
            />

            <div style={styles.formActions}>
              <button style={{ ...styles.actionBtn, ...styles.confirmBtn }} onClick={handleVoucherSubmit}>
                Tambah Voucher
              </button>
              <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={resetVoucherForm}>
                Reset Form
              </button>
            </div>
          </div>

          <div className="admin-list-card" style={styles.itemsListCard}>
            <div style={styles.gameInfoRow}>
              <div>
                <h3 style={styles.formTitle}>Daftar Voucher</h3>
                <p style={styles.gameMeta}>Voucher aktif yang tersimpan di database.</p>
              </div>
              <span style={styles.itemCountBadge}>
                {vouchers.length} voucher
              </span>
            </div>

            {isLoadingVouchers && (
              <div style={styles.emptyState}>Memuat voucher...</div>
            )}

            {!isLoadingVouchers && !vouchers.length && (
              <div style={styles.emptyState}>Belum ada voucher tersimpan.</div>
            )}

            {vouchers.map((voucher) => (
              <div key={voucher.id} style={styles.itemRow}>
                <div>
                  <div style={styles.itemRowTitle}>{voucher.code} - {voucher.title}</div>
                  <div style={styles.orderMeta}>
                    {voucher.gameId ? `Game: ${gamesData[voucher.gameId]?.name || voucher.gameId}` : "Semua game"}
                  </div>
                  <div style={styles.orderMeta}>
                    Diskon: {voucher.discountLabel}
                    {voucher.maxDiscount ? ` | Max ${voucher.maxDiscount.toLocaleString()}` : ""}
                  </div>
                  <div style={styles.orderMeta}>
                    Min order: Rp {voucher.minOrderPrice.toLocaleString()}
                    {voucher.usageLimit ? ` | Kuota: ${voucher.usedCount}/${voucher.usageLimit}` : ` | Dipakai: ${voucher.usedCount}`}
                  </div>
                </div>
                <div style={styles.rowActions}>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.deleteBtn }}
                    onClick={() => handleDeleteVoucher(voucher.id, voucher.code)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeSection === "sales" && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Rekap Penjualan</h2>
            <p style={styles.sectionHint}>
              Pantau transaksi selesai, pisahkan berdasarkan periode dan game, lalu export laporan ke PDF.
            </p>
          </div>
          <div style={styles.salesFilterGroup}>
            <select
              value={salesGameFilter}
              onChange={(e) => setSalesGameFilter(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">Semua Game</option>
              {salesGameOptions.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <select
              value={selectedSalesMonth}
              onChange={(e) => {
                setHasTouchedSalesFilter(true);
                setSelectedSalesMonth(e.target.value);
              }}
              style={styles.selectInput}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              value={selectedSalesYear}
              onChange={(e) => {
                setHasTouchedSalesFilter(true);
                setSelectedSalesYear(e.target.value);
              }}
              style={styles.selectInput}
            >
              {salesYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button style={{ ...styles.actionBtn, ...styles.confirmBtn }} onClick={handleExportSalesPdf}>
              Export PDF
            </button>
          </div>
        </div>

        <div style={styles.salesPeriodTabs}>
          {salesRecap.map((recap) => (
            <button
              key={recap.key}
              style={{
                ...styles.salesPeriodTab,
                ...(salesPeriodKey === recap.key ? styles.salesPeriodTabActive : {})
              }}
              onClick={() => setSalesPeriodKey(recap.key)}
            >
              {recap.label}
            </button>
          ))}
        </div>

        <div style={styles.salesRecapGrid}>
          <div style={styles.salesRecapCard}>
            <div style={styles.salesRecapLabel}>Pendapatan Bersih</div>
            <div style={styles.salesRecapRevenue}>{formatCurrency(selectedSalesRecap?.revenue)}</div>
            <div style={styles.salesRecapMeta}>{selectedSalesRecap?.label} | {selectedSalesGameLabel}</div>
          </div>
          <div style={styles.salesRecapCard}>
            <div style={styles.salesRecapLabel}>Transaksi Selesai</div>
            <div style={styles.salesRecapRevenue}>{selectedSalesRecap?.transactionCount || 0}</div>
            <div style={styles.salesRecapMeta}>Order yang sudah dikonfirmasi</div>
          </div>
          <div style={styles.salesRecapCard}>
            <div style={styles.salesRecapLabel}>Rata-rata Order</div>
            <div style={styles.salesRecapRevenue}>{formatCurrency(selectedSalesRecap?.averageOrderValue)}</div>
            <div style={styles.salesRecapMeta}>Nilai rata-rata per transaksi</div>
          </div>
          <div style={styles.salesRecapCard}>
            <div style={styles.salesRecapLabel}>Diskon Voucher</div>
            <div style={{ ...styles.salesRecapRevenue, color: "#ffb3ad" }}>{formatCurrency(selectedSalesRecap?.discount)}</div>
            <div style={styles.salesRecapMeta}>Potongan yang diberikan</div>
          </div>
        </div>

        <div style={styles.salesChartCard}>
          <div style={styles.salesChartHeader}>
            <h3 style={styles.formTitle}>Perbandingan Periode</h3>
            <p style={styles.gameMeta}>Persentase pendapatan dan transaksi untuk filter game yang sedang aktif.</p>
          </div>
          <div style={styles.salesChart}>
            {salesRecap.map((recap) => {
              const barHeight = recap.revenueShare > 0 ? Math.max(4, Math.round((recap.revenueShare / 100) * 160)) : 0;

              return (
                <div key={recap.key} style={styles.salesChartColumn}>
                  <div style={styles.salesChartValue}>{formatCurrency(recap.revenue)}</div>
                  <div style={styles.salesChartPercent}>{recap.revenueShare}% dari seluruh pendapatan</div>
                  <div style={styles.salesChartTrack}>
                    <div
                      style={{
                        ...styles.salesChartBar,
                        height: `${barHeight}px`
                      }}
                    />
                  </div>
                  <div style={styles.salesChartLabel}>{recap.label}</div>
                  <div style={styles.salesChartMeta}>
                    {recap.transactionCount}/{recap.totalTransactionCount} trx | {recap.transactionShare}% transaksi
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-items-layout" style={styles.salesDetailLayout}>
          <div style={styles.salesTableCard}>
            <div style={styles.gameInfoRow}>
              <div>
                <h3 style={styles.formTitle}>Detail Transaksi {selectedSalesRecap?.label}</h3>
                <p style={styles.gameMeta}>
                  {selectedSalesGameLabel} | Total {formatCurrency(selectedSalesRecap?.revenue)} dari {selectedSalesRecap?.transactionCount || 0} transaksi.
                </p>
              </div>
              <span style={styles.itemCountBadge}>
                {selectedSalesOrders.length} transaksi
              </span>
            </div>

            {!selectedSalesOrders.length && (
              <div style={styles.emptyState}>Belum ada transaksi selesai pada filter ini.</div>
            )}

            {selectedSalesOrders.length > 0 && (
              <div style={styles.salesTableWrapper}>
                <table style={styles.salesTable}>
                  <thead>
                    <tr>
                      <th style={styles.salesTableHeader}>Tanggal</th>
                      <th style={styles.salesTableHeader}>ID Pesanan</th>
                      <th style={styles.salesTableHeader}>User</th>
                      <th style={styles.salesTableHeader}>Game</th>
                      <th style={styles.salesTableHeader}>Item</th>
                      <th style={{ ...styles.salesTableHeader, textAlign: "right" }}>Diskon</th>
                      <th style={{ ...styles.salesTableHeader, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSalesOrders.map((order) => (
                      <tr key={`${selectedSalesRecap?.key}-${order.id}`}>
                        <td style={styles.salesTableCell}>{formatDateTime(order.createdAt || order.created_at)}</td>
                        <td style={styles.salesTableCell}>{order.id}</td>
                        <td style={styles.salesTableCell}>{order.username || "Guest"}</td>
                        <td style={styles.salesTableCell}>{order.game}</td>
                        <td style={styles.salesTableCell}>{order.item}</td>
                        <td style={{ ...styles.salesTableCell, textAlign: "right", color: "#ffb3ad" }}>
                          {formatCurrency(order.discountAmount)}
                        </td>
                        <td style={{ ...styles.salesTableCell, textAlign: "right", color: "#8ef7a0", fontWeight: "700" }}>
                          {formatCurrency(order.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={styles.salesTableCard}>
            <div style={styles.gameInfoRow}>
              <div>
                <h3 style={styles.formTitle}>Ranking Game</h3>
                <p style={styles.gameMeta}>Game dengan pendapatan tertinggi pada filter ini.</p>
              </div>
            </div>
            {!topSalesGames.length && (
              <div style={styles.emptyState}>Belum ada data ranking.</div>
            )}
            {topSalesGames.map((game, index) => (
              <div key={game.id} style={styles.salesRankRow}>
                <span style={styles.salesRankNumber}>{index + 1}</span>
                <div style={styles.gameRowContent}>
                  <div style={styles.itemRowTitle}>{game.name}</div>
                  <div style={styles.orderMeta}>{game.transactionCount} transaksi</div>
                </div>
                <strong style={styles.salesRankRevenue}>{formatCurrency(game.revenue)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeSection === "banners" && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Kelola Banner Landing Page</h2>
            <p style={styles.sectionHint}>Unggah gambar banner promosi yang akan berputar di halaman utama.</p>
          </div>
          <span style={styles.itemCountBadge}>
            {banners.length} banner aktif
          </span>
        </div>

        <div className="admin-items-layout" style={styles.itemsLayout}>
          <div className="admin-form-card" style={styles.itemFormCard}>
            <h3 style={styles.formTitle}>{bannerFormId ? "Edit Banner" : "Tambah Banner"}</h3>
            <label style={styles.formLabel}>Gambar Banner</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setBannerFormImage)}
              style={styles.textInput}
            />
            {bannerFormImage && (
              <div style={styles.imagePreviewContainer}>
                <span style={styles.previewLabel}>Preview Banner:</span>
                <img src={bannerFormImage} alt="Preview" style={styles.formImagePreview} />
              </div>
            )}
            <label style={styles.formLabel}>Teks Alternatif (Alt Text)</label>
            <input
              value={bannerFormAlt}
              onChange={(e) => setBannerFormAlt(e.target.value)}
              placeholder="Contoh: Promo Ramadhan MLBB"
              style={styles.textInput}
            />
            <div style={styles.formActions}>
              <button style={{ ...styles.actionBtn, ...styles.confirmBtn }} onClick={handleBannerSubmit}>
                {bannerFormId ? "Simpan Perubahan" : "Tambah Banner"}
              </button>
              <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={resetBannerForm}>
                Reset
              </button>
            </div>
          </div>

          <div className="admin-list-card" style={styles.itemsListCard}>
            <div style={styles.gameInfoRow}>
              <h3 style={styles.formTitle}>Daftar Banner</h3>
            </div>
            {isLoadingBanners && <div style={styles.emptyState}>Memuat data banner...</div>}
            {!isLoadingBanners && !banners.length && <div style={styles.emptyState}>Belum ada banner aktif.</div>}
            {banners.map((banner) => (
              <div key={banner.id} style={styles.itemRow}>
                <img src={banner.image} alt="" style={{...styles.listRowIcon, width: '120px', height: '40px'}} />
                <div style={styles.gameRowContent}>
                  <div style={styles.itemRowTitle}>{banner.alt || "Tanpa keterangan"}</div>
                  <div style={styles.orderMeta}>ID: {banner.id}</div>
                </div>
                <div style={styles.rowActions}>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.editBtn }}
                    onClick={() => handleEditBanner(banner)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.inlineBtn, ...styles.deleteBtn }}
                    onClick={() => handleDeleteBanner(banner.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeSection === "users" && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Akun User</h2>
            <p style={styles.sectionHint}>Lihat daftar akun user yang sudah terdaftar di aplikasi.</p>
          </div>
          <span style={styles.itemCountBadge}>
            {users.length} user
          </span>
        </div>

        <div className="admin-list-card" style={styles.usersListCard}>
          {isLoadingUsers && (
            <div style={styles.emptyState}>Memuat akun user...</div>
          )}

          {!isLoadingUsers && !users.length && (
            <div style={styles.emptyState}>Belum ada akun user terdaftar.</div>
          )}

          {!isLoadingUsers && users.map((user) => (
            <div key={user.id} style={styles.userRow}>
              <div>
                <div style={styles.itemRowTitle}>{user.username}</div>
                <div style={styles.orderMeta}>{user.email}</div>
                <div style={styles.orderMeta}>
                  Terdaftar: {user.createdAt ? new Date(user.createdAt).toLocaleString("id-ID") : "-"}
                </div>
              </div>
              <div style={styles.userRowActions}>
                <span
                  style={{
                    ...styles.userStatusBadge,
                    ...(user.hasActiveSession ? styles.userStatusOnline : styles.userStatusOffline)
                  }}
                >
                  {user.hasActiveSession ? "Sedang login" : "Tidak login"}
                </span>
                <button
                  style={{ ...styles.inlineBtn, ...styles.deleteBtn }}
                  onClick={() => handleDeleteUser(user.id, user.username)}
                >
                  Hapus Akun
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {activeSection === "admins" && isSuperAdmin && (
      <div style={styles.itemsSection}>
        <div style={styles.itemsHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Kelola Admin</h2>
            <p style={styles.sectionHint}>Tambah admin operasional baru dan hapus admin yang sudah tidak dipakai.</p>
          </div>
          <span style={styles.itemCountBadge}>
            {admins.length} admin
          </span>
        </div>

        <div className="admin-items-layout" style={styles.itemsLayout}>
          <div className="admin-form-card" style={styles.itemFormCard}>
            <h3 style={styles.formTitle}>Tambah Admin</h3>
            <p style={styles.formHelperText}>
              Admin baru tidak bisa mengakses kelola user dan kelola admin.
            </p>
            <label style={styles.formLabel}>Nama Admin</label>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Contoh: Admin Operasional"
              style={styles.textInput}
            />
            <label style={styles.formLabel}>Email Admin</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Contoh: admin2@sirr18store.com"
              style={styles.textInput}
            />
            <label style={styles.formLabel}>Password Admin</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              style={styles.textInput}
            />
            <div style={styles.formActions}>
              <button style={{ ...styles.actionBtn, ...styles.confirmBtn }} onClick={handleAdminSubmit}>
                Tambah Admin
              </button>
              <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={resetAdminForm}>
                Reset Form
              </button>
            </div>
          </div>

          <div className="admin-list-card" style={styles.usersListCard}>
            {isLoadingAdmins && (
              <div style={styles.emptyState}>Memuat akun admin...</div>
            )}

            {!isLoadingAdmins && !admins.length && (
              <div style={styles.emptyState}>Belum ada akun admin tambahan.</div>
            )}

            {!isLoadingAdmins && admins.map((admin) => (
              <div key={admin.id} style={styles.userRow}>
                <div>
                  <div style={styles.itemRowTitle}>{admin.name}</div>
                  <div style={styles.orderMeta}>{admin.email}</div>
                  <div style={styles.orderMeta}>
                    Dibuat: {admin.createdAt ? new Date(admin.createdAt).toLocaleString("id-ID") : "-"}
                  </div>
                </div>
                <div style={styles.userRowActions}>
                  <span
                    style={{
                      ...styles.roleBadge,
                      ...(admin.role === "super_admin" ? styles.roleBadgeSuper : styles.roleBadgeAdmin)
                    }}
                  >
                    {admin.role === "super_admin" ? "Admin utama" : "Admin operasional"}
                  </span>
                  <span
                    style={{
                      ...styles.userStatusBadge,
                      ...(admin.hasActiveSession ? styles.userStatusOnline : styles.userStatusOffline)
                    }}
                  >
                    {admin.hasActiveSession ? "Sedang login" : "Tidak login"}
                  </span>
                  {admin.role !== "super_admin" && (
                    <button
                      style={{ ...styles.inlineBtn, ...styles.deleteBtn }}
                      onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                    >
                      Hapus Admin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#14182b",
    color: "white",
    padding: "24px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
    paddingBottom: "20px",
    borderBottom: "1px solid #2b355b"
  },
  headerMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
    flexWrap: "wrap"
  },
  headerMetaText: {
    color: "#d7def5",
    fontWeight: "600"
  },
  accessBadge: {
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid transparent"
  },
  accessBadgeSuper: {
    background: "rgba(76, 175, 80, 0.16)",
    color: "#9df5a1",
    border: "1px solid rgba(76, 175, 80, 0.38)"
  },
  accessBadgeAdmin: {
    background: "rgba(25, 118, 210, 0.18)",
    color: "#b8d8ff",
    border: "1px solid rgba(25, 118, 210, 0.35)"
  },
  title: {
    margin: 0,
    fontSize: "32px"
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#aab6df"
  },
  dashboardShell: {
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: "24px",
    alignItems: "stretch"
  },
  sidebar: {
    alignSelf: "stretch",
    display: "flex"
  },
  mainContent: {
    minWidth: 0
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  },
  imagePreviewContainer: {
    marginBottom: "14px",
    padding: "10px",
    background: "#10172f",
    borderRadius: "10px",
    border: "1px solid #2b355b"
  },
  previewLabel: {
    display: "block",
    fontSize: "11px",
    color: "#aab6df",
    marginBottom: "8px"
  },
  formImagePreview: {
    width: "100%",
    height: "100px",
    objectFit: "cover",
    borderRadius: "6px"
  },
  formIconPreview: {
    width: "50px",
    height: "50px",
    objectFit: "cover",
    borderRadius: "6px"
  },
  formPosterPreview: {
    width: "80px",
    height: "110px",
    objectFit: "cover",
    borderRadius: "6px"
  },
  listRowIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "1px solid #334071"
  },
  sectionCard: {
    background: "#1f2747",
    borderRadius: "14px",
    padding: "16px 20px",
    border: "1px solid #2f3a67",
    marginBottom: "24px"
  },
  optionsCard: {
    background: "#1f2747",
    borderRadius: "14px",
    padding: "16px 20px",
    border: "1px solid #2f3a67",
    marginBottom: "24px",
    minHeight: "calc(100vh - 48px)",
    width: "100%",
    position: "sticky",
    top: "24px",
    display: "flex",
    flexDirection: "column"
  },
  optionsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%"
  },
  optionButton: {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "1px solid transparent",
    color: "white",
    cursor: "pointer",
    fontWeight: "700",
    width: "100%",
    textAlign: "left"
  },
  optionButtonPrimary: {
    background: "#4CAF50"
  },
  optionButtonSecondary: {
    background: "#1976d2"
  },
  optionButtonAccent: {
    background: "#f57c00"
  },
  optionButtonSuccess: {
    background: "#2e7d32"
  },
  optionButtonInfo: {
    background: "#7b5cff"
  },
  optionButtonDanger: {
    background: "#c62828"
  },
  optionButtonMuted: {
    background: "#24335d",
    border: "1px solid #334071"
  },
  sectionTitle: {
    margin: "0 0 8px 0"
  },
  sectionHint: {
    margin: "0 0 18px 0",
    color: "#aab6df"
  },
  statCard: {
    background: "#1f2747",
    padding: "20px",
    borderRadius: "14px",
    textAlign: "center",
    border: "1px solid #2f3a67",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  statNumber: {
    fontSize: "2.2rem",
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: "6px"
  },
  salesRecapSection: {
    background: "#1f2747",
    borderRadius: "14px",
    padding: "18px 20px",
    border: "1px solid #2f3a67",
    marginBottom: "24px"
  },
  salesRecapHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  salesRecapTitle: {
    margin: "0 0 6px 0",
    color: "white"
  },
  salesRecapHint: {
    margin: 0,
    color: "#aab6df",
    lineHeight: 1.5
  },
  salesRecapGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px"
  },
  salesFilterGroup: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  salesPeriodTabs: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "18px"
  },
  salesPeriodTab: {
    border: "1px solid #334071",
    background: "#182042",
    color: "#d7def5",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: "700",
    cursor: "pointer"
  },
  salesPeriodTabActive: {
    background: "#4CAF50",
    borderColor: "#4CAF50",
    color: "#ffffff"
  },
  salesRecapCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #334071"
  },
  salesRecapLabel: {
    color: "#aab6df",
    fontSize: "13px",
    marginBottom: "10px"
  },
  salesRecapRevenue: {
    color: "#8ef7a0",
    fontSize: "24px",
    fontWeight: "800",
    marginBottom: "8px"
  },
  salesRecapMeta: {
    color: "#d7def5",
    fontSize: "13px"
  },
  salesChartCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071",
    marginTop: "18px"
  },
  salesChartHeader: {
    marginBottom: "18px"
  },
  salesChart: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "18px",
    alignItems: "end",
    minHeight: "240px"
  },
  salesChartColumn: {
    display: "grid",
    gap: "10px",
    justifyItems: "center",
    alignSelf: "end"
  },
  salesChartValue: {
    color: "#d7def5",
    fontSize: "13px",
    fontWeight: "700",
    textAlign: "center"
  },
  salesChartPercent: {
    color: "#8ef7a0",
    fontSize: "12px",
    fontWeight: "800",
    textAlign: "center"
  },
  salesChartTrack: {
    width: "100%",
    maxWidth: "120px",
    height: "170px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    borderRadius: "12px",
    background: "#10172f",
    padding: "10px",
    border: "1px solid #2b355b"
  },
  salesChartBar: {
    width: "100%",
    borderRadius: "10px 10px 4px 4px",
    background: "linear-gradient(180deg, #8ef7a0 0%, #4CAF50 100%)"
  },
  salesChartLabel: {
    color: "#aab6df",
    fontSize: "13px",
    fontWeight: "700",
    textAlign: "center"
  },
  salesChartMeta: {
    color: "#d7def5",
    fontSize: "12px",
    textAlign: "center"
  },
  salesTableCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071",
    marginTop: "18px"
  },
  salesPeriodList: {
    display: "grid",
    gap: "18px",
    marginTop: "18px"
  },
  salesDetailLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
    gap: "18px",
    marginTop: "18px",
    alignItems: "start"
  },
  salesTableWrapper: {
    width: "100%",
    overflowX: "auto"
  },
  salesTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "860px"
  },
  salesTableHeader: {
    color: "#aab6df",
    fontSize: "13px",
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #334071",
    whiteSpace: "nowrap"
  },
  salesTableCell: {
    color: "#ffffff",
    fontSize: "13px",
    padding: "12px 10px",
    borderBottom: "1px solid #2b355b",
    verticalAlign: "top"
  },
  salesRankRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #2b355b"
  },
  salesRankNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: "#24335d",
    color: "#8ef7a0",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    flexShrink: 0
  },
  salesRankRevenue: {
    color: "#8ef7a0",
    whiteSpace: "nowrap"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "20px"
  },
  itemsSection: {
    background: "#1f2747",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #2f3a67"
  },
  itemsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  sectionSubtitle: {
    margin: "6px 0 0 0",
    color: "#aab6df"
  },
  itemsLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 360px) 1fr",
    gap: "20px"
  },
  ordersPanel: {
    background: "#1f2747",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #2f3a67",
    alignSelf: "start"
  },
  detailPanel: {
    background: "#1f2747",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #2f3a67"
  },
  panelTitle: {
    margin: "0 0 16px 0"
  },
  itemFormCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071",
    alignSelf: "start"
  },
  itemsListCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071"
  },
  usersListCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071"
  },
  formTitle: {
    margin: "0 0 16px 0"
  },
  formHelperText: {
    margin: "0 0 16px 0",
    color: "#aab6df",
    lineHeight: 1.5,
    fontSize: "13px"
  },
  formLabel: {
    display: "block",
    color: "#aab6df",
    marginBottom: "8px",
    fontSize: "14px"
  },
  itemNameGroup: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "14px",
    flexWrap: "wrap"
  },
  suffixBadge: {
    background: "#24335d",
    color: "#8ef7a0",
    border: "1px solid #334071",
    borderRadius: "10px",
    padding: "12px 14px",
    fontWeight: "600",
    minWidth: "96px",
    textAlign: "center"
  },
  previewHint: {
    margin: "8px 0 14px 0",
    color: "#8ef7a0",
    fontSize: "13px"
  },
  textInput: {
    width: "100%",
    background: "#10172f",
    color: "white",
    border: "1px solid #334071",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "14px",
    boxSizing: "border-box"
  },
  disabledInput: {
    opacity: 0.7,
    cursor: "not-allowed"
  },
  selectInput: {
    background: "#182042",
    color: "white",
    border: "1px solid #334071",
    borderRadius: "10px",
    padding: "12px 14px",
    minWidth: "220px"
  },
  selectInputFull: {
    width: "100%",
    background: "#10172f",
    color: "white",
    border: "1px solid #334071",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "14px",
    boxSizing: "border-box"
  },
  formActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "8px"
  },
  orderItem: {
    width: "100%",
    textAlign: "left",
    background: "#182042",
    color: "white",
    border: "1px solid #334071",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "12px",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
  },
  orderItemActive: {
    border: "1px solid #4CAF50",
    background: "#203056"
  },
  orderTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "8px"
  },
  orderMeta: {
    color: "#aab6df",
    fontSize: "13px",
    marginTop: "4px"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "72px",
    whiteSpace: "nowrap",
    textTransform: "capitalize"
  },
  badgeSuccess: {
    background: "#2e7d32"
  },
  badgeWarning: {
    background: "#f57c00"
  },
  badgeDanger: {
    background: "#c62828"
  },
  detailCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071",
    marginBottom: "18px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "10px 0",
    borderBottom: "1px solid #2b355b"
  },
  infoLabel: {
    color: "#aab6df"
  },
  infoValue: {
    textAlign: "right",
    fontWeight: "500"
  },
  proofCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #334071",
    marginBottom: "18px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  proofTitle: {
    margin: "0 0 6px 0"
  },
  reasonBox: {
    marginTop: "18px",
    padding: "14px",
    borderRadius: "10px",
    background: "rgba(244, 67, 54, 0.12)",
    border: "1px solid rgba(244, 67, 54, 0.35)"
  },
  reasonTitle: {
    color: "#ffb3ad",
    fontWeight: "700",
    marginBottom: "8px"
  },
  reasonText: {
    color: "#ffe3df",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap"
  },
  proofName: {
    color: "#aab6df",
    margin: "0 0 14px 0"
  },
  proofImage: {
    width: "100%",
    maxHeight: "420px",
    objectFit: "contain",
    background: "#10172f",
    borderRadius: "12px"
  },
  actions: {
    display: "grid",
    gap: "12px",
    flexWrap: "wrap"
  },
  rejectReasonCard: {
    background: "#182042",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #334071"
  },
  textArea: {
    width: "100%",
    minHeight: "96px",
    resize: "vertical",
    background: "#10172f",
    color: "white",
    border: "1px solid #334071",
    borderRadius: "10px",
    padding: "12px 14px",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  actionBtn: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  },
  confirmBtn: {
    background: "#4CAF50"
  },
  rejectBtn: {
    background: "#f44336"
  },
  secondaryBtn: {
    background: "#45537d"
  },
  editBtn: {
    background: "#1976d2"
  },
  deleteBtn: {
    background: "#c62828"
  },
  disabledBtn: {
    opacity: 0.6,
    cursor: "not-allowed"
  },
  emptyState: {
    background: "#182042",
    border: "1px dashed #334071",
    borderRadius: "12px",
    padding: "20px",
    color: "#aab6df"
  },
  gameInfoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid #2b355b",
    flexWrap: "wrap"
  },
  gameMeta: {
    margin: 0,
    color: "#aab6df"
  },
  itemCountBadge: {
    background: "#24335d",
    color: "#d7def5",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px"
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #2b355b",
    flexWrap: "wrap"
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #2b355b",
    flexWrap: "wrap"
  },
  itemRowTitle: {
    fontWeight: "600",
    marginBottom: "4px"
  },
  gameRowContent: {
    minWidth: 0,
    flex: "1 1 260px"
  },
  userStatusBadge: {
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "700"
  },
  roleBadge: {
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "700"
  },
  roleBadgeSuper: {
    background: "rgba(76, 175, 80, 0.16)",
    color: "#9df5a1",
    border: "1px solid rgba(76, 175, 80, 0.38)"
  },
  roleBadgeAdmin: {
    background: "rgba(255, 152, 0, 0.16)",
    color: "#ffd494",
    border: "1px solid rgba(255, 152, 0, 0.35)"
  },
  userStatusOnline: {
    background: "rgba(76, 175, 80, 0.18)",
    color: "#9df5a1",
    border: "1px solid rgba(76, 175, 80, 0.45)"
  },
  userStatusOffline: {
    background: "rgba(120, 132, 170, 0.18)",
    color: "#d7def5",
    border: "1px solid rgba(120, 132, 170, 0.35)"
  },
  userRowActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end"
  },
  rowActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  inlineBtn: {
    border: "none",
    color: "white",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600"
  }
};

export default AdminDashboard;
