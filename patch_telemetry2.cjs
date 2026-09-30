const fs = require('fs');
let content = fs.readFileSync('src/components/AiTradingModule.tsx', 'utf8');

const regex = /    const interval = setInterval\(\(\) => \{[\s\S]*?return \(\) => clearInterval\(interval\);\n  \}, \[session\]\);/;

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

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/AiTradingModule.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Regex not found");
}
