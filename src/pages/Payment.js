import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createOrder, isUserAuthenticated, fetchUserOrders } from "../api/client";
import { getGameIcon } from "../data/gameCatalog";
import { GAMES_CHANGE_EVENT, getStoredGames, refreshGames } from "../data/gameStore";
import { saveLastTransaction } from "../data/lastTransactionStore";
import { showErrorAlert, showValidationAlert, showSuccessAlert } from "../utils/authToast";

const MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PROOF_IMAGE_DIMENSION = 1600;
const COMPRESSED_IMAGE_QUALITY_STEPS = [0.82, 0.72, 0.6, 0.5];

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [proofFileName, setProofFileName] = useState("");
  const [proofPreview, setProofPreview] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState(() => {
    const saved = localStorage.getItem("sirr18_last_submitted_order");
    return saved ? JSON.parse(saved) : null;
  });
  const [hoveredPanel, setHoveredPanel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (submittedOrder) {
      localStorage.setItem("sirr18_last_submitted_order", JSON.stringify(submittedOrder));
    } else {
      localStorage.removeItem("sirr18_last_submitted_order");
    }
  }, [submittedOrder]);

  useEffect(() => {
    if (!submittedOrder || submittedOrder.status !== "pending") {
      return undefined;
    }

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const orders = await fetchUserOrders();
        if (isMounted) {
          const latestStatus = orders.find((o) => o.id === submittedOrder.id);
          if (latestStatus && latestStatus.status !== submittedOrder.status) {
            setSubmittedOrder(latestStatus);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi status pesanan:", err);
      }
    };

    const intervalId = window.setInterval(checkStatus, 8000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [submittedOrder]);

  useEffect(() => {
    const data = location.state;
    const isPaymentPath = location.pathname === "/payment";

    // Jika masuk ke rute payment dengan data baru dari DetailGame
    if (isPaymentPath && data && !isSubmitting) {
      // Hapus status pesanan lama jika ada, agar form pembayaran baru bisa muncul
      if (submittedOrder) {
        setSubmittedOrder(null);
      }

      const game = gamesData[data.gameId];
      const selectedItem = game?.items?.[data.itemIndex];

      if (game) {
        const fallbackPrice = selectedItem?.price || data.originalPrice || data.price || 0;
        const discountAmount = data.discountAmount || data.appliedVoucher?.discountAmount || 0;
        const finalPrice = data.price || data.appliedVoucher?.finalPrice || fallbackPrice;

        setGameData({
          ...game,
          gameId: data.gameId,
          item: selectedItem || {
            id: data.itemId || null,
            name: data.itemName || "Item tidak tersedia",
            price: fallbackPrice
          },
          originalPrice: fallbackPrice,
          discountAmount,
          finalPrice,
          appliedVoucher: data.appliedVoucher || null,
          paymentMethod: data.paymentMethod || "DANA",
          customerId: data.customerId || "",
          customerPhone: data.customerPhone || "",
          customerVoucher: data.customerVoucher || "",
          mlServer: data.mlServer || "",
          server: data.server || ""
        });
      }
    } 
    
    // Hanya arahkan balik jika di /payment tapi tidak ada data transaksi sama sekali
    else if (isPaymentPath && !data && !submittedOrder && !isSubmitting) {
      navigate("/", { replace: true });
    }
  }, [gamesData, isSubmitting, location.pathname, location.state, navigate, submittedOrder]);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText("081234567890");
    showSuccessAlert("Nomor berhasil disalin!");
  };

  const isStatusPage = location.pathname === "/payment-confirmation";

  useEffect(() => {
    // Prioritaskan pengambilan data dari state navigasi agar tidak ada delay, baru cek localStorage
    if (isStatusPage && !submittedOrder) {
      const navState = location.state;
      const saved = localStorage.getItem("sirr18_last_submitted_order");

      if (navState && navState.fromPayment) {
        setSubmittedOrder(navState);
      } else if (saved) {
        setSubmittedOrder(JSON.parse(saved));
      } else {
        navigate("/");
      }
    }
  }, [isStatusPage, submittedOrder, navigate, location.state]);

  const handlePrint = () => window.print();

  if (!gameData && !submittedOrder && !isStatusPage) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

  const originalPrice = gameData ? Number(gameData.originalPrice || gameData.item.price || 0) : 0;
  const discountAmount = gameData ? Number(gameData.discountAmount || 0) : 0;
  const totalPrice = gameData ? Number(gameData.finalPrice || originalPrice) : 0;
  const isQrisPayment = gameData ? gameData.paymentMethod === "QRIS" : false;
  const showsServer = gameData ? (gameData.gameId === "ml" || gameData.gameId === "genshin") : false;

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.readAsDataURL(file);
    });

  const loadImageFromDataUrl = (dataUrl) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gambar bukti tidak bisa dibuka."));
      image.src = dataUrl;
    });

  const getDataUrlByteSize = (dataUrl) => {
    const parts = dataUrl.split(",");
    const base64 = parts[1] || "";
    const padding = (base64.match(/=*$/)?.[0].length || 0);
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  };

  const compressProofImage = async (file) => {
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImageFromDataUrl(originalDataUrl);
    const scale = Math.min(
      1,
      MAX_PROOF_IMAGE_DIMENSION / image.width,
      MAX_PROOF_IMAGE_DIMENSION / image.height
    );
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Browser tidak mendukung kompresi gambar.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (const quality of COMPRESSED_IMAGE_QUALITY_STEPS) {
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      if (getDataUrlByteSize(compressedDataUrl) <= MAX_PROOF_IMAGE_BYTES) {
        return compressedDataUrl;
      }
    }

    throw new Error("Ukuran bukti pembayaran terlalu besar. Gunakan gambar di bawah 5 MB.");
  };

  const handleProofChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setProofFileName("");
      setProofPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showValidationAlert("File tidak sesuai", "Upload file gambar untuk bukti pembayaran.");
      e.target.value = "";
      setProofFileName("");
      setProofPreview("");
      return;
    }

    try {
      const imageDataUrl = await compressProofImage(file);
      setProofFileName(file.name);
      setProofPreview(imageDataUrl);
    } catch (error) {
      showErrorAlert("Bukti pembayaran gagal diproses", error.message || "File bukti gagal diproses.");
      e.target.value = "";
      setProofFileName("");
      setProofPreview("");
    }
  };

  const handlePay = async () => {
    if (!isUserAuthenticated()) {
      showValidationAlert("Login dibutuhkan", "Silakan login user terlebih dahulu agar status verifikasi bisa muncul di akun kamu.");
      return;
    }

    if (!proofPreview) {
      showValidationAlert("Bukti pembayaran belum ada", "Upload foto bukti pembayaran terlebih dahulu.");
      return;
    }

    try {
      setIsSubmitting(true);
      const orderPayload = {
        game: gameData.name,
        gameId: gameData.gameId,
        itemId: gameData.item.id || location.state?.itemId || null,
        item: gameData.item.name,
        price: totalPrice,
        originalPrice: originalPrice,
        discountAmount: discountAmount,
        customerId: gameData.customerId,
        customerPhone: gameData.customerPhone,
        customerVoucher: gameData.appliedVoucher?.code || gameData.customerVoucher,
        server: gameData.mlServer || gameData.server || "-",
        paymentMethod: gameData.paymentMethod,
        proofImage: proofPreview,
        proofFileName
      };

      const orderResponse = await createOrder(orderPayload);

      // Gabungkan data input dengan respon server agar struk lengkap
      const fullOrderData = {
        ...orderPayload,
        ...orderResponse,
        id: orderResponse.id || Date.now().toString(),
        status: orderResponse.status || "pending",
        createdAt: orderResponse.createdAt || new Date().toISOString()
      };

      // Simpan instan ke localStorage sebelum navigasi
      localStorage.setItem("sirr18_last_submitted_order", JSON.stringify(fullOrderData));
      setSubmittedOrder(fullOrderData);

      saveLastTransaction(gameData.gameId, {
        customerId: gameData.customerId,
        customerPhone: gameData.customerPhone,
        paymentMethod: gameData.paymentMethod,
        mlServer: gameData.mlServer,
        server: gameData.server
      });

      // Kirim data lengkap melalui state agar halaman konfirmasi bisa langsung merender tanpa menunggu sync storage
      navigate("/payment-confirmation", { 
        replace: true, 
        state: { ...fullOrderData, fromPayment: true } 
      });
    } catch (error) {
      showErrorAlert("Pembayaran gagal dikirim", error.message || "Gagal mengirim pembayaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="payment-page" style={styles.container}>
      <div className="payment-page__content" style={styles.content}>
        <h1 style={styles.title}>{isStatusPage ? "Status Verifikasi" : "Konfirmasi Pembayaran"}</h1>

        {isStatusPage && submittedOrder && (
          <div
            style={{
              ...styles.receiptCard,
              transform: hoveredPanel === "success" ? "translateY(-5px)" : "translateY(0)",
              opacity: 1,
              animation: "fadeInReceipt 0.5s ease-out forwards"
            }}
            onMouseEnter={() => setHoveredPanel("success")}
            onMouseLeave={() => setHoveredPanel("")}
          >
            <div style={styles.receiptHeader}>
              <img src="/assets/logo.png" alt="Logo" style={styles.receiptLogo} />
              <div style={styles.receiptType}>OFFICIAL DIGITAL RECEIPT</div>
            </div>
            
            <div style={styles.statusHeader}>
              <div style={{
                ...styles.statusIconLarge,
                background: submittedOrder.status === "rejected" ? "rgba(244, 67, 54, 0.1)" : 
                            submittedOrder.status === "completed" ? "rgba(124, 255, 131, 0.1)" : 
                            "rgba(255, 209, 102, 0.1)",
                color: submittedOrder.status === "rejected" ? "#ff9b92" : (submittedOrder.status === "completed" ? "#7CFF83" : "#ffd166")
              }}>
                {submittedOrder.status === "completed" ? "✓" : submittedOrder.status === "rejected" ? "✕" : "⏳"}
              </div>
              <h2 style={{...styles.successTitle, color: submittedOrder.status === 'completed' ? '#7CFF83' : (submittedOrder.status === 'rejected' ? '#ff9b92' : '#ffd166')}}>
                {submittedOrder.status === "completed" ? "Transaksi Berhasil" :
                 submittedOrder.status === "rejected" ? "Transaksi Gagal" :
                 "Menunggu Verifikasi"}
              </h2>
            </div>
            <p style={styles.successText}>
              {submittedOrder.status === 'completed'
                ? 'Terima kasih! Pesanan Anda telah berhasil diproses.'
                : submittedOrder.status === 'rejected'
                ? 'Maaf, pesanan Anda tidak dapat diproses saat ini.'
                : 'Pesanan kamu sudah masuk ke sistem dan sekarang sedang menunggu respon admin.'}
            </p>

            <div style={styles.receiptGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>ID Pesanan</span>
                <span style={{...styles.infoValue, color: '#9df5a1', fontFamily: 'monospace'}}>{submittedOrder.id}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Tanggal</span>
                <span style={styles.infoValue}>{new Date(submittedOrder.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Status</span>
                <span style={{
                  ...styles.pendingText,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: submittedOrder.status === "completed" ? 'rgba(124, 255, 131, 0.1)' : (submittedOrder.status === "rejected" ? 'rgba(255, 155, 146, 0.1)' : 'rgba(255, 209, 102, 0.1)'),
                  color: submittedOrder.status === "completed" ? "#7CFF83" : (submittedOrder.status === "rejected" ? "#ff9b92" : "#ffd166"),
                  fontSize: '11px',
                  letterSpacing: '1px'
                }}>
                  ● {submittedOrder.status === "completed" ? "VERIFIED" : (submittedOrder.status === "rejected" ? "REJECTED" : "PENDING")}
                </span>
              </div>
            </div>

            <div style={styles.receiptDivider} />

            <div style={styles.receiptSection}>
              <h4 style={styles.receiptSectionTitle}>🎮 Detail Layanan</h4>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Game</span>
                <span style={{...styles.infoValue, color: 'white'}}>{submittedOrder.game}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Item</span>
                <span style={{...styles.infoValue, color: '#ffd166', fontWeight: 'bold'}}>{submittedOrder.item}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>ID Customer</span>
                <span style={{...styles.infoValue, fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px'}}>{submittedOrder.customerId} {submittedOrder.server && submittedOrder.server !== '-' ? `(${submittedOrder.server})` : ''}</span>
              </div>
            </div>

            <div style={styles.receiptDivider} />

            <div style={styles.receiptSection}>
              <h4 style={styles.receiptSectionTitle}>💰 Rincian Pembayaran</h4>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Harga Layanan</span>
                <span style={styles.infoValue}>Rp {Number(submittedOrder.originalPrice || 0).toLocaleString('id-ID')}</span>
              </div>
              {submittedOrder.discountAmount > 0 && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Diskon Voucher ({submittedOrder.customerVoucher})</span>
                  <span style={{...styles.infoValue, color: '#ff9b92'}}>-Rp {Number(submittedOrder.discountAmount).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={{...styles.infoLabel, fontWeight: '700', color: 'white'}}>Total Bayar</span>
                <span style={{...styles.infoValue, color: '#7CFF83', fontWeight: '800', fontSize: '20px'}}>
                  Rp {Number(submittedOrder.price).toLocaleString('id-ID')}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Metode Bayar</span>
                <span style={styles.infoValue}>{submittedOrder.paymentMethod}</span>
              </div>
            </div>

            {submittedOrder.status === "rejected" && submittedOrder.rejectionReason && (
              <div style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(244, 67, 54, 0.12)",
                border: "1px solid rgba(244, 67, 54, 0.3)",
                color: "#ffd1cb",
                fontSize: "13px",
                lineHeight: 1.5,
                textAlign: 'center',
                marginBottom: '10px'
              }}>
                <strong>Alasan ditolak:</strong> {submittedOrder.rejectionReason}
              </div>
            )}

            <div style={{...styles.successActions, gridTemplateColumns: (submittedOrder.status === 'completed') ? '1fr' : '1fr 1fr'}}>
              {submittedOrder.status !== 'completed' && (
                <button
                  style={{
                    ...styles.payButton, 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    marginTop: 0,
                    fontSize: '14px',
                    padding: '12px',
                    boxShadow: 'none',
                    gridColumn: submittedOrder.status === 'rejected' ? 'span 2' : 'auto'
                  }}
                  onClick={() => {
                    setSubmittedOrder(null);
                    setProofFileName("");
                    setProofPreview("");
                    navigate("/payment", { replace: true });
                  }}
                >
                  Upload Ulang
                </button>
              )}
              
              <button
                style={{ ...styles.payButton, marginTop: 0, fontSize: '14px', padding: '12px' }}
                onClick={() => {
                  setSubmittedOrder(null);
                  navigate('/');
                }}
              >
                {submittedOrder.status === 'completed' ? 'Belanja Produk Lain' : 'Kembali'}
              </button>

              <button 
                onClick={handlePrint}
                className="no-print"
                style={{
                  gridColumn: 'span 2',
                  background: 'none',
                  border: 'none',
                  color: '#aab6df',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: '15px'
                }}
              >
                Cetak Resi Digital
              </button>
            </div>
          </div>
        )}

        {!isStatusPage && isSubmitting && (
          <div style={styles.loadingContainer}>
            <div style={styles.processingText}>Mengirim Bukti Pembayaran...</div>
            <p style={{ color: '#aab6df' }}>Mohon tunggu sebentar, pesanan Anda sedang didaftarkan.</p>
          </div>
        )}

        {!isStatusPage && !isSubmitting && gameData && (
          <>
            <div className="payment-columns" style={styles.columns}>
              <div className="payment-main-column" style={styles.mainColumn}>
                <div
                  className="payment-summary-card"
                  style={{
                    ...styles.summaryCard,
                    transform: hoveredPanel === "summary" ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: hoveredPanel === "summary" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
                  }}
                  onMouseEnter={() => setHoveredPanel("summary")}
                  onMouseLeave={() => setHoveredPanel("")}
                >
                  <img src={getGameIcon(gameData.gameId, gamesData)} alt={gameData.name} style={styles.gameIcon} />
                  <div>
                    <h2 style={styles.gameName}>{gameData.name}</h2>
                    <p style={styles.itemName}>{gameData.item.name}</p>
                    {discountAmount > 0 && (
                      <div style={{...styles.discountInfo, borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px'}}>
                        <span style={styles.discountText}>
                          Voucher {gameData.appliedVoucher?.code || gameData.customerVoucher}
                        </span>
                        <span style={styles.discountText}>
                          -Rp {discountAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div style={styles.priceRow}>
                      <span style={styles.totalLabel}>
                        {discountAmount > 0 ? "Total Akhir:" : "Total:"}
                      </span>
                      <span style={styles.totalPrice}>Rp {totalPrice.toLocaleString()}</span>
                    </div>
                    {discountAmount > 0 && (
                      <p style={styles.originalPriceText}>
                        Harga awal Rp {originalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    ...styles.customerCard,
                    transform: hoveredPanel === "customer" ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: hoveredPanel === "customer" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
                  }}
                  onMouseEnter={() => setHoveredPanel("customer")}
                  onMouseLeave={() => setHoveredPanel("")}
                >
                  <h3 style={styles.sectionTitle}>Data Customer</h3>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Game ID:</span>
                    <span style={styles.infoValue}>{gameData.customerId}</span>
                  </div>
                  {showsServer && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Server:</span>
                      <span style={styles.infoValue}>{gameData.mlServer || gameData.server || "-"}</span>
                    </div>
                  )}
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Nomor HP:</span>
                    <span style={styles.infoValue}>{gameData.customerPhone}</span>
                  </div>
                  {gameData.customerVoucher && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Voucher:</span>
                      <span style={styles.infoValue}>{gameData.customerVoucher}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Diskon:</span>
                      <span style={styles.infoValue}>-Rp {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="payment-side-column" style={styles.sideColumn}>
                <div
                  style={{
                    ...styles.paymentCard,
                    transform: hoveredPanel === "payment" ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: hoveredPanel === "payment" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
                  }}
                  onMouseEnter={() => setHoveredPanel("payment")}
                  onMouseLeave={() => setHoveredPanel("")}
                >
                  <h3 style={styles.sectionTitle}>{gameData.paymentMethod}</h3>
                  <div style={styles.paymentInfo}>
                    <img
                      src={
                        gameData.paymentMethod === "DANA"
                          ? "/assets/Dana_logo.png"
                          : gameData.paymentMethod === "GOPAY"
                            ? "/assets/Gopay_logo.png"
                            : gameData.paymentMethod === "OVO"
                              ? "/assets/ovo_logo.png"
                              : "/assets/qris_logo.png"
                      }
                      alt={gameData.paymentMethod}
                      style={styles.paymentLogo}
                    />
                    {isQrisPayment ? (
                      <>
                        <p>Scan barcode QRIS berikut untuk melakukan pembayaran.</p>
                        <img
                          src="/assets/qris_barcode.png"
                          alt="QRIS Barcode"
                          style={styles.qrisBarcode}
                        />
                      </>
                    ) : (
                      <div style={styles.transferBox}>
                        <p style={{margin: '0 0 5px 0', fontSize: '13px', opacity: 0.8}}>Transfer ke nomor tujuan:</p>
                        <div style={styles.numberRow}>
                          <strong style={{fontSize: '18px', letterSpacing: '1px'}}>0812-3456-7890</strong>
                          <button onClick={handleCopyNumber} style={styles.copyBtn}>Salin</button>
                        </div>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <p>Harga awal: <strong>Rp {originalPrice.toLocaleString()}</strong></p>
                    )}
                    <p>Jumlah: <strong>Rp {totalPrice.toLocaleString()}</strong></p>
                    <p style={styles.note}>Setelah transfer, upload foto bukti pembayaran di bawah ini.</p>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.uploadCard,
                    transform: hoveredPanel === "upload" ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: hoveredPanel === "upload" ? "0 0 22px rgba(111, 155, 255, 0.28)" : "none"
                  }}
                  onMouseEnter={() => setHoveredPanel("upload")}
                  onMouseLeave={() => setHoveredPanel("")}
                >
                  <h3 style={styles.sectionTitle}>Upload Bukti Transfer</h3>
                  <label htmlFor="payment-proof" style={styles.uploadBox}>
                    <span style={styles.uploadTitle}>Pilih foto bukti pembayaran</span>
                    <span style={styles.uploadSubtitle}>Format gambar: JPG, PNG, WEBP. Maksimal 5 MB.</span>
                    <input id="payment-proof" type="file" accept="image/*" style={styles.hiddenInput} onChange={handleProofChange} />
                  </label>

                  {proofFileName && (
                    <p style={styles.fileName}>File terpilih: {proofFileName}</p>
                  )}

                  {proofPreview && (
                    <img src={proofPreview} alt="Preview bukti pembayaran" style={styles.previewImage} />
                  )}

                  <button 
                    style={{
                      ...styles.payButton,
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer"
                    }} 
                    onClick={handlePay}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Memproses..." : "Kirim Verifikasi Pembayaran"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#14182b",
    color: "white"
  },
  content: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "20px"
  },
  columns: {
    display: "flex",
    gap: "24px",
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  mainColumn: {
    flex: "1 1 560px",
    minWidth: "320px"
  },
  sideColumn: {
    flex: "0 1 360px",
    minWidth: "320px"
  },
  title: {
    textAlign: "center",
    color: "white",
    marginBottom: "30px",
    fontSize: "28px"
  },
  receiptCard: {
    background: "linear-gradient(180deg, #1e2a55 0%, #161f3e 100%)",
    color: "white",
    padding: "35px 25px",
    borderRadius: "20px",
    marginBottom: "24px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "all 0.3s ease",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
    maxWidth: "460px",
    margin: "0 auto 24px auto",
    position: "relative",
    overflow: "hidden"
  },
  receiptHeader: {
    textAlign: "center",
    borderBottom: "1px dashed rgba(255,255,255,0.2)",
    paddingBottom: "20px",
    marginBottom: "20px"
  },
  receiptLogo: {
    height: "22px",
    marginBottom: "8px",
    filter: "brightness(0) invert(1)"
  },
  receiptType: {
    fontSize: "10px",
    letterSpacing: "3px",
    color: "#a0a8c0",
    fontWeight: "bold"
  },
  statusHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "20px"
  },
  statusIconLarge: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "15px",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  successTitle: {
    margin: 0,
    fontSize: "24px",
    textAlign: "center"
  },
  successText: {
    margin: "0 auto 20px auto",
    color: "#aab6df",
    lineHeight: 1.6,
    fontSize: "13px",
    textAlign: "center"
  },
  receiptGrid: {
    marginBottom: "20px"
  },
  summaryCard: {
    background: "rgba(30, 42, 85, 0.6)",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "flex",
    gap: "15px",
    alignItems: "center",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "all 0.3s ease",
    backdropFilter: "blur(5px)"
  },
  gameIcon: {
    width: "60px",
    height: "60px",
    borderRadius: "10px",
    objectFit: "cover"
  },
  gameName: {
    margin: "0 0 5px 0",
    color: "white",
    fontSize: "20px"
  },
  itemName: {
    margin: "0 0 10px 0",
    color: "#a0a8c0",
    fontSize: "16px"
  },
  discountInfo: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "10px"
  },
  discountText: {
    color: "#8ef7a0",
    fontSize: "13px",
    fontWeight: "600"
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline"
  },
  totalLabel: {
    fontSize: "16px",
    color: "#a0a8c0"
  },
  totalPrice: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#4CAF50"
  },
  originalPriceText: {
    margin: "8px 0 0 0",
    color: "#a0a8c0",
    fontSize: "13px"
  },
  customerCard: {
    background: "linear-gradient(145deg, #1e2a55, #161f3e)",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.3s ease"
  },
  sectionTitle: {
    margin: "0 0 15px 0",
    color: "white",
    fontSize: "18px"
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "12px",
    paddingBottom: "14px",
    borderBottom: "1px solid #3a4060"
  },
  infoLabel: {
    color: "#a0a8c0",
    fontSize: "14px"
  },
  infoValue: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: "13px",
    textAlign: "right"
  },
  pendingText: {
    fontWeight: "bold",
    fontSize: "13px",
    textAlign: "right"
  },
  paymentCard: {
    background: "linear-gradient(145deg, #1e2a55, #161f3e)",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.3s ease"
  },
  paymentInfo: {
    textAlign: "center"
  },
  paymentLogo: {
    width: "90px",
    height: "30px",
    marginBottom: "20px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto"
  },
  qrisBarcode: {
    width: "100%",
    maxWidth: "220px",
    margin: "12px auto",
    display: "block",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "10px"
  },
  note: {
    background: "rgba(76, 175, 80, 0.15)",
    border: "1px solid rgba(76, 175, 80, 0.3)",
    color: "white",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    marginTop: "15px"
  },
  uploadCard: {
    background: "linear-gradient(145deg, #1e2a55, #161f3e)",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.3s ease"
  },
  uploadBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: "140px",
    border: "2px dashed #4CAF50",
    borderRadius: "12px",
    background: "#182042",
    cursor: "pointer",
    padding: "20px"
  },
  uploadTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: "16px"
  },
  uploadSubtitle: {
    color: "#a0a8c0",
    fontSize: "13px"
  },
  hiddenInput: {
    display: "none"
  },
  fileName: {
    color: "#d7def5",
    marginTop: "16px",
    marginBottom: "0",
    fontSize: "14px"
  },
  previewImage: {
    width: "100%",
    marginTop: "16px",
    borderRadius: "12px",
    objectFit: "cover",
    border: "1px solid #3a4060"
  },
  payButton: {
    width: "100%",
    padding: "18px",
    background: "linear-gradient(to right, #4CAF50, #45a049)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px",
    boxShadow: "0 4px 15px rgba(76, 175, 80, 0.3)",
    transition: "all 0.2s ease"
  },
  successActions: {
    marginTop: "30px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: "20px"
  },
  transferBox: {
    background: "rgba(0,0,0,0.2)",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px",
    border: "1px solid rgba(255,255,255,0.05)"
  },
  numberRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px'
  },
  copyBtn: {
    background: '#2a3550',
    border: '1px solid #3a4b82',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  secondaryButton: {
    flex: 1,
    minWidth: "180px",
    padding: "16px",
    background: "#2b355b",
    color: "white",
    border: "1px solid #3a4b82",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  loadingContainer: {
    background: "#1e2a55",
    padding: "40px",
    borderRadius: "14px",
    textAlign: "center",
    border: "1px solid #334071",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px"
  },
  processingText: {
    color: "#7CFF83",
    fontSize: "20px",
    fontWeight: "bold"
  }
};

export default Payment;
