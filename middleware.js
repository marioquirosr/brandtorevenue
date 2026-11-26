// Código de acceso para páginas privadas de clientes (ej. /lynk-co, /dinamico-bss).
// Se valida en el servidor. Aquí solo vive el hash de cada código, no el código.
// Para cambiar un código: define su variable en Vercel (Settings → Environment Variables),
// o reemplaza su hash por sha256(salt + CÓDIGO_EN_MAYÚSCULAS).

export const config = {
  matcher: ['/lynk-co', '/lynk-co/:path*', '/dinamico-bss', '/dinamico-bss/:path*'],
};

const SECTIONS = {
  '/lynk-co': {
    cookie: 'b2r_lynk_access',
    salt: 'b2r-lynk::',
    hash: '0090fee7e6eb92a1dbe2a60e93a37816134c8c885b00e8abe694fb8de0cc0c29',
    env: 'LYNK_ACCESS_CODE',
    text: 'Esta presentación es confidencial. Ingresa el código de acceso que te compartimos.',
  },
  '/dinamico-bss': {
    cookie: 'b2r_dinamico_access',
    salt: 'b2r-dinamico::',
    hash: '83ff56c4f7593b38c080d2d6f68d95505148af5c03136afe65e5ce6b786dd0eb',
    env: 'DINAMICO_ACCESS_CODE',
    text: 'Este documento es confidencial. Ingresa el código de acceso que te compartimos.',
  },
};

async function token(salt, code) {
  const data = new TextEncoder().encode(salt + code);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function gatePage(section, text, error) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Acceso privado — Brand to Revenue</title>
<link rel="icon" href="/favicon.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Figtree:wght@400;600&display=swap">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#121014;color:#F4F1FA;font-family:'Figtree',Arial,sans-serif;padding:24px}
.box{width:100%;max-width:400px}
h1{font-family:'Poppins',Arial,sans-serif;font-size:32px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
p{margin:0 0 28px;color:#CFC6E6;font-size:16px;line-height:1.5}
input{width:100%;padding:16px 18px;border-radius:14px;border:1px solid #4A3580;background:#1A1525;color:#F4F1FA;font-size:18px;letter-spacing:.08em;outline:none}
input:focus{border-color:#FFE600}
button{width:100%;margin-top:12px;padding:16px;border:0;border-radius:14px;background:#FFE600;color:#2E1C52;font-family:'Poppins',Arial,sans-serif;font-weight:600;font-size:16px;cursor:pointer}
.err{color:#FFB4C8;font-size:14px;margin:10px 0 0}
.logo{margin-top:40px;width:96px;opacity:.9}
</style></head><body>
<form class="box" method="GET" action="${section}/">
<h1>Acceso privado</h1>
<p>${text}</p>
<input name="code" type="password" autocomplete="off" placeholder="Código de acceso" autofocus required>
${error ? '<p class="err">Código incorrecto. Inténtalo de nuevo.</p>' : ''}
<button type="submit">Entrar</button>
<img class="logo" src="/images/b2r-logo-white-transparent.png" alt="Brand to Revenue">
</form></body></html>`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const section = Object.keys(SECTIONS).find((s) => url.pathname === s || url.pathname.startsWith(s + '/'));
  if (!section) return;
  const cfg = SECTIONS[section];

  const envCode = process.env[cfg.env];
  const valid = envCode ? await token(cfg.salt, envCode.trim().toUpperCase()) : cfg.hash;

  if (readCookie(request, cfg.cookie) === valid) return; // acceso concedido: sigue a la página

  const code = url.searchParams.get('code');
  if (code !== null) {
    if ((await token(cfg.salt, code.trim().toUpperCase())) === valid) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: section + '/',
          'Set-Cookie': `${cfg.cookie}=${valid}; Path=${section}; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(gatePage(section, cfg.text, true), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }

  return new Response(gatePage(section, cfg.text, false), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
