// Central branding system. Change these values to re-skin the launcher for a
// different network — logo text, names, accent color, API endpoint, imagery.

export const branding = {
  /** Product name shown in the title bar and about screens. */
  name: "CL Launcher",
  /** Network / backend brand. */
  network: "CraftersLand",
  /** Short monogram used in the logo badge. */
  monogram: "CL",
  /** One-line tagline. */
  tagline: "Premium Modded Minecraft",
  /** Default API endpoint (can be overridden in Settings → Advanced). */
  apiBaseUrl: "https://apiv1.clbackend.net",

  /** Accent gradient used across primary actions and highlights. */
  accent: {
    from: "#4ade80",
    to: "#22c55e",
    /** CSS gradient string for convenience. */
    gradient: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
    glow: "rgba(74, 222, 128, 0.35)",
  },

  /** Optional hero/background imagery (falls back to gradients when unset). */
  images: {
    heroFallback: "",
    authBackground: "",
  },

  links: {
    support: "https://craftersland.org",
    discord: "https://discord.gg/craftersland",
  },
} as const;

export type Branding = typeof branding;
