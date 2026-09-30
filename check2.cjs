const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}
walk('./src').forEach(file => {
  const c = fs.readFileSync(file, 'utf8');
  let m;
  const re = /useEffect\s*\(/g;
  while ((m = re.exec(c)) !== null) {
    const start = m.index;
    const lineNum = c.slice(0, start).split('\n').length;
    let paren = 1;
    let i = start + m[0].length;
    let depsStr = null;
    while (i < c.length && paren > 0) {
      if (c[i] === '(') paren++;
      else if (c[i] === ')') paren--;
      else if (c[i] === '[' && paren === 1) {
         let bracket = 1;
         let j = i + 1;
         while (j < c.length && bracket > 0) {
           if (c[j] === '[') bracket++;
           else if (c[j] === ']') bracket--;
           j++;
         }
         depsStr = c.slice(i, j);
         break;
      }
      i++;
    }
    if (depsStr) {
      // split deps and check if any look like they could be objects or arrays causing issues.
      console.log(file, lineNum, depsStr);
    }
  }
});
