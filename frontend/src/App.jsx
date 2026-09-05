import { useState } from "react";
import CopilotApp from "./pages/CopilotApp";
import SplashScreen from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
      <CopilotApp onReplaySplash={() => setShowSplash(true)} />
    </>
  );
}
