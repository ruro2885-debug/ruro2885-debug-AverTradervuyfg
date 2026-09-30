const fs = require('fs');
let content = fs.readFileSync('src/components/copytrade/CopyTradeDashboard.tsx', 'utf8');

const regex = /  useEffect\(\(\) => \{\n    const int = setInterval\(\(\) => \{\n      setJitter\(\(Math.random\(\) - 0.5\) \* 0.1\);\n    \}, 3000\);\n    return \(\) => clearInterval\(int\);\n  \}, \[\]\);/g;

content = content.replace(regex, '');
fs.writeFileSync('src/components/copytrade/CopyTradeDashboard.tsx', content);
