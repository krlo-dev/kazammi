/**
 * Reference A's ribbon of light: a thin white-blue streak enters from the left, meets the
 * horizon and opens into a tall, saturated wave on the right. Inline SVG with Gaussian blur
 * (renders the same in Safari); anchored right so phones see the wave, not the seam.
 */
export function Ribbon() {
  return (
    <div aria-hidden className="kz-login-backdrop">
      <svg
        className="kz-login-ribbon"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMaxYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="kz-blur-xl" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="42" />
          </filter>
          <filter id="kz-blur-l" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <filter id="kz-blur-m" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="kz-blur-s" x="-10%" y="-300%" width="120%" height="700%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <linearGradient id="kz-streak" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.22" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#bfe3ff" />
            <stop offset="0.78" stopColor="#3b7bff" />
            <stop offset="1" stopColor="#6a4bff" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="kz-sun" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="#ff7a3b" />
            <stop offset="1" stopColor="#ffd23b" />
          </linearGradient>
          <linearGradient id="kz-rose" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ff2d55" />
            <stop offset="1" stopColor="#ff4fa3" />
          </linearGradient>
          <linearGradient id="kz-dusk" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#6a4bff" />
            <stop offset="0.6" stopColor="#c03cff" />
            <stop offset="1" stopColor="#ff4fa3" />
          </linearGradient>
          <linearGradient id="kz-edge" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#7fb4ff" stopOpacity="0" />
            <stop offset="0.3" stopColor="#7fb4ff" />
            <stop offset="0.75" stopColor="#1fd1a5" />
            <stop offset="1" stopColor="#c03cff" />
          </linearGradient>
        </defs>

        <g className="kz-login-wave">
          <path
            filter="url(#kz-blur-xl)"
            fill="url(#kz-sun)"
            opacity="0.75"
            d="M900,600 C1150,520 1350,250 1600,130 L1600,330 C1380,380 1180,560 900,606 Z"
          />
          <path
            filter="url(#kz-blur-l)"
            fill="url(#kz-rose)"
            opacity="0.92"
            d="M860,600 C1120,560 1340,330 1600,250 L1600,470 C1360,480 1160,590 860,606 Z"
          />
          <path
            filter="url(#kz-blur-l)"
            fill="#1fd1a5"
            opacity="0.45"
            d="M1150,580 C1300,540 1450,480 1600,450 L1600,560 C1450,560 1300,585 1150,592 Z"
          />
          <path
            filter="url(#kz-blur-m)"
            fill="url(#kz-dusk)"
            opacity="0.95"
            d="M820,598 C1100,585 1350,450 1600,400 L1600,540 C1350,560 1100,600 820,604 Z"
          />
          <path
            filter="url(#kz-blur-m)"
            fill="#4b5bff"
            opacity="0.8"
            d="M800,600 C1100,596 1350,565 1600,540 L1600,585 C1350,600 1100,606 800,604 Z"
          />
        </g>

        <g className="kz-login-shimmer">
          <path
            filter="url(#kz-blur-s)"
            fill="url(#kz-streak)"
            d="M0,548 C280,560 560,580 860,598 L860,604 C560,592 280,570 0,556 Z"
          />
          <path
            fill="url(#kz-streak)"
            d="M120,553 C380,566 620,584 860,599 L860,601 C620,589 380,572 120,556 Z"
          />
          <path
            filter="url(#kz-blur-s)"
            fill="none"
            stroke="url(#kz-edge)"
            strokeWidth="2.5"
            d="M760,602 C1100,606 1350,592 1600,584"
          />
        </g>
      </svg>
    </div>
  );
}
