import { useEffect, useState } from "react";
import { getAlerts } from "../api/client";

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts()
      .then((res) => setAlerts(res.alerts ?? []))
      .catch(() => setAlerts([]))   // silently fall back to demo data
      .finally(() => setLoading(false));
  }, []);

  return { alerts, loading };
}
