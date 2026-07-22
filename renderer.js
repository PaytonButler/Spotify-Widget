const vinyl = document.getElementById('vinyl');
const albumArt = document.getElementById('albumArt');
const trackName = document.getElementById('trackName');
const artistName = document.getElementById('artistName');
const playPauseBtn = document.getElementById('playPauseBtn');

let isPlaying = false;
document.getElementById('closeBtn').addEventListener('click', () => {
  window.spotifyAPI.quit();
});

async function apiCall(endpoint, method = 'GET') {
  const token = await window.spotifyAPI.getToken();
  return fetch(`https://api.spotify.com/v1${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function pollNowPlaying() {
  try {
    const res = await apiCall('/me/player/currently-playing');
    if (res.status === 204) { // nothing playing
      trackName.textContent = 'Not playing';
      artistName.textContent = '';
      vinyl.classList.remove('playing');
      return;
    }
    const data = await res.json();
    trackName.textContent = data.item.name;
    artistName.textContent = data.item.artists.map(a => a.name).join(', ');
    albumArt.src = data.item.album.images[0]?.url ?? '';
    isPlaying = data.is_playing;
    vinyl.classList.toggle('playing', isPlaying);
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('playPauseBtn').addEventListener('click', async () => {
  await apiCall(isPlaying ? '/me/player/pause' : '/me/player/play', 'PUT');
  isPlaying = !isPlaying;
  vinyl.classList.toggle('playing', isPlaying);
  playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
});

document.getElementById('nextBtn').addEventListener('click', () => apiCall('/me/player/next', 'POST'));
document.getElementById('prevBtn').addEventListener('click', () => apiCall('/me/player/previous', 'POST'));

// First-run login, then start polling every 2s
window.spotifyAPI.login().then(() => {
  pollNowPlaying();
  setInterval(pollNowPlaying, 2000);
});