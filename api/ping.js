// Serverless visit logger for lukakraljevic.com
// Client (inline snippet in index.html) POSTs here on page load.
// We enrich with Vercel's server-side geo headers, drop bots, and forward a
// clean row to the private n8n webhook (which appends it to a Google Sheet).
//
// Privacy: we never store or forward the raw IP — only the country/region/city
// that Vercel derives at the edge. Set TRACK_WEBHOOK_URL in Vercel env vars.

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|bingpreview|embedly|quora link preview|whatsapp|telegrambot|discordbot|linkedinbot|twitterbot|pinterest|headless|phantom|puppeteer|playwright|lighthouse|gtmetrix|pingdom|uptime|monitor|python-requests|axios|node-fetch|okhttp|curl|wget|go-http|java\//i;

function browserOf(ua) {
  if (/edg\//i.test(ua)) return "edge";
  if (/samsungbrowser/i.test(ua)) return "samsung";
  if (/opr\//i.test(ua)) return "opera";
  if (/firefox\//i.test(ua)) return "firefox";
  if (/chrome\//i.test(ua)) return "chrome";
  if (/safari\//i.test(ua)) return "safari";
  return "other";
}
function osOf(ua) {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/mac os x/i.test(ua)) return "macos";
  if (/windows/i.test(ua)) return "windows";
  if (/linux/i.test(ua)) return "linux";
  return "other";
}

function classify(ref) {
  if (!ref) return "direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (/google\./.test(h)) return "google";
    if (/(linkedin\.|lnkd\.in)/.test(h)) return "linkedin";
    if (/instagram\./.test(h)) return "instagram";
    if (/(t\.co|twitter\.|x\.com)/.test(h)) return "twitter";
    if (/(facebook\.|fb\.)/.test(h)) return "facebook";
    if (/github\./.test(h)) return "github";
    if (/(bing\.|duckduckgo\.|yahoo\.|ecosia\.)/.test(h)) return "search";
    if (h === "lukakraljevic.com") return "internal";
    return h;
  } catch (e) {
    return "other";
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end();
  }

  const ua = req.headers["user-agent"] || "";
  // Drop known bots/crawlers/link-preview fetchers so the sheet is humans-only.
  if (BOT.test(ua)) {
    res.statusCode = 204;
    return res.end();
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Headless crawlers that execute JS and spoof a normal browser UA still give
  // themselves away: default 800x600 viewport + UTC timezone. No real visitor
  // has that combination.
  if (String(body.screen) === "800x600" && String(body.tz) === "UTC") {
    res.statusCode = 204;
    return res.end();
  }

  const webhook = process.env.TRACK_WEBHOOK_URL;
  if (!webhook) {
    // Not configured yet — succeed silently so the site never errors.
    res.statusCode = 204;
    return res.end();
  }

  const city = decodeURIComponent(req.headers["x-vercel-ip-city"] || "").trim();
  const referrer = String(body.referrer || "").slice(0, 300);

  // date/time in Croatian local time (DST-aware); ts stays UTC ISO for sorting
  const now = new Date();
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zagreb",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(now); // sv-SE locale → "YYYY-MM-DD HH:MM:SS"

  const payload = {
    ts: now.toISOString(),
    date: local.slice(0, 10),
    time: local.slice(11, 19),
    country: req.headers["x-vercel-ip-country"] || "",
    region: req.headers["x-vercel-ip-country-region"] || "",
    city: city,
    source: classify(referrer),
    referrer: referrer,
    path: String(body.path || "/").slice(0, 200),
    device: /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop",
    lang: String(body.lang || "").slice(0, 40),
    screen: String(body.screen || "").slice(0, 20),
    tz: String(body.tz || "").slice(0, 60),
    ua: ua.slice(0, 300),
    event: String(body.event || "view").slice(0, 40),
    scroll: body.scroll === undefined ? "" : String(body.scroll).slice(0, 4),
    seconds: body.seconds === undefined ? "" : String(body.seconds).slice(0, 7),
    utm: String(body.utm || "").slice(0, 80),
    vid: String(body.vid || "").slice(0, 12),
    viewport: String(body.viewport || "").slice(0, 20),
    browser: browserOf(ua),
    os: osOf(ua),
    role: String(body.role || "").slice(0, 20),
    intent: String(body.intent || "").slice(0, 20),
    temp: String(body.temp || "").slice(0, 20),
    email: String(body.email || "").slice(0, 120),
  };

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Never let a logging failure affect the visitor.
  }

  res.statusCode = 204;
  res.end();
};
