import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./src/lib/firebase";

async function run() {
  try {
    console.log("=== ADMIN WITHDRAWALS ===");
    const adminWithdrawalsSnap = await getDocs(collection(db, "admin_withdrawals"));
    console.log(`Found ${adminWithdrawalsSnap.size} documents.`);
    adminWithdrawalsSnap.forEach((doc) => {
      console.log(`admin_withdrawals doc ID: ${doc.id} =>`, JSON.stringify(doc.data()));
    });

    console.log("\n=== WITHDRAWALS ===");
    const withdrawalsSnap = await getDocs(collection(db, "withdrawals"));
    console.log(`Found ${withdrawalsSnap.size} documents.`);
    withdrawalsSnap.forEach((doc) => {
      console.log(`withdrawals doc ID: ${doc.id} =>`, JSON.stringify(doc.data()));
    });

    console.log("\n=== USERS ===");
    const usersSnap = await getDocs(collection(db, "users"));
    console.log(`Found ${usersSnap.size} user documents.`);
    usersSnap.forEach((doc) => {
      const u = doc.data();
      if (u.email?.toLowerCase().includes("ruro") || u.email?.toLowerCase().includes("rusdt")) {
        console.log(`User doc ID: ${doc.id} (${u.email}) => withdrawals size:`, Array.isArray(u.withdrawals) ? u.withdrawals.length : "not an array", JSON.stringify(u.withdrawals || []));
      }
    });

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();

