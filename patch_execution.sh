#!/bin/bash
sed -i -e 's/getChartTimeForDate = (date: Date): string => {/getChartTimeForDate = (date: Date): any => {/g' src/components/portfolio_v2/PortfolioViewV2.tsx
