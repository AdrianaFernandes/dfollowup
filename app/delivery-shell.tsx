"use client";

import dynamic from "next/dynamic";

const DeliveryFollowupClient = dynamic(() => import("./home-client"), {
  ssr: false,
  loading: () => (
    <div className="appShell" style={{ padding: "2rem 1rem" }}>
      <p className="muted">Carregando…</p>
    </div>
  ),
});

export function DeliveryShell() {
  return <DeliveryFollowupClient />;
}
