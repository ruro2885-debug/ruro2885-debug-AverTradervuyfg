import { useState, useEffect } from 'react';
import { STRATEGIES, Strategy } from '../data/strategies';

export const useFeaturedStrategy = () => {
  const [featuredStrategy, setFeaturedStrategy] = useState<Strategy | null>(null);

  useEffect(() => {
    const updateFeaturedStrategy = () => {
      const now = new Date();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      const periodIndex = Math.floor(now.getTime() / threeHoursInMs);
      
      // Seeded random-like selection to ensure no consecutive repeats
      // Use a simple generator or just a basic check
      let index = periodIndex % STRATEGIES.length;
      
      const lastIndex = parseInt(localStorage.getItem('lastFeaturedIndex') || '-1');
      
      if (index === lastIndex) {
        index = (index + 1) % STRATEGIES.length;
      }
      
      localStorage.setItem('lastFeaturedIndex', index.toString());
      setFeaturedStrategy(STRATEGIES[index]);
    };

    updateFeaturedStrategy();
    const interval = setInterval(updateFeaturedStrategy, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return featuredStrategy;
};
