import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';

// Import dynamique pour éviter les problèmes de SSR
const Picker = dynamic(() => import('emoji-picker-react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="text-center p-4">Chargement...</div>
});

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  currentEmoji?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, currentEmoji = '✨' }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fermer le picker quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center justify-center p-2 border rounded-md hover:bg-gray-100 transition-colors"
        title="Choisir un emoji"
      >
        <span className="text-sm">Changer</span>
      </button>
      
      {showPicker && (
        <div className="absolute z-50 mt-2 shadow-xl rounded-lg overflow-hidden">
          <Picker
            onEmojiClick={(emojiData: EmojiClickData) => {
              onEmojiSelect(emojiData.emoji);
              setShowPicker(false);
            }}
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPicker; 