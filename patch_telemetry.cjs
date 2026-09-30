const fs = require('fs');
let content = fs.readFileSync('src/components/AiTradingModule.tsx', 'utf8');

const target = `    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const delta = (Math.random() - 0.5) * 5;
        const target = 45;
        const next = prev + (target - prev) * 0.15 + delta;
        return parseFloat(Math.max(1, Math.min(99, next)).toFixed(1));
      });

      setMemoryUsage(prev => {
        const delta = Math.floor((Math.random() - 0.5) * 10);
        const target = 1420;
        const next = prev + (target - prev) * 0.05 + delta;
        return Math.max(100, Math.min(4000, next));
      });
      
      setNeuralCycles(prev => prev + Math.floor(Math.random() * 8 + 1));
      
      // Micro-fluctuation between -$0.12 and +$0.12 for visuals to keep numbers active
      setMicroVariance(prev => {
        const delta = (Math.random() - 0.5) * 0.08;
        const next = prev + delta;
        return Math.max(-3.5, Math.min(3.5, next));
      });
      
      // Node load percentage fluctuations (e.g., between 98.2% and 100.0%)
      setNodeLoad(() => {
        return parseFloat((98.5 + Math.random() * 1.5).toFixed(2));
      });
      
      // Engaged nodes count fluctuations (e.g. 12 to 16)
      setActiveNodesCount(() => {
        return Math.floor(12 + Math.random() * 5);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);`;

const replacement = `    const interval = setInterval(() => {
      setCpuUsage(() => {
        const target = activeTrades.length > 0 ? 45 + (activeTrades.length * 2.5) : 15;
        return parseFloat(Math.min(99, target).toFixed(1));
      });

      setMemoryUsage(() => {
        const target = activeTrades.length > 0 ? 1420 + (activeTrades.length * 50) : 500;
        return Math.min(4000, target);
      });
      
      setNeuralCycles(prev => prev + (activeTrades.length > 0 ? 3 : 1));
      
      setMicroVariance(0);
      setNodeLoad(98.5);
      
      setActiveNodesCount(Math.floor(12));
    }, 1000);

    return () => clearInterval(interval);
  }, [session, activeTrades.length]);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/AiTradingModule.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Target not found");
}
