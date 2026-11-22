import React from 'react';
import { Turtle, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AudioButtonProps {
  text: string;
  showSlow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  showSlow = false,
  size = 'md',
  label,
  className = '',
}) => {
  const { speak, speakingText, speechSupported } = useLanguage();
  const isSpeaking = speakingText === text;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  if (!speechSupported) return null;

  return (
    <span className={`fl-audio-group ${className}`}>
      <button
        type="button"
        className={`fl-audio-btn fl-audio-${size} ${isSpeaking ? 'speaking' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          speak(text, false);
        }}
        title="Listen in Brazilian Portuguese (Normal speed)"
        aria-label={`Listen to ${text}`}
      >
        <Volume2 size={iconSize} />
        {label && <span>{label}</span>}
      </button>

      {showSlow && (
        <button
          type="button"
          className={`fl-audio-btn fl-audio-slow fl-audio-${size}`}
          onClick={(e) => {
            e.stopPropagation();
            speak(text, true);
          }}
          title="Listen slowly (0.6x speed)"
          aria-label={`Listen slowly to ${text}`}
        >
          <Turtle size={iconSize} />
          {size === 'lg' && <span>Slow</span>}
        </button>
      )}
    </span>
  );
};
