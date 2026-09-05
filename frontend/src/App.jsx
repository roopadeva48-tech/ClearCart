import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import SplashScreen from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
      <Dashboard onReplaySplash={() => setShowSplash(true)} />
    </>
  );
}
