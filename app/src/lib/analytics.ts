import { supabase } from "./supabase";

export interface ConversionEvent {
  variant: string;
  action: string;
  page?: string;
  metadata?: Record<string, any>;
}

export async function trackConversion(event: ConversionEvent): Promise<void> {
  try {
    const { error } = await supabase.from("conversion_events").insert({
      variant: event.variant,
      action: event.action,
      page: event.page || window.location.pathname,
      metadata: event.metadata || {},
      timestamp: new Date().toISOString(),
      session_id: getSessionId(),
    });

    if (error) {
      console.error("Failed to track conversion:", error);
    }
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem("verifysign_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("verifysign_session_id", sessionId);
  }
  return sessionId;
}

export async function trackPageView(variant: string): Promise<void> {
  await trackConversion({
    variant,
    action: "page_view",
    page: window.location.pathname,
  });
}

export async function trackCTAClick(variant: string, ctaLabel: string): Promise<void> {
  await trackConversion({
    variant,
    action: "cta_click",
    metadata: { cta_label: ctaLabel },
  });
}

export async function trackSignup(variant: string): Promise<void> {
  await trackConversion({
    variant,
    action: "signup",
  });
}

export async function trackPurchase(variant: string, plan: string): Promise<void> {
  await trackConversion({
    variant,
    action: "purchase",
    metadata: { plan },
  });
}
