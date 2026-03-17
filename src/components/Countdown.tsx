import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  isLocked: boolean;
  lockTime?: string;
}

export default function Countdown({ isLocked, lockTime = '18:00' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('--:--:--');

  useEffect(() => {
    const updateCountdown = () => {
      if (isLocked) {
        setTimeLeft('Fermé');
        return;
      }

      const now = new Date();
      const target = new Date();
      
      const [hoursLimit, minutesLimit] = (lockTime || '18:00').split(':').map(Number);
      target.setHours(hoursLimit, minutesLimit, 0, 0);

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

  return (
    <div
      className={`flex items-center gap-4 px-6 py-3 rounded-2xl shadow-sm transition-all border-2 ${
        isLocked
          ? 'bg-slate-50 border-slate-200'
          : 'bg-indigo-50 border-indigo-200 animate-pulse-subtle'
      }`}
    >
      <Clock
        className={isLocked ? 'text-slate-400' : 'text-indigo-600'}
        size={24}
      />
      <div>
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isLocked ? 'text-slate-500' : 'text-indigo-500'
          }`}
        >
          {isLocked ? 'Session Clôturée' : 'Fin des commandes'}
        </p>
        <p
          className={`text-2xl font-black tabular-nums ${
            isLocked ? 'text-slate-400' : 'text-indigo-700'
          }`}
        >
          {timeLeft}
        </p>
      </div>
    </div>
  );
}
