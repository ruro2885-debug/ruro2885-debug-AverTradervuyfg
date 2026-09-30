import fs from 'fs';

const rules = fs.readFileSync('./firestore.rules', 'utf8');

const replacement = `
    match /portfolio/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }
    
    // 5. User Bonus States
`;

const updatedRules = rules.replace('    // 5. User Bonus States', replacement);
fs.writeFileSync('./firestore.rules', updatedRules);
