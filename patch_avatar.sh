#!/bin/bash
cat << 'INNEREOF' > patch.py
import re

with open('src/components/portfolio_v2/PortfolioViewV2.tsx', 'r') as f:
    content = f.read()

# Replace the avatar div
content = re.sub(
    r'<div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 relative">.*?<span className="absolute bottom-0 right-0 w-2\.5 h-2\.5 bg-\[#00D09C\] rounded-full border-2 border-\[#0E1320\]" />\s*</div>',
    r'<div className="w-9 h-9 rounded-full overflow-hidden border border-[#00D09C]/20 bg-[#00D09C]/10 flex items-center justify-center relative"><Sparkles className="w-5 h-5 text-[#00D09C]" /><span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00D09C] rounded-full border-2 border-[#0E1320]" /></div>',
    content,
    flags=re.DOTALL
)

with open('src/components/portfolio_v2/PortfolioViewV2.tsx', 'w') as f:
    f.write(content)
INNEREOF
python3 patch.py
