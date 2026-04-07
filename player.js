const audio = document.getElementById('audio');
const playBtn = document.getElementById('play-btn');
const progress = document.getElementById('progress');
const volume = document.getElementById('volume');

// Play / Pause
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸ Pause';
  } else {
    audio.pause();
    playBtn.textContent = '▶ Play';
  }
});

// Update progress bar as audio plays
audio.addEventListener('timeupdate', () => {
  if (audio.duration) {
    progress.max = audio.duration;
    progress.value = audio.currentTime;
  }
});

// Scrub through audio
progress.addEventListener('input', () => {
  audio.currentTime = progress.value;
});

// Volume control
volume.addEventListener('input', () => {
  audio.volume = volume.value;
});
audio.addEventListener("ended", () => {
  setStatus("Playback ended.");
  clearExistingTimers();
});
