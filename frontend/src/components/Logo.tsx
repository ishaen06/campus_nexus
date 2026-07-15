interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ 
  className = "", 
  size = 48, 
  showText = false 
}: LogoProps) {
  
  const graphic = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 200 200" 
      style={{ width: size, height: size }}
      className="flex-shrink-0 object-contain text-[#1e3a5f] dark:text-indigo-400"
    >
      {/* Square border lines */}
      <rect x="30" y="30" width="140" height="140" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/>

      {/* Diagonal lines from corners to circle edge */}
      <line x1="30" y1="30" x2="72" y2="72" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
      <line x1="170" y1="30" x2="128" y2="72" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
      <line x1="30" y1="170" x2="72" y2="128" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
      <line x1="170" y1="170" x2="128" y2="128" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>

      {/* Circle (smaller) --> made smaller as requested */}
      <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="8"/>

      {/* Corner nodes */}
      <circle cx="30" cy="30" r="12" fill="currentColor"/>
      <circle cx="170" cy="30" r="12" fill="currentColor"/>
      <circle cx="30" cy="170" r="12" fill="currentColor"/>
      <circle cx="170" cy="170" r="12" fill="currentColor"/>

      {/* Graduation cap body */}
      <path d="M 82 100 L 100 115 L 118 100 L 100 95 Z" fill="currentColor"/>

      {/* Cap top board */}
      <polygon points="100,75 128,87 100,99 72,87" fill="currentColor"/>

      {/* Cap tassel string */}
      <path d="M 120 84.5 L 120 102 C 120 105, 123 105, 123 108" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>

      {/* Tassel end */}
      <polygon points="121,108 125,108 126,115 120,115" fill="currentColor"/>
    </svg>
  );

  if (showText) {
    return (
      <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
        {graphic}
        {/* Text Lockup */}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-extrabold tracking-wide leading-none text-[#1e3a8a]">
              Campus
            </span>
            <span className="text-3xl font-black tracking-normal leading-none text-slate-900 dark:text-white">
              Nexus
            </span>
          </div>
          <div className="h-[2px] bg-[#1e3a8a]/30 w-44 my-2.5" />
          <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase">
            CONNECT &middot; LEARN &middot; GROW
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {graphic}
    </div>
  );
}
