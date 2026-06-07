import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import DetailGame from "./pages/DetailGame";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Payment from "./pages/Payment";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import { isAdminAuthenticated } from "./api/client";

function App() {
  const [isAdmin, setIsAdmin] = useState(
    () => isAdminAuthenticated()
  );

  useEffect(() => {
    const syncAdminState = () => {
      setIsAdmin(isAdminAuthenticated());
    };

    window.addEventListener("storage", syncAdminState);
    window.addEventListener("authchange", syncAdminState);

    return () => {
      window.removeEventListener("storage", syncAdminState);
      window.removeEventListener("authchange", syncAdminState);
    };
  }, []);

  return (
    <BrowserRouter>
      <div style={styles.app}>
        <Navbar />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:id" element={<DetailGame />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment-confirmation" element={<Payment />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin-login" replace />}
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  main: {
    flex: 1
  }
};

export default App;
