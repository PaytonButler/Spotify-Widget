require('dotenv').config();

const crypto = require('crypto');
const http = require('http');
const { shell } = require('electron');
const fetch = require('node-fetch');
const Store = require('electron-store');

const store = new Store();
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// Kicks off login: opens system browser, spins up a tiny local server to catch the redirect
function login() {
  return new Promise((resolve, reject) => {
    const { verifier, challenge } = generatePKCE();

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&code_challenge_method=S256&code_challenge=${challenge}&scope=${encodeURIComponent(SCOPES)}`;

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get('code');
      if (!code) return;

      res.end('Login complete — you can close this tab and return to the app.');
      server.close();

      try {
        const tokens = await exchangeCode(code, verifier);
        store.set('refresh_token', tokens.refresh_token);
        store.set('access_token', tokens.access_token);
        store.set('expires_at', Date.now() + tokens.expires_in * 1000);
        resolve(tokens);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(8888, () => shell.openExternal(authUrl));
  });
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

async function refreshAccessToken() {
  const refresh_token = store.get('refresh_token');
  if (!refresh_token) throw new Error('Not logged in');

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Refresh failed');
  const tokens = await res.json();

  store.set('access_token', tokens.access_token);
  store.set('expires_at', Date.now() + tokens.expires_in * 1000);
  if (tokens.refresh_token) store.set('refresh_token', tokens.refresh_token);
  return tokens.access_token;
}

// Always call this before hitting the Web API, refreshes only if needed
async function getValidAccessToken() {
  const expiresAt = store.get('expires_at', 0);
  if (Date.now() < expiresAt - 30000) return store.get('access_token');
  return refreshAccessToken();
}

function isLoggedIn() {
  return !!store.get('refresh_token');
}

module.exports = { login, getValidAccessToken, isLoggedIn };
