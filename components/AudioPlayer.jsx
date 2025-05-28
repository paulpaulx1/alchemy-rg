'use client'
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AudioPlayer.module.css';
import { PlayIcon, PauseIcon, SpeakerHighIcon, SpeakerLowIcon, SpeakerNoneIcon, SpeakerSimpleSlashIcon } from '@phosphor-icons/react';

export default function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration && !isDraggingProgress) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.volume = volume;
    };

    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('play', () => {});
      audio.removeEventListener('pause', () => {});
      audio.removeEventListener('ended', () => {});
    };
  }, [isDraggingProgress, volume]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => {
        console.error('Error playing audio:', e);
      });
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    audio.muted = !audio.muted;
  }, []);

  // Progress bar handling
  const setTimeFromPosition = useCallback((clientX) => {
    if (!progressBarRef.current || !audioRef.current?.duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const boundedPosition = Math.max(0, Math.min(1, position));

    setProgress(boundedPosition * 100);
    const newTime = boundedPosition * audioRef.current.duration;
    setCurrentTime(newTime);

    return { boundedPosition, newTime };
  }, []);

  // Volume bar handling
  const setVolumeFromPosition = useCallback((clientX) => {
    if (!volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const boundedPosition = Math.max(0, Math.min(1, position));

    const newVolume = boundedPosition;
    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = false;
    }

    return newVolume;
  }, []);

  // Progress bar event handlers
  const handleProgressBarClick = useCallback(
    (e) => {
      const result = setTimeFromPosition(e.clientX);
      if (result && audioRef.current) {
        audioRef.current.currentTime = result.newTime;
      }
    },
    [setTimeFromPosition]
  );

  const handleProgressMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      setIsDraggingProgress(true);
      setTimeFromPosition(e.clientX);
    },
    [setTimeFromPosition]
  );

  const handleProgressTouchStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsDraggingProgress(true);
      setTimeFromPosition(e.touches[0].clientX);
    },
    [setTimeFromPosition]
  );

  // Volume bar event handlers
  const handleVolumeBarClick = useCallback(
    (e) => {
      setVolumeFromPosition(e.clientX);
    },
    [setVolumeFromPosition]
  );

  const handleVolumeMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      setIsDraggingVolume(true);
      setVolumeFromPosition(e.clientX);
    },
    [setVolumeFromPosition]
  );

  const handleVolumeTouchStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsDraggingVolume(true);
      setVolumeFromPosition(e.touches[0].clientX);
    },
    [setVolumeFromPosition]
  );

  // Global mouse/touch handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingProgress) {
        setTimeFromPosition(e.clientX);
      } else if (isDraggingVolume) {
        setVolumeFromPosition(e.clientX);
      }
    };

    const handleMouseUp = (e) => {
      if (isDraggingProgress) {
        const result = setTimeFromPosition(e.clientX);
        if (result && audioRef.current) {
          audioRef.current.currentTime = result.newTime;
        }
        setIsDraggingProgress(false);
      } else if (isDraggingVolume) {
        setIsDraggingVolume(false);
      }
    };

    const handleTouchMove = (e) => {
      if (isDraggingProgress || isDraggingVolume) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        if (isDraggingProgress) {
          setTimeFromPosition(touch.clientX);
        } else if (isDraggingVolume) {
          setVolumeFromPosition(touch.clientX);
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (isDraggingProgress) {
        const lastTouch = e.changedTouches[0];
        const result = setTimeFromPosition(lastTouch.clientX);
        if (result && audioRef.current) {
          audioRef.current.currentTime = result.newTime;
        }
        setIsDraggingProgress(false);
      } else if (isDraggingVolume) {
        setIsDraggingVolume(false);
      }
    };

    if (isDraggingProgress || isDraggingVolume) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [
    isDraggingProgress,
    isDraggingVolume,
    setTimeFromPosition,
    setVolumeFromPosition,
  ]);

  const formatTime = useCallback((time) => {
    if (!time && time !== 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <SpeakerSimpleSlashIcon size={32}/>;
    if (volume < 0.3) return <SpeakerNoneIcon size={32}/>;
    if (volume < 0.7) return <SpeakerLowIcon size={32}/>;
    return <SpeakerHighIcon size={32}/>;
  };

  return (
    <div className={styles.audioPlayer}>
      <audio ref={audioRef} src={src} preload='metadata' />

      {title && <div className={styles.title}>{title}</div>}

      <div className={styles.controls}>
        <button
          onClick={togglePlay}
          className={`${styles.playButton} ${styles.touchTarget}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon size={32}/> : <PlayIcon size={32}/>}
        </button>

        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            ref={progressBarRef}
            onClick={handleProgressBarClick}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
            role='slider'
            aria-label='Audio progress'
            aria-valuemin='0'
            aria-valuemax='100'
            aria-valuenow={progress}
          >
            <div
              className={styles.progress}
              style={{ width: `${progress}%` }}
            />
            <div
              className={`${styles.progressHandle} ${styles.touchTarget}`}
              style={{ left: `${progress}%` }}
            />
          </div>
          <div className={styles.timeInfo}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>
        </div>

        <div className={styles.volumeContainer}>
          <button
            onClick={toggleMute}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
            className={`${styles.volumeButton} ${styles.touchTarget}`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {getVolumeIcon()}
          </button>

          {/* <div
            className={`${styles.volumeSliderContainer} ${
              showVolumeSlider ? styles.visible : ''
            }`}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <div
              className={styles.volumeBar}
              ref={volumeBarRef}
              onClick={handleVolumeBarClick}
              onMouseDown={handleVolumeMouseDown}
              onTouchStart={handleVolumeTouchStart}
              role='slider'
              aria-label='Volume'
              aria-valuemin='0'
              aria-valuemax='100'
              aria-valuenow={volume * 100}
            >
              <div
                className={styles.volumeProgress}
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <div
                className={`${styles.volumeHandle} ${styles.touchTarget}`}
                style={{ left: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
