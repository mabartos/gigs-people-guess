"use client";

import { useEffect, useState } from "react";

export function useAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => { setIsAdmin(session?.isAdmin === true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return isAdmin;
}
