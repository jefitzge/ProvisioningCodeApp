import { useEffect, useState } from 'react';

export function AppClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time className="hidden text-xs italic text-muted-foreground sm:inline" dateTime={currentTime.toISOString()}>
      {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
    </time>
  );
}
