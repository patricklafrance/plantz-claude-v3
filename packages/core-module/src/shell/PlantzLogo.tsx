export function PlantzLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Plantz">
            <g transform="translate(3,2)">
                {/* Stem */}
                <path d="M10 28 C10 22 9 18 10 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
                {/* Left leaf */}
                <path d="M10 12 C7 9 1 7 0 4 C3 6 7 6 10 8" fill="currentColor" opacity="0.55" />
                {/* Right leaf */}
                <path d="M10 15 C14 12 19 11 21 8 C18 11 14 12 10 13" fill="currentColor" opacity="0.7" />
                {/* Small accent leaf */}
                <path d="M10 19 C8 17 4 16 3 14 C5 16 8 16 10 17" fill="currentColor" opacity="0.4" />
            </g>
            <text x="28" y="24" fontFamily="'Fraunces', Georgia, serif" fontWeight="600" fontSize="20" fill="currentColor" letterSpacing="-0.5">
                Plantz
            </text>
        </svg>
    );
}
