import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  isLocked: boolean;
}

export default function Countdown({ isLocked }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(23, 0, 0, 0);

      if (now >= target) {
        setTimeLeft('Clôturé');
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
  }, []);

  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 rounded-lg ${
        isLocked
          ? 'bg-red-100 border-2 border-red-300'
          : 'bg-blue-100 border-2 border-blue-300'
      }`}
    >
      <Clock
        className={isLocked ? 'text-red-600' : 'text-blue-600'}
        size={24}
      />
      <div>
        <p
          className={`text-xs font-medium ${
            isLocked ? 'text-red-700' : 'text-blue-700'
          }`}
        >
          {isLocked ? 'Commandes fermées' : 'Temps restant'}
        </p>
        <p
          className={`text-2xl font-bold ${
            isLocked ? 'text-red-800' : 'text-blue-800'
          }`}
        >
          {timeLeft}
        </p>
      </div>
    </div>
  );
}
