import { useState, useEffect } from 'react';

export const useCountdown = (endTime: Date) => {
  const [timeLeft, setTimeLeft] = useState(endTime.getTime() - new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;
      setTimeLeft(distance > 0 ? distance : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};
