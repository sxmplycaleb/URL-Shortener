import { resolveRedirect } from "../services/redirectService.js";
import AppError from "../utils/AppError.js";

const REDIRECT_ERROR_CONTENT = {
  "Link not found.": {
    statusCode: 404,
    title: "Link not found",
    heading: "We could not find that short link.",
    body: "The link may have been mistyped, removed, or never created.",
  },
  "Link expired.": {
    statusCode: 410,
    title: "Link expired",
    heading: "This short link has expired.",
    body: "The owner set an expiration date, so this destination is no longer available.",
  },
  "Link disabled.": {
    statusCode: 410,
    title: "Link disabled",
    heading: "This short link is disabled.",
    body: "The owner has turned this link off for now.",
  },
  "Link not active yet.": {
    statusCode: 410,
    title: "Link scheduled",
    heading: "This short link is not active yet.",
    body: "The owner scheduled this destination to become available later.",
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sendFriendlyLinkPage(response, content) {
  const title = escapeHtml(content.title);
  const heading = escapeHtml(content.heading);
  const body = escapeHtml(content.body);

  response
    .status(content.statusCode)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${title} | Shortly</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
      main { width: min(92vw, 34rem); padding: 2.5rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #ffffff; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); text-align: center; }
      p:first-child { margin: 0 auto 1.5rem; display: grid; place-items: center; width: 4.5rem; height: 4.5rem; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 2rem; font-weight: 800; }
      h1 { margin: 0; font-size: clamp(1.8rem, 5vw, 2.4rem); line-height: 1.1; }
      p:last-child { margin: 1rem 0 0; color: #475569; line-height: 1.7; }
      @media (prefers-color-scheme: dark) {
        body { background: #020617; color: #e2e8f0; }
        main { background: #0f172a; border-color: #1e293b; }
        p:first-child { background: #172554; color: #93c5fd; }
        p:last-child { color: #cbd5e1; }
      }
    </style>
  </head>
  <body>
    <main>
      <p aria-hidden="true">!</p>
      <h1>${heading}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`);
}

function sendPasswordPage(response, shortCode, invalid = false) {
  response
    .status(invalid ? 401 : 200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Protected link | Shortly</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
      main { width: min(92vw, 28rem); padding: 2.25rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #ffffff; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0; font-size: 2rem; line-height: 1.1; }
      p { color: #475569; line-height: 1.6; }
      label { display: block; margin-bottom: .5rem; font-weight: 700; }
      input { width: 100%; box-sizing: border-box; min-height: 2.75rem; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .65rem .75rem; font: inherit; }
      button { margin-top: 1rem; width: 100%; min-height: 2.75rem; border: 0; border-radius: .5rem; background: #2563eb; color: white; font-weight: 800; font: inherit; cursor: pointer; }
      .error { color: #b91c1c; font-weight: 700; }
      @media (prefers-color-scheme: dark) {
        body { background: #020617; color: #e2e8f0; }
        main { background: #0f172a; border-color: #1e293b; }
        p { color: #cbd5e1; }
        input { background: #020617; border-color: #334155; color: #e2e8f0; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Protected link</h1>
      <p>This short link requires a password before redirecting.</p>
      ${invalid ? '<p class="error" role="alert">The password was not correct.</p>' : ""}
      <form method="post" action="/${encodeURIComponent(shortCode)}">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        <button type="submit">Continue</button>
      </form>
    </main>
  </body>
</html>`);
}

async function handleRedirect(request, response, password) {
  try {
    const originalUrl = await resolveRedirect(request.params.shortCode, request, password);
    response.redirect(302, originalUrl);
  } catch (error) {
    if (error instanceof AppError && error.message === "Link password required.") {
      sendPasswordPage(response, request.params.shortCode, Boolean(password));
      return;
    }

    const content = error instanceof AppError ? REDIRECT_ERROR_CONTENT[error.message] : undefined;

    if (!content) {
      throw error;
    }

    sendFriendlyLinkPage(response, content);
  }
}

export async function redirect(request, response) {
  await handleRedirect(request, response);
}

export async function unlockRedirect(request, response) {
  await handleRedirect(request, response, request.body?.password);
}
