// ============================================================
// Web Player — Pusher-triggered countdown
// ============================================================
const PUSHER_KEY     = "your-pusher-key";       // <-- replace this
const PUSHER_CLUSTER = "us2";                   // <-- replace this e.g. "us2", "eu"
const TRACK_JSON_URL = "https://your-r2-bucket.r2.dev/track.json"; // <-- replace this

// ============================================================

let countdownInterval = null;

async function loadTrack() {
  try {
    const res = await fetch(TRACK_JSON_URL);
    const track = await res.json();
    document.getElementById("track-title").textContent = track.title || "Upcoming Track";
    window._trackAudioUrl = track.audio_url;
  } catch (err) {
    document.getElementById("countdown-status").textContent = "Error loading track.";
    console.error(err);
  }
}

function startCountdown(seconds) {
  let remaining = seconds;
  const display = document.getElementById("countdown-display");
  const status  = document.getElementById("countdown-status");
  display.textContent = remaining;
  status.textContent  = "Get ready...";
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    remaining--;
    display.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      status.textContent = "Playing now!";
      playTrack(window._trackAudioUrl);
    }
  }, 1000);
}

function playTrack(audioUrl) {
  const player = document.getElementById("player");
  player.src = audioUrl;
  player.style.display = "block";
  player.play().catch(err => {
    console.warn("Autoplay blocked:", err);
    document.getElementById("countdown-status").textContent = "Tap play to start!";
  });
}

function connectPusher() {
  const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
  const channel = pusher.subscribe("web-player");
  document.getElementById("countdown-status").textContent = "Waiting for host...";
  channel.bind("go", data => {
    const seconds = data.countdown || 10;
    startCountdown(seconds);
  });
}

loadTrack();
connectPusher();
