#!/bin/bash
sed -i -e '/const completedAiTrades = /c\  const completedAiTrades = trades.length || 0;' src/components/Dashboard.tsx

sed -i -e '/const loginStreak = useMemo(() => {/,/}, \[user?.history\]);/c\
  const loginStreak = useMemo(() => {\
    const activityDates = activity.map((h: any) => new Date(h.timestamp).toDateString());\
    const uniqueDates = Array.from(new Set(activityDates)) as string[];\
    uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());\
    let streak = 0;\
    const now = new Date();\
    for (let i = 0; i < uniqueDates.length; i++) {\
      const date = new Date(uniqueDates[i]);\
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));\
      if (diffDays <= i + 1) {\
        streak++;\
      } else {\
        break;\
      }\
    }\
    return Math.max(1, streak);\
  }, [activity]);
' src/components/Dashboard.tsx

sed -i -e '/const profitableDays = useMemo(() => {/,/}, \[user?.trades\]);/c\
  const profitableDays = useMemo(() => {\
    let run = 0;\
    for (let i = 0; i < trades.length; i++) {\
      if (trades[i].pnl && trades[i].pnl! > 0) {\
        run++;\
      } else if (trades[i].pnl && trades[i].pnl! <= 0) {\
        break;\
      }\
    }\
    return run;\
  }, [trades]);
' src/components/Dashboard.tsx

sed -i -e '/const totalXp = /c\  const totalXp = (referralCount * 250) + (completedAiTrades * 120) + (trades.length || 0) * 80 + ((user?.totalDeposits || 0) * 0.1);' src/components/Dashboard.tsx
