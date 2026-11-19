// Código de acceso para presentaciones privadas de clientes (ej. /lynk-co).
// Se valida en el servidor. Aquí solo vive el hash del código, no el código.
// Para cambiarlo: define LYNK_ACCESS_CODE en Vercel (Settings → Environment Variables),
// o reemplaza CODE_HASH por sha256('b2r-lynk::' + CÓDIGO_EN_MAYÚSCULAS).

export const config = {
  matcher: ['/lynk-co', '/lynk-co/:path*'],
};

const COOKIE = 'b2r_lynk_access';
const SECTION = '/lynk-co';
const CODE_HASH = '0090fee7e6eb92a1dbe2a60e93a37816134c8c885b00e8abe694fb8de0cc0c29';

async function token(code) {
  const data = new TextEncoder().encode('b2r-lynk::' + code);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function gatePage(error) {
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
<form class="box" method="GET" action="${SECTION}/">
<h1>Acceso privado</h1>
<p>Esta presentación es confidencial. Ingresa el código de acceso que te compartimos.</p>
<input name="code" type="password" autocomplete="off" placeholder="Código de acceso" autofocus required>
${error ? '<p class="err">Código incorrecto. Inténtalo de nuevo.</p>' : ''}
<button type="submit">Entrar</button>
<img class="logo" src="/images/b2r-logo-white-transparent.png" alt="Brand to Revenue">
</form></body></html>`;
}

export default async function middleware(request) {
  const envCode = process.env.LYNK_ACCESS_CODE;
  const valid = envCode ? await token(envCode.trim().toUpperCase()) : CODE_HASH;
  const url = new URL(request.url);

  if (readCookie(request, COOKIE) === valid) return; // acceso concedido: sigue a la página

  const code = url.searchParams.get('code');
  if (code !== null) {
    if ((await token(code.trim().toUpperCase())) === valid) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: SECTION + '/',
          'Set-Cookie': `${COOKIE}=${valid}; Path=${SECTION}; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(gatePage(true), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }

  return new Response(gatePage(false), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
