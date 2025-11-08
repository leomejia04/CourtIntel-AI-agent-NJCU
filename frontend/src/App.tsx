import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setUser(data.username);
        }
      } catch {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }
      const data = await response.json();
      setUser(data.username);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    setAuthLoading(true);
    setError(undefined);
    try {
      const registerResp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!registerResp.ok) {
        const body = await registerResp.json();
        throw new Error(body.detail || "Registration failed");
      }
      await handleLogin(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register");
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/login");
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Checking session...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Dashboard username={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" />
          ) : (
            <Login onLogin={handleLogin} goToRegister={() => navigate("/register")} loading={authLoading} error={error} />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/" />
          ) : (
            <Register
              onRegister={handleRegister}
              goToLogin={() => navigate("/login")}
              loading={authLoading}
              error={error}
            />
          )
        }
      />
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
};

export default App;

