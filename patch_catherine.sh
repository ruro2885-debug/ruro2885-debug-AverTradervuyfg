#!/bin/bash
sed -i 's/<h4 className="text-xs font-bold text-white uppercase tracking-wider">Dr. Catherine Vance<\/h4>/<h4 className="text-xs font-bold text-white uppercase tracking-wider">Aver AI Engine<\/h4>/g' src/components/portfolio_v2/PortfolioViewV2.tsx
sed -i 's/<span className="text-\[9px\] font-medium text-slate-400 uppercase tracking-widest block font-sans">/<!-- <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest block font-sans">/g' src/components/portfolio_v2/PortfolioViewV2.tsx
sed -i 's/Lead Strategist/Lead Strategist --><span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest block font-sans">Market Intelligence<\/span>/g' src/components/portfolio_v2/PortfolioViewV2.tsx
