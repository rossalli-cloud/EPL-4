const audio = document.getElementById("audio");
const playButton1 = document.getElementById("playButton1");
const playButton2 = document.getElementById("playButton2");
const startTimeInput = document.getElementById("startTime");
const statusEl = document.getElementById("status");

let syncInterval = null;
let startTimestampMs = null;
let countdownTimer = null;

const SOFT_CORRECT_THRESHOLD = 0.15;
const HARD_CORRECT_THRESHOLD = 1.0;
const MAX_PLAYBACK_RATE_ADJUST = 0.02;
const SYNC_CHECK_MS = 3000;
const COUNTDOWN_CHECK_MS = 250;
const ENTRANCE_2_OFFSET_MS = 10 * 60 * 1000; // 10 minutes in ms

async function handlePlay(entranceNumber) {
  clearExistingTimers();

  const inputValue = startTimeInput.value;
  if (!inputValue) {
    setStatus("Please enter a UTC start time.");
    return;
  }

  const entrance1Ms = parseUtcInput(inputValue);

  if (Number.isNaN(entrance1Ms)) {
    setStatus("Invalid time format.");
    return;
  }

  // Entrance 2 starts 10 minutes after Entrance 1
  startTimestampMs = entranceNumber === 1
    ? entrance1Ms
    : entrance1Ms + ENTRANCE_2_OFFSET_MS;

  try {
    await audio.play();
    audio.pause();
  } catch (err) {
    console.error(err);
    setStatus("Audio could not be initialized. Try again.");
    return;
  }

  const now = Date.now();
  const offsetSeconds = (now - startTimestampMs) / 1000;

  if (offsetSeconds < 0) {
    setStatus(`Entrance ${entranceNumber}: waiting to start...`);
    waitUntilStart(entranceNumber);
  } else {
    beginPlayback(offsetSeconds, entranceNumber);
  }
}

playButton1.addEventListener("click", () => handlePlay(1));
playButton2.addEventListener("click", () => handlePlay(2));

function parseUtcInput(value) {
  return new Date(value + "Z").getTime();
}

function waitUntilStart(entranceNumber) {
  const tick = () => {
    const msRemaining = startTimestampMs - Date.now();

    if (msRemaining <= 0) {
      beginPlayback(0, entranceNumber);
      return;
    }

    const totalSeconds = Math.ceil(msRemaining / 1000);
    setStatus(`Entrance ${entranceNumber}: starting in ${totalSeconds} second${totalSeconds === 1 ? "" : "s"}...`);
    countdownTimer = setTimeout(tick, COUNTDOWN_CHECK_MS);
  };

  tick();
}

function beginPlayback(initialOffsetSeconds, entranceNumber) {
  const trackDuration = audio.duration;

  if (!Number.isNaN(trackDuration) && initialOffsetSeconds >= trackDuration) {
    setStatus(`Entrance ${entranceNumber}: the track has already finished.`);
    return;
  }

  audio.currentTime = Math.max(0, initialOffsetSeconds);
  audio.playbackRate = 1.0;

  audio.play()
    .then(() => {
      setStatus(`Entrance ${entranceNumber}: playing from ${formatTime(audio.currentTime)}.`);
      startSyncLoop(entranceNumber);
    })
    .catch((err) => {
      console.error(err);
      setStatus("Playback failed. Try pressing Play again.");
    });
}

function startSyncLoop(entranceNumber) {
  if (syncInterval) clearInterval(syncInterval);

  syncInterval = setInterval(() => {
    if (!startTimestampMs || audio.paused || audio.ended) return;

    const expectedTime = (Date.now() - startTimestampMs) / 1000;
    const actualTime = audio.currentTime;
    const drift = expectedTime - actualTime;

    if (!Number.isNaN(audio.duration) && expectedTime >= audio.duration) {
      setStatus("Track complete.");
      clearExistingTimers();
      return;
    }

    if (Math.abs(drift) >= HARD_CORRECT_THRESHOLD) {
      audio.currentTime = Math.max(0, expectedTime);
      audio.playbackRate = 1.0;
      setStatus(`Entrance ${entranceNumber}: hard resync at ${formatTime(audio.currentTime)}.`);
      return;
    }

    if (Math.abs(drift) >= SOFT_CORRECT_THRESHOLD) {
      const correction = clamp(drift * 0.02, -MAX_PLAYBACK_RATE_ADJUST, MAX_PLAYBACK_RATE_ADJUST);
      audio.playbackRate = 1.0 + correction;
      setStatus(`Entrance ${entranceNumber}: soft sync — drift ${drift.toFixed(2)}s.`);
    } else {
      audio.playbackRate = 1.0;
      setStatus(`Entrance ${entranceNumber}: in sync at ${formatTime(actualTime)}.`);
    }
  }, SYNC_CHECK_MS);
}

function clearExistingTimers() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  if (countdownTimer) { clearTimeout(countdownTimer); countdownTimer = null; }
}

function setStatus(message) { statusEl.textContent = message; }

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

audio.addEventListener("loadedmetadata", () => {
  setStatus(`Track loaded. Duration: ${formatTime(audio.duration)}.`);
});

audio.addEventListener("ended", () => {
  setStatus("Playback ended.");
  clearExistingTimers();
});
