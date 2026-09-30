import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TraderProfile } from '../types/trading';
import { getAvatarDataUrl } from '../utils/avatarGenerator';
import { 
  initSimulatedTraders, 
  runSimulationTick, 
  getTraderEquityCurve,
  SimulatedTrader 
} from '../utils/traderSimulation';

const mapSimulatedTraderToFirestore = (t: SimulatedTrader): any => {
  const ret30 = t.return30D || (12 + (parseInt(t.id.replace(/\D/g, '')) || 1) % 50);
  return {
    ...t, // Keep all high-fidelity SimulatedTrader fields so CopyTradeDashboard works perfectly
    return30D: ret30,
    return30d: ret30,
    overallReturn: t.returnAllTime || ret30 * 2.5 || 120,
    lossRate: 100 - (t.winRate || 75),
    strategy: t.strategyName || 'Algorithmic Alpha Engine',
    riskRating: t.riskLevel === 'HIGH' ? 'High' : t.riskLevel === 'MEDIUM' ? 'Medium' : 'Low',
    avatar: t.avatarUrl || getAvatarDataUrl(t.avatarSeed),
    equityCurve: getTraderEquityCurve(t, '30d').dataPoints
  };
};

export const seedTraders = async () => {
    try {
        const tradersRef = collection(db, 'traderProfiles');
        const snapshot = await getDocs(tradersRef);
        
        // Only seed if collection is completely empty to save quota
        if (snapshot.empty) {
            console.log("Seeding high-fidelity procedurally-generated copy traders to Firestore...");
            
            // Generate high-fidelity traders from traderSimulation
            const simulatedTraders = initSimulatedTraders();
            
            // Limit to 10 traders to save quota during seeding
            for (const t of simulatedTraders.slice(0, 10)) {
                const mapped = mapSimulatedTraderToFirestore(t);
                await setDoc(doc(tradersRef, t.id), mapped);
            }
            console.log("High-fidelity copy traders seeded successfully.");
        }
    } catch (error) {
        console.error("Error in seedTraders:", error);
    }
};

export const startTraderSimulator = () => {
    console.log("startTraderSimulator disabled to save Firestore quota.");
    return () => {};
};

