// Fire-and-forget event tracking
export function track(event: string, metadata?: Record<string, unknown>) {
  const page = typeof window !== "undefined" ? window.location.pathname : undefined;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, page, metadata }),
  }).catch(() => {}); // silent fail — analytics never blocks UX
}
