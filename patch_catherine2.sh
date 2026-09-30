#!/bin/bash
sed -i 's/<!-- <span className="text-\[9px\] font-medium text-slate-400 uppercase tracking-widest block font-sans">/<span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest block font-sans">/g' src/components/portfolio_v2/PortfolioViewV2.tsx
sed -i 's/Lead Strategist --><span className="text-\[9px\] font-medium text-slate-400 uppercase tracking-widest block font-sans">Market Intelligence<\/span>/System Intelligence/g' src/components/portfolio_v2/PortfolioViewV2.tsx
