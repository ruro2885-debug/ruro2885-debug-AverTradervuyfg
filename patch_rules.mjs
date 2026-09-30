import fs from 'fs';

const rules = fs.readFileSync('./firestore.rules', 'utf8');

const replacement = `
    match /traderProfiles/{traderId} {
      allow read, write: if true;
    }
    
    // 4. Admin Specific Collections
`;

const updatedRules = rules.replace('    // 4. Admin Specific Collections', replacement);
fs.writeFileSync('./firestore.rules', updatedRules);
