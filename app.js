/**
 * Your Wealth Compass - VSL Landing Page Engine
 * Features:
 * - Locked VSL player (scrubbing/skipping strictly prevented)
 * - Seamless custom controls with auto-fade
 * - Click-to-unmute helper for browser autoplay policies
 * - Fullscreen toggle with cross-browser support
 * - Policy Modals (Privacy, Terms, Refund) with backdrop and ESC support
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const video = document.getElementById('vslVideo');
  const container = document.getElementById('videoContainer');
  const playOverlay = document.getElementById('playOverlay');
  const vslControls = document.getElementById('vslControls');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const progressFill = document.getElementById('progressFill');
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const durationDisplay = document.getElementById('durationDisplay');
  const muteBtn = document.getElementById('muteBtn');
  const volHighIcon = document.getElementById('volHighIcon');
  const volMuteIcon = document.getElementById('volMuteIcon');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Scroll to top when clicking header logo
  const brandLogo = document.querySelector('.site-header .brand-link');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ==========================================================================
  // POLICY MODALS (Privacy Policy, Terms & Conditions, Refund Policy)
  // ==========================================================================
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const modalClosers = document.querySelectorAll('[data-close]');
  const dialogs = document.querySelectorAll('.policy-dialog');

  function openModal(modalId) {
    const dialog = document.getElementById(modalId);
    if (!dialog) return;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeModal(dialog) {
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    document.body.style.overflow = '';
  }

  modalTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute('data-modal');
      openModal(targetId);
    });
  });

  modalClosers.forEach((closer) => {
    closer.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = closer.getAttribute('data-close');
      const dialog = document.getElementById(targetId);
      closeModal(dialog);
    });
  });

  dialogs.forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.bottom &&
        rect.left <= e.clientX &&
        e.clientX <= rect.right
      );
      if (!isInDialog) {
        closeModal(dialog);
      }
    });

    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
    });
  });

  // Guard against missing video element for custom player controls
  if (!video) return;

  // HLS (.m3u8) Support via Hls.js
  const sourceEl = video.querySelector('source');
  const streamSrc = video.getAttribute('data-src') || (sourceEl ? sourceEl.getAttribute('src') : video.src);

  if (streamSrc && (streamSrc.includes('.m3u8') || streamSrc.includes('manifest'))) {
    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(streamSrc);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamSrc;
    }
  }

  // Maximum watched progress tracking (Strict Anti-Skip Protection)
  let maxWatchedTime = 0;
  let controlsTimeout = null;

  // Format seconds to MM:SS
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Update sound icon state
  function updateSoundIcons(isMuted) {
    if (isMuted) {
      if (volHighIcon) volHighIcon.style.display = 'none';
      if (volMuteIcon) volMuteIcon.style.display = 'block';
    } else {
      if (volHighIcon) volHighIcon.style.display = 'block';
      if (volMuteIcon) volMuteIcon.style.display = 'none';
    }
  }

  // Toggle Play / Pause
  function togglePlay() {
    if (video.paused || video.ended) {
      video.play().catch(() => {
        // Autoplay policy fallback: try muted
        video.muted = true;
        updateSoundIcons(true);
        video.play();
      });
    } else {
      video.pause();
    }
  }

  // Toggle Mute / Unmute
  function toggleMute() {
    video.muted = !video.muted;
    updateSoundIcons(video.muted);
  }

  // Toggle Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // Auto-hide controls during playback
  function resetControlsTimer() {
    if (vslControls) {
      vslControls.style.opacity = '1';
      vslControls.style.pointerEvents = 'auto';
    }
    clearTimeout(controlsTimeout);
    if (!video.paused && !video.ended) {
      controlsTimeout = setTimeout(() => {
        if (!video.paused && vslControls) {
          vslControls.style.opacity = '0';
          vslControls.style.pointerEvents = 'none';
        }
      }, 3000);
    }
  }

  // Video Events
  video.addEventListener('loadedmetadata', () => {
    if (durationDisplay) {
      durationDisplay.textContent = formatTime(video.duration);
    }
  });

  video.addEventListener('timeupdate', () => {
    // Lock Forward Skipping:
    // If the viewer tries to jump forward further than they have legitimately watched, snap back
    if (video.currentTime > maxWatchedTime + 1.5) {
      video.currentTime = maxWatchedTime;
    } else if (video.currentTime > maxWatchedTime) {
      maxWatchedTime = video.currentTime;
    }

    if (durationDisplay && (!durationDisplay.textContent || durationDisplay.textContent === '00:00')) {
      durationDisplay.textContent = formatTime(video.duration);
    }

    if (currentTimeDisplay) {
      currentTimeDisplay.textContent = formatTime(video.currentTime);
    }

    if (progressFill && video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      progressFill.style.width = `${pct}%`;
    }
  });

  // Strict seeking restriction
  video.addEventListener('seeking', () => {
    if (video.currentTime > maxWatchedTime + 0.5) {
      video.currentTime = maxWatchedTime;
    }
  });

  video.addEventListener('play', () => {
    if (playOverlay) playOverlay.classList.add('hidden');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    resetControlsTimer();
  });

  video.addEventListener('pause', () => {
    if (playOverlay) playOverlay.classList.remove('hidden');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (vslControls) {
      vslControls.style.opacity = '1';
      vslControls.style.pointerEvents = 'auto';
    }
    clearTimeout(controlsTimeout);
  });

  video.addEventListener('ended', () => {
    if (playOverlay) playOverlay.classList.remove('hidden');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (progressFill) progressFill.style.width = '100%';
    if (vslControls) {
      vslControls.style.opacity = '1';
      vslControls.style.pointerEvents = 'auto';
    }
  });

  // Click listeners for Video & Play Overlay
  if (playOverlay) {
    playOverlay.addEventListener('click', togglePlay);
  }

  video.addEventListener('click', togglePlay);

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMute();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Inactivity fade triggers on video container
  if (container) {
    container.addEventListener('mousemove', resetControlsTimer);
    container.addEventListener('mouseenter', resetControlsTimer);
    container.addEventListener('mouseleave', () => {
      if (!video.paused && vslControls) {
        vslControls.style.opacity = '0';
        vslControls.style.pointerEvents = 'none';
      }
    });

    // Disable context menu to prevent manual video inspection/downloading
    container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Keyboard accessibility & Anti-Seek enforcement
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      toggleMute();
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      toggleFullscreen();
    } else if (['ArrowRight', 'ArrowUp', 'KeyL', 'PageDown', 'End'].includes(e.code)) {
      // Disallow fast-forwarding keyboard shortcuts
      e.preventDefault();
    }
  });
});
