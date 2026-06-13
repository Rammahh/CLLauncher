import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
        launcher: {
          green: "#42d67c",
          "green-dark": "#2bb463",
          "green-glow": "rgba(66, 214, 124, 0.18)",
          blue: "#3b9dff",
          "blue-dark": "#1f6fd6",
          orange: "#ff9f43",
          red: "#ff5c5c",
          purple: "#a06bff",
          "bg-primary": "#0b0c0e",
          "bg-secondary": "#101116",
          "bg-card": "#16181d",
          "bg-hover": "#1e2128",
          "bg-active": "#262a31",
          border: "#23262d",
          "border-subtle": "#1a1c21",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(66, 214, 124, 0.45)",
        "glow-sm": "0 0 14px -4px rgba(66, 214, 124, 0.4)",
        card: "0 8px 24px -14px rgba(0, 0, 0, 0.7)",
        elevated: "0 18px 50px -18px rgba(0, 0, 0, 0.8)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
        "accent-soft":
          "linear-gradient(135deg, rgba(74,222,128,0.16) 0%, rgba(34,197,94,0.08) 100%)",
        "hero-fade":
          "linear-gradient(180deg, rgba(11,12,14,0) 0%, rgba(11,12,14,0.55) 55%, rgba(11,12,14,0.96) 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 2s linear infinite",
        indeterminate: "indeterminate 1.2s ease-in-out infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },
      backgroundSize: {
        shimmer: "400% 100%",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
