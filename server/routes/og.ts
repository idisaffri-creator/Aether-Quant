/**
 * Dynamic OG image generator — SVG-based, no external deps.
 * Renders as image/png via inline SVG.
 *
 * GET /og?title=X&subtitle=Y&metric=100k&badge=Live
 *
 * Returns an SVG (can be served as image/svg+xml — most platforms accept).
 */
import { Router } from "express";

const router = Router();

router.get("/og", (req, res) => {
  const title = String(req.query.title || "Aether Energy");
  const subtitle = String(req.query.subtitle || "Algorithmic Trading for Energy Commodities");
  const metric = String(req.query.metric || "");
  const badge = String(req.query.badge || "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0e"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="blue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#60a5fa"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Glow -->
  <circle cx="900" cy="200" r="300" fill="rgba(245,158,11,0.08)"/>
  <circle cx="200" cy="500" r="200" fill="rgba(59,130,246,0.06)"/>

  <!-- Logo placeholder triangle -->
  <g transform="translate(80, 80)">
    <path d="M 0 50 L 30 0 L 60 50 Z" fill="url(#accent)" opacity="0.9"/>
    <path d="M 15 50 L 30 25 L 45 50 Z" fill="url(#blue)" opacity="0.9"/>
  </g>
  <text x="170" y="115" font-family="Space Grotesk, sans-serif" font-size="28" font-weight="700" fill="#ffffff">Aether Energy</text>

  ${badge ? `
  <g transform="translate(80, 200)">
    <rect width="${badge.length * 12 + 24}" height="40" rx="20" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>
    <text x="12" y="26" font-family="JetBrains Mono, monospace" font-size="14" font-weight="600" fill="#f59e0b" letter-spacing="2">${escapeXml(badge.toUpperCase())}</text>
  </g>
  ` : ""}

  <!-- Title -->
  <text x="80" y="${badge ? 340 : 320}" font-family="Space Grotesk, sans-serif" font-size="68" font-weight="700" fill="#ffffff">
    ${escapeXml(truncate(title, 28))}
  </text>

  <!-- Subtitle -->
  <text x="80" y="${badge ? 410 : 390}" font-family="Inter, sans-serif" font-size="28" font-weight="400" fill="#94a3b8">
    ${escapeXml(truncate(subtitle, 60))}
  </text>

  ${metric ? `
  <!-- Big metric -->
  <g transform="translate(80, 460)">
    <text font-family="JetBrains Mono, monospace" font-size="48" font-weight="700" fill="url(#accent)">${escapeXml(metric)}</text>
  </g>
  ` : ""}

  <!-- Bottom strip -->
  <rect x="0" y="580" width="1200" height="50" fill="rgba(255,255,255,0.03)"/>
  <text x="80" y="613" font-family="Inter, sans-serif" font-size="16" font-weight="500" fill="#64748b">
    ${escapeXml("Real-time market data · Paper trading · AI strategies · Backtesting")}
  </text>
  <text x="1120" y="613" font-family="JetBrains Mono, monospace" font-size="16" font-weight="600" fill="#f59e0b" text-anchor="end">
    aether-energy.ai
  </text>

  <!-- Decorative chart line -->
  <polyline points="80,560 180,540 280,520 380,500 480,490 580,460 680,470 780,440 880,420 980,400 1080,380 1120,370" fill="none" stroke="url(#accent)" stroke-width="3" opacity="0.6"/>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(svg);
});

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] || c));
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default router;