import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  isLocked: boolean;
  lockTime?: string;
  variant?: 'default' | 'minimal' | 'icon-only';
}

export default function Countdown({ isLocked, lockTime = '18:00', variant = 'default' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('--:--:--');

  useEffect(() => {
    const updateCountdown = () => {
      if (isLocked) {
        setTimeLeft('Fermé');
        return;
      }

      const now = new Date();
      const target = new Date();
      
      const [timePart] = lockTime.split('|');
      const [hoursLimit, minutesLimit] = timePart.split(':').map(Number);
      target.setHours(hoursLimit || 18, minutesLimit || 0, 0, 0);

      if (now >= target) {
        setTimeLeft('Fermé');
        return;
      }

      const diff = target.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockTime, isLocked]);

  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center pointer-events-auto text-shadow-sm">
        <span className="text-white/80 text-[11px] font-bold tracking-wide uppercase">Clôture dans</span>
        <span className="text-white text-[15px] font-extrabold flex items-center gap-1.5">
          <Clock size={14} className={isLocked ? 'text-red-400' : 'text-orange-500'} />
          {isLocked ? 'Session Clôturée' : timeLeft}
        </span>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <Clock size={16} className={isLocked ? 'text-red-500' : 'text-orange-500'} />
        <span className="text-[14px] font-extrabold tracking-tight">
          {isLocked ? 'Clôturé' : timeLeft}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
        isLocked
          ? 'bg-gray-200 text-gray-600 border border-gray-300'
          : 'bg-orange-700 text-white'
      }`}
    >
      <Clock
        className={isLocked ? 'text-gray-500' : 'text-white'}
        size={16}
      />
      <span className="tracking-tight">
        {isLocked ? 'Session Clôturée' : `Clôture dans ${timeLeft}`}
      </span>
    </div>
  );
}
