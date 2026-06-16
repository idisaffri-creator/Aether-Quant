import sharp from "sharp";

const width = 1200;
const height = 630;

const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a12"/>
      <stop offset="50%" stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#0a0a12"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  </pattern>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>

  <circle cx="400" cy="200" r="300" fill="#f59e0b" opacity="0.06"/>
  <circle cx="900" cy="450" r="250" fill="#3b82f6" opacity="0.05"/>

  <rect x="0" y="0" width="${width}" height="3" fill="url(#accent)"/>

  <g transform="translate(80, 80)">
    <polygon points="16,2 30,28 2,28" fill="none" stroke="url(#accent)" stroke-width="2" stroke-linejoin="round" opacity="0.8"/>
    <polygon points="16,8 24,22 8,22" fill="url(#accent)" opacity="0.6"/>
  </g>

  <text x="130" y="105" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="white" letter-spacing="-0.5">Aether Energy</text>

  <text x="80" y="220" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="white" letter-spacing="-1.5">AI-Powered Quantitative</text>
  <text x="80" y="285" font-family="system-ui, sans-serif" font-size="56" font-weight="700" letter-spacing="-1.5">
    <tspan fill="url(#accent)">Trading for Energy Markets</tspan>
  </text>

  <text x="80" y="340" font-family="system-ui, sans-serif" font-size="22" fill="rgba(255,255,255,0.6)" letter-spacing="0.5">Deploy autonomous AI agents that trade crude, gold, and natgas around the clock.</text>

  <g transform="translate(80, 380)">
    <rect x="0" y="0" width="200" height="36" rx="18" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>
    <text x="100" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#f59e0b" text-anchor="middle" letter-spacing="1">MONTE CARLO ENGINE</text>

    <rect x="216" y="0" width="180" height="36" rx="18" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
    <text x="306" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#60a5fa" text-anchor="middle" letter-spacing="1">AI AGENT FLEET</text>

    <rect x="412" y="0" width="210" height="36" rx="18" fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.3)" stroke-width="1"/>
    <text x="517" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#34d399" text-anchor="middle" letter-spacing="1">REAL-TIME ANALYTICS</text>

    <rect x="638" y="0" width="230" height="36" rx="18" fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.3)" stroke-width="1"/>
    <text x="753" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#c084fc" text-anchor="middle" letter-spacing="1">INSTITUTIONAL RISK</text>
  </g>

  <g transform="translate(780, 120)">
    <rect x="0" y="0" width="360" height="40" rx="8" fill="rgba(255,255,255,0.04)"/>
    <circle cx="20" cy="20" r="5" fill="#ef4444" opacity="0.7"/>
    <circle cx="38" cy="20" r="5" fill="#eab308" opacity="0.7"/>
    <circle cx="56" cy="20" r="5" fill="#22c55e" opacity="0.7"/>
    <rect x="140" y="14" width="80" height="12" rx="6" fill="rgba(255,255,255,0.06)"/>

    <rect x="0" y="44" width="360" height="340" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

    <rect x="12" y="56" width="108" height="52" rx="6" fill="rgba(255,255,255,0.03)"/>
    <text x="22" y="72" font-family="system-ui, sans-serif" font-size="9" fill="rgba(255,255,255,0.4)" letter-spacing="1">TOTAL P&amp;L</text>
    <text x="22" y="95" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#34d399">$145.6k</text>

    <rect x="126" y="56" width="108" height="52" rx="6" fill="rgba(255,255,255,0.03)"/>
    <text x="136" y="72" font-family="system-ui, sans-serif" font-size="9" fill="rgba(255,255,255,0.4)" letter-spacing="1">AGENTS</text>
    <text x="136" y="95" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="white">5 Active</text>

    <rect x="240" y="56" width="108" height="52" rx="6" fill="rgba(255,255,255,0.03)"/>
    <text x="250" y="72" font-family="system-ui, sans-serif" font-size="9" fill="rgba(255,255,255,0.4)" letter-spacing="1">SHARPE</text>
    <text x="250" y="95" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#f59e0b">1.84</text>

    <rect x="12" y="116" width="336" height="140" rx="6" fill="rgba(255,255,255,0.02)"/>

    <polyline points="20,230 50,220 80,225 110,210 140,215 170,200 200,195 230,205 260,185 290,180 320,175 340,170" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>
    <polyline points="20,230 50,220 80,225 110,210 140,215 170,200 200,195 230,205 260,185 290,180 320,175 340,170 340,250 20,250" fill="url(#glow)" opacity="0.3"/>

    <line x1="20" y1="180" x2="340" y2="180" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    <line x1="20" y1="200" x2="340" y2="200" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    <line x1="20" y1="220" x2="340" y2="220" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

    <g transform="translate(12, 268)">
      <rect x="0" y="0" width="160" height="100" rx="6" fill="rgba(255,255,255,0.02)"/>
      <text x="10" y="18" font-family="system-ui, sans-serif" font-size="9" fill="rgba(255,255,255,0.4)" letter-spacing="1">AGENT FLEET</text>
      <circle cx="20" cy="38" r="4" fill="#22c55e"/>
      <text x="30" y="42" font-family="system-ui, sans-serif" font-size="10" fill="rgba(255,255,255,0.7)">Alpha Crude</text>
      <text x="130" y="42" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#34d399" text-anchor="end">+$3.4k</text>
      <circle cx="20" cy="58" r="4" fill="#22c55e"/>
      <text x="30" y="62" font-family="system-ui, sans-serif" font-size="10" fill="rgba(255,255,255,0.7)">Gold Spread</text>
      <text x="130" y="62" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#ef4444" text-anchor="end">-$1.3k</text>
      <circle cx="20" cy="78" r="4" fill="#22c55e"/>
      <text x="30" y="82" font-family="system-ui, sans-serif" font-size="10" fill="rgba(255,255,255,0.7)">NatGas Vol</text>
      <text x="130" y="82" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#34d399" text-anchor="end">+$5.7k</text>
    </g>

    <g transform="translate(184, 268)">
      <rect x="0" y="0" width="164" height="100" rx="6" fill="rgba(255,255,255,0.02)"/>
      <text x="10" y="18" font-family="system-ui, sans-serif" font-size="9" fill="rgba(255,255,255,0.4)" letter-spacing="1">DAILY P&amp;L</text>
      <rect x="10" y="45" width="8" height="20" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="22" y="55" width="8" height="10" rx="1" fill="#ef4444" opacity="0.7"/>
      <rect x="34" y="40" width="8" height="25" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="46" y="50" width="8" height="15" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="58" y="60" width="8" height="5" rx="1" fill="#ef4444" opacity="0.7"/>
      <rect x="70" y="35" width="8" height="30" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="82" y="48" width="8" height="17" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="94" y="52" width="8" height="13" rx="1" fill="#ef4444" opacity="0.7"/>
      <rect x="106" y="38" width="8" height="27" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="118" y="42" width="8" height="23" rx="1" fill="#34d399" opacity="0.7"/>
      <rect x="130" y="55" width="8" height="10" rx="1" fill="#ef4444" opacity="0.7"/>
      <rect x="142" y="30" width="8" height="35" rx="1" fill="#34d399" opacity="0.8"/>
    </g>
  </g>

  <rect x="0" y="${height - 50}" width="${width}" height="50" fill="rgba(0,0,0,0.3)"/>
  <text x="80" y="${height - 22}" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">aether-energy.ai</text>
  <text x="${width - 80}" y="${height - 22}" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="end">Institutional Quant Tools for Energy Markets</text>
</svg>`;

async function generate() {
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 95 })
    .toFile("client/public/og-image.png");
  console.log("Generated client/public/og-image.png (1200x630)");
}

generate().catch(console.error);
