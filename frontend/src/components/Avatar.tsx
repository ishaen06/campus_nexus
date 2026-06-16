export interface AvatarConfig {
  emoji: string;
  bg: number;
}

interface AvatarProps {
  config?: AvatarConfig | null;
  name?: string;
  size?: number;
  className?: string;
}

const BG_GRADIENTS = [
  "linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)", // Indigo
  "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)", // Rose
  "linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)", // Emerald
  "linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)", // Amber
  "linear-gradient(135deg, #c084fc 0%, #a855f7 100%)", // Purple
  "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)", // Sky
];

export default function Avatar({ config, name = "User", size = 48, className = "" }: AvatarProps) {
  const emoji = config && typeof config === 'object' && 'emoji' in config ? config.emoji : null;
  const bg = config && typeof config === 'object' && 'bg' in config ? config.bg : 0;
  const gradient = BG_GRADIENTS[bg] || BG_GRADIENTS[0];

  if (emoji) {
    return (
      <div 
        className={`rounded-full flex items-center justify-center shadow-inner select-none ${className}`}
        style={{ 
          width: size, 
          height: size, 
          background: gradient, 
          fontSize: size * 0.52 
        }}
      >
        {emoji}
      </div>
    );
  }

  // Fallback to name initial
  const initial = name.charAt(0).toUpperCase();
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const bgIndex = hash % BG_GRADIENTS.length;
  
  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner select-none ${className}`}
      style={{ 
        width: size, 
        height: size, 
        background: BG_GRADIENTS[bgIndex], 
        fontSize: size * 0.45 
      }}
    >
      {initial}
    </div>
  );
}
