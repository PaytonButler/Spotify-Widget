const vinyl = document.getElementById('vinyl');
const albumArt = document.getElementById('albumArt');
const trackName = document.getElementById('trackName');
const artistName = document.getElementById('artistName');
const playPauseBtn = document.getElementById('playPauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const heartBtn = document.getElementById('heartBtn');
const heartIcon = document.getElementById('heartIcon');

let isPlaying = false;
let volumeDebounce;
let currentTrackId = null;
let isLiked = false;

document.getElementById('closeBtn').addEventListener('click', () => {
  window.spotifyAPI.quit();
});

document.getElementById('minBtn').addEventListener('click', () => {
  window.spotifyAPI.minimize();
});

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = await window.spotifyAPI.getToken();
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  return fetch(`https://api.spotify.com/v1${endpoint}`, options);
}

function setHeart(liked) {
  heartIcon.setAttribute('fill', liked ? 'white' : 'none');
}

async function pollNowPlaying() {
  try {
    const res = await apiCall('/me/player/currently-playing');

    if (res.status === 204) { // nothing playing
      trackName.textContent = 'Not playing';
      trackName.removeAttribute('href');
      artistName.textContent = '';
      vinyl.classList.remove('playing');
      return;
    }

    const data = await res.json();

    // Track name as Spotify link
    trackName.textContent = data.item.name;
    trackName.href = data.item.external_urls.spotify;

    // Only re-check like status when the track actually changes
    const newTrackId = data.item.id;
    if (newTrackId !== currentTrackId) {
      currentTrackId = newTrackId;
      try {
        const uri = `spotify:track:${currentTrackId}`;
        const likeRes = await apiCall(`/me/library/contains?uris=${encodeURIComponent(uri)}`);
        if (likeRes.ok) {
          const [liked] = await likeRes.json();
          isLiked = liked;
          setHeart(isLiked);
        }
      } catch (err) {
        console.error('Like check failed:', err);
      }
    }

    artistName.textContent = data.item.artists.map(a => a.name).join(', ');
    albumArt.src = data.item.album.images[0]?.url ?? '';

    isPlaying = data.is_playing;
    vinyl.classList.toggle('playing', isPlaying);
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';

    // Keep the slider synced to actual device volume, but don't fight the user mid-drag
    if (document.activeElement !== volumeSlider && data.device?.volume_percent != null) {
      volumeSlider.value = data.device.volume_percent;
    }

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

document.getElementById('nextBtn').addEventListener('click', () => {
  apiCall('/me/player/next', 'POST');
});

document.getElementById('prevBtn').addEventListener('click', () => {
  apiCall('/me/player/previous', 'POST');
});

volumeSlider.addEventListener('input', () => {
  clearTimeout(volumeDebounce);
  const level = volumeSlider.value;
  volumeDebounce = setTimeout(() => {
    apiCall(`/me/player/volume?volume_percent=${level}`, 'PUT');
  }, 250);
});

heartBtn.addEventListener('click', async () => {
  console.log('Heart clicked. currentTrackId:', currentTrackId);
  if (!currentTrackId) return;
  const uri = `spotify:track:${currentTrackId}`;

  if (isLiked) {
    const res = await apiCall(`/me/library?uris=${encodeURIComponent(uri)}`, 'DELETE');
    console.log('DELETE status:', res.status);
  } else {
    const res = await apiCall(`/me/library?uris=${encodeURIComponent(uri)}`, 'PUT');
    console.log('PUT status:', res.status);
  }
  isLiked = !isLiked;
  setHeart(isLiked);
});

// First-run login, then start polling every 2s
window.spotifyAPI.login().then(() => {
  pollNowPlaying();
  setInterval(pollNowPlaying, 2000);
});