export interface AvatarConfig {
  photo?: string;
}

interface AvatarProps {
  config?: AvatarConfig | null;
  name?: string;
  size?: number;
  className?: string;
}

const BG_GRADIENTS = [
  "linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)",
  "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)",
  "linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)",
  "linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)",
  "linear-gradient(135deg, #c084fc 0%, #a855f7 100%)",
  "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
];

export default function Avatar({ config, name = "User", size = 48, className = "" }: AvatarProps) {
  const photo = config?.photo;

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`rounded-full object-cover shadow-inner select-none shrink-0 aspect-square ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size, flexShrink: 0 }}
      />
    );
  }

  // Fallback to name initial
  const initial = name.charAt(0).toUpperCase();
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const bgIndex = hash % BG_GRADIENTS.length;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner select-none shrink-0 aspect-square ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        flexShrink: 0,
        background: BG_GRADIENTS[bgIndex],
        fontSize: size * 0.45
      }}
    >
      {initial}
    </div>
  );
}
