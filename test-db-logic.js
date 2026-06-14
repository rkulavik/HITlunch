import fs from 'fs';
import path from 'path';
import { 
  initDb, 
  getPeople, 
  logLunch, 
  deleteLunch, 
  authenticateUser, 
  deletePerson 
} from './db.js';

process.env.DATABASE_TYPE = 'local';
const dbPath = path.join(process.cwd(), 'database.json');

function cleanDbFile() {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
}

async function runTests() {
  console.log('🧪 Starting HIT Lunch Logic & Security Tests...');
  cleanDbFile();

  try {
    // 1. Init
    await initDb();
    console.log('✅ Local Database initialized.');

    // 2. Test Security Authentication
    console.log('\n🔒 Testing Credential Authentication...');
    const authSuccess = await authenticateUser('Richard', 'password123');
    console.log(`✅ Authenticated Richard: id=${authSuccess.id}, name=${authSuccess.name} (password field hidden)`);

    try {
      await authenticateUser('Richard', 'wrongpassword');
      throw new Error('Allowed login with invalid password!');
    } catch (err) {
      console.log('✅ Blocked invalid passcode: ' + err.message);
    }

    try {
      await authenticateUser('AnonymousUser', 'password123');
      throw new Error('Allowed login for non-existent profile!');
    } catch (err) {
      console.log('✅ Blocked invalid username: ' + err.message);
    }

    // 3. Test Zero-Sum Score Redistribution on Deletion
    // Initial scores: Richard (1): 0, Sarah (2): 0, David (3): 0, Emma (4): 0
    console.log('\n⚖️ Testing Deletion Redistribution Math (Float & Remainder handling)...');
    
    // Log lunch: Richard (1) pays for Sarah (2) and David (3)
    console.log('🍽️ Logging Lunch: Richard (1) pays for Sarah (2) and David (3)...');
    await logLunch({
      payerId: '1',
      attendees: ['2', '3'],
      restaurant: 'Cyber Burger',
      location: { lat: 37.7749, lng: -122.4194 },
      recordedBy: 'Richard'
    });

    let people = await getPeople();
    let scoreSum = people.reduce((sum, p) => sum + p.score, 0);
    console.log(`📊 Balances: ${people.map(p => `${p.name}: ${p.score.toFixed(2)}`).join(', ')}`);
    console.log(`📊 Score Sum: ${scoreSum.toFixed(2)}`);

    // Verify initial transaction balances:
    // Richard: +2.00, Sarah: -1.00, David: -1.00, Emma: 0.00
    if (people.find(p => p.id === '1').score !== 2.00) throw new Error('Richard score mismatch');
    if (people.find(p => p.id === '2').score !== -1.00) throw new Error('Sarah score mismatch');
    if (people.find(p => p.id === '3').score !== -1.00) throw new Error('David score mismatch');
    if (people.find(p => p.id === '4').score !== 0.00) throw new Error('Emma score mismatch');
    if (scoreSum !== 0) throw new Error('Sum is not 0.00');

    // Delete David (id: 3) who has a score of -1.00.
    // Remaining active users are: Richard, Sarah, Emma (3 users).
    // David's score of -1.00 divided by 3:
    // share = -0.33
    // Remaining remainder = -1.00 - (-0.33 * 2) = -0.34
    // Expected new scores:
    // Richard: 2.00 + (-0.33) = 1.67
    // Sarah: -1.00 + (-0.33) = -1.33
    // Emma (last user): 0.00 + (-0.34) = -0.34
    console.log('\n❌ Deleting David (3) with balance -1.00. Redistributing to remaining 3 users...');
    await deletePerson('3');

    people = await getPeople();
    scoreSum = people.reduce((sum, p) => sum + p.score, 0);
    console.log(`📊 Balances: ${people.map(p => `${p.name}: ${p.score.toFixed(2)}`).join(', ')}`);
    console.log(`📊 Score Sum: ${scoreSum.toFixed(2)}`);

    const rScore = people.find(p => p.id === '1').score;
    const sScore = people.find(p => p.id === '2').score;
    const eScore = people.find(p => p.id === '4').score;

    console.log(`🔎 Asserts: Richard = ${rScore} (expected 1.67), Sarah = ${sScore} (expected -1.33), Emma = ${eScore} (expected -0.34)`);
    if (rScore !== 1.67) throw new Error(`Richard redistribution failed: got ${rScore}`);
    if (sScore !== -1.33) throw new Error(`Sarah redistribution failed: got ${sScore}`);
    if (eScore !== -0.34) throw new Error(`Emma redistribution failed: got ${eScore}`);
    
    // Crucial: check zero-sum total
    if (parseFloat(scoreSum.toFixed(2)) !== 0.00) {
      throw new Error(`REDISTRIBUTION BROKE ZERO-SUM INVARIANT: SUM IS ${scoreSum.toFixed(2)}`);
    }
    console.log('✅ Remainder-safe zero-sum redistribution verified.');

    console.log('\n🎉 ALL HIT LUNCH CORE ALGORITHM & AUTH TESTS PASSED! 🎉');

  } catch (error) {
    console.error('\n❌ TESTING TERMINATED:', error.message);
    process.exit(1);
  } finally {
    cleanDbFile();
  }
}

runTests();
