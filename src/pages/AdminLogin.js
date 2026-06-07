import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAdminAuthenticated, loginAdmin, storeAdminSession } from "../api/client";
import { showAdminLoginSuccessToast, showValidationAlert, showErrorAlert } from "../utils/authToast";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      showValidationAlert("Input diperlukan", "Email dan password admin wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await loginAdmin(email.trim(), password);
      storeAdminSession(session);
      showAdminLoginSuccessToast();
      navigate("/admin", { replace: true });
    } catch (error) {
      showErrorAlert("Login gagal", error.message || "Login admin gagal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page" style={styles.container}>
      <div className="admin-login-card" style={styles.card}>
        <h1 style={styles.title}>Login Admin</h1>
        <p style={styles.subtitle}>
          Halaman ini khusus pengelola untuk memverifikasi pesanan dan mengatur item game.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@sirr18store.com"
            style={styles.input}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password admin"
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : "Masuk ke Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(180deg, #222a4d 0%, #13182b 100%)"
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#1f2747",
    border: "1px solid #334071",
    borderRadius: "16px",
    padding: "28px",
    color: "white",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.26)"
  },
  title: {
    margin: 0,
    fontSize: "28px"
  },
  subtitle: {
    margin: "10px 0 22px 0",
    color: "#c8d0ef",
    lineHeight: 1.6
  },
  form: {
    display: "grid",
    gap: "14px"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #3a4060",
    background: "#111833",
    color: "white",
    boxSizing: "border-box"
  },
  button: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#ff9800",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  }
};

export default AdminLogin;
