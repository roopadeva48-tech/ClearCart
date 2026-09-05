import { useState, useEffect } from "react";
import CopilotApp from "./pages/CopilotApp";
import SplashScreen from "./components/SplashScreen";
import AuthPage from "./pages/AuthPage";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authUser, setAuthUser] = useState(() => {
    try {
      const stored = localStorage.getItem("clearcart_auth_user");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  function handleLoginSuccess(user) {
    setAuthUser(user);
  }

  function handleLogout() {
    localStorage.removeItem("clearcart_auth_user");
    setAuthUser(null);
  }

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {!authUser ? (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <CopilotApp
          currentUser={authUser}
          onLogout={handleLogout}
          onReplaySplash={() => setShowSplash(true)}
        />
      )}
    </>
  );
}
