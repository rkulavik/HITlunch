import { Firestore } from '@google-cloud/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const LOCAL_DB_PATH = path.join(process.cwd(), 'database.json');
let dbType = 'local';
let firestoreDb = null;
let localDbCache = null;

// Initialize Database
export async function initDb() {
  const forceType = process.env.DATABASE_TYPE;
  
  if (forceType === 'firestore') {
    try {
      firestoreDb = new Firestore();
      dbType = 'firestore';
      console.log('⚡ Using Firestore database (Forced by env).');
      return;
    } catch (error) {
      console.error('❌ Failed to force Firestore connection, falling back to local JSON.', error);
    }
  }

  // Auto-detect Firestore / GCP environment
  if (process.env.K_SERVICE || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GAE_SERVICE) {
    try {
      firestoreDb = new Firestore();
      dbType = 'firestore';
      console.log('⚡ GCP Environment detected: Using Firestore database.');
      return;
    } catch (error) {
      console.warn('⚠️ GCP Env detected but Firestore failed to init. Using local JSON instead. Error:', error.message);
    }
  }

  // Fallback to local file DB
  dbType = 'local';
  console.log('⚡ Using local JSON database (database.json).');
  
  // Create database.json if it doesn't exist
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDb = {
      people: [
        { id: '1', name: 'Richard', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '2', name: 'Sarah', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '3', name: 'David', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '4', name: 'Emma', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() }
      ],
      lunches: [],
      settings: {
        theme: 'dark',
        adminPin: '1234'
      }
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
    console.log('✅ Created default database.json with seed data.');
    localDbCache = defaultDb;
  } else {
    try {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      localDbCache = JSON.parse(data);
    } catch (err) {
      console.error('Error seeding local database cache, initializing empty cache:', err);
      localDbCache = { people: [], lunches: [], settings: { theme: 'dark', adminPin: '1234' } };
    }
  }
}

// Helper to read local DB (uses memory cache)
function readLocalDb() {
  if (!localDbCache) {
    try {
      if (fs.existsSync(LOCAL_DB_PATH)) {
        const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
        localDbCache = JSON.parse(data);
      } else {
        localDbCache = { people: [], lunches: [], settings: { theme: 'dark', adminPin: '1234' } };
      }
    } catch (err) {
      console.error('Error lazy loading local database:', err);
      localDbCache = { people: [], lunches: [], settings: { theme: 'dark', adminPin: '1234' } };
    }
  }
  return localDbCache;
}

// Helper to write local DB (asynchronous non-blocking file write)
function writeLocalDb(data) {
  localDbCache = data;
  fs.promises.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8')
    .catch(err => {
      console.error('Error writing local JSON file asynchronously:', err);
    });
}

// --- PEOPLE API & AUTH ---

export async function getPeople() {
  if (dbType === 'firestore') {
    const snapshot = await firestoreDb.collection('people').orderBy('name').get();
    const people = [];
    snapshot.forEach(doc => {
      people.push({ id: doc.id, ...doc.data() });
    });
    
    // If Firestore is empty, let's seed default people
    if (people.length === 0) {
      const defaultPeople = [
        { name: 'Richard', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() },
        { name: 'Sarah', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() },
        { name: 'David', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() },
        { name: 'Emma', password: 'password123', score: 0, isActive: true, createdAt: new Date().toISOString() }
      ];
      for (const p of defaultPeople) {
        const docRef = await firestoreDb.collection('people').add(p);
        people.push({ id: docRef.id, ...p });
      }
      console.log('✅ Seeded default people to empty Firestore DB.');
    }
    return people;
  } else {
    const data = readLocalDb();
    return data.people;
  }
}

export async function authenticateUser(username, password) {
  const people = await getPeople();
  const user = people.find(p => p.name.toLowerCase() === username.toLowerCase().trim());
  if (!user) {
    throw new Error('User profile not found');
  }
  if (user.password !== password) {
    throw new Error('Invalid security credentials');
  }
  const { password: _, ...safeUser } = user;
  return safeUser;
}

export async function addPerson(name, password = 'password123') {
  if (dbType === 'firestore') {
    const newPerson = {
      name,
      password,
      score: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    const docRef = await firestoreDb.collection('people').add(newPerson);
    return { id: docRef.id, ...newPerson };
  } else {
    const data = readLocalDb();
    const newPerson = {
      id: crypto.randomUUID(),
      name,
      password,
      score: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    data.people.push(newPerson);
    writeLocalDb(data);
    return newPerson;
  }
}

export async function updatePerson(id, updates) {
  if (dbType === 'firestore') {
    const docRef = firestoreDb.collection('people').doc(id);
    await docRef.update(updates);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  } else {
    const data = readLocalDb();
    const index = data.people.findIndex(p => p.id === id);
    if (index !== -1) {
      data.people[index] = { ...data.people[index], ...updates };
      writeLocalDb(data);
      return data.people[index];
    }
    throw new Error('Person not found');
  }
}

/**
 * Delete a user profile and redistribute their score among active users to maintain zero-sum pool.
 */
export async function deletePerson(id) {
  if (dbType === 'firestore') {
    await firestoreDb.runTransaction(async (transaction) => {
      const targetRef = firestoreDb.collection('people').doc(id);
      const targetDoc = await transaction.get(targetRef);
      if (!targetDoc.exists) {
        throw new Error('Person profile not found');
      }

      const scoreToDelete = targetDoc.data().score || 0;

      // Fetch all other active users
      const allDocsSnapshot = await firestoreDb.collection('people').get();
      const otherActiveDocs = [];
      allDocsSnapshot.forEach(doc => {
        if (doc.id !== id && doc.data().isActive) {
          otherActiveDocs.push(doc);
        }
      });

      if (otherActiveDocs.length === 0 && scoreToDelete !== 0) {
        throw new Error('Cannot delete profile with non-zero balance when no other active profiles exist.');
      }

      // Redistribute balance if they have a non-zero score and others exist
      if (otherActiveDocs.length > 0 && scoreToDelete !== 0) {
        const share = parseFloat((scoreToDelete / otherActiveDocs.length).toFixed(2));
        let totalDistributed = 0;

        otherActiveDocs.forEach((doc, idx) => {
          let finalShare = share;
          if (idx === otherActiveDocs.length - 1) {
            // Remainder adjustment for exact balance match
            finalShare = parseFloat((scoreToDelete - totalDistributed).toFixed(2));
          } else {
            totalDistributed += share;
          }

          const currentScore = doc.data().score || 0;
          transaction.update(doc.ref, { score: parseFloat((currentScore + finalShare).toFixed(2)) });
        });
      }

      // Delete target person document
      transaction.delete(targetRef);
    });
    return { success: true };
  } else {
    const data = readLocalDb();
    const index = data.people.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Person profile not found');

    const scoreToDelete = data.people[index].score;

    // Find other active users
    const otherActive = data.people.filter(p => p.id !== id && p.isActive);

    if (otherActive.length === 0 && scoreToDelete !== 0) {
      throw new Error('Cannot delete profile with non-zero balance when no other active profiles exist.');
    }

    if (otherActive.length > 0 && scoreToDelete !== 0) {
      const share = parseFloat((scoreToDelete / otherActive.length).toFixed(2));
      let totalDistributed = 0;

      otherActive.forEach((p, idx) => {
        let finalShare = share;
        if (idx === otherActive.length - 1) {
          finalShare = parseFloat((scoreToDelete - totalDistributed).toFixed(2));
        } else {
          totalDistributed += share;
        }
        p.score = parseFloat((p.score + finalShare).toFixed(2));
      });
    }

    // Remove from array
    data.people.splice(index, 1);
    writeLocalDb(data);
    return { success: true };
  }
}

/**
 * Reset all logs and seed database with a list of initial people at zero balance.
 */
export async function resetDatabaseState(names) {
  if (!names || !Array.isArray(names) || names.length === 0) {
    throw new Error('Initial state must contain at least one person');
  }

  const newPeople = names.map((name, index) => {
    return {
      name: name.trim(),
      password: 'password123',
      score: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };
  });

  if (dbType === 'firestore') {
    // 1. Delete all lunches
    const lunchesSnapshot = await firestoreDb.collection('lunches').get();
    const batch = firestoreDb.batch();
    lunchesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 2. Delete all people
    const peopleSnapshot = await firestoreDb.collection('people').get();
    peopleSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 3. Add new people
    for (const p of newPeople) {
      const newDocRef = firestoreDb.collection('people').doc();
      batch.set(newDocRef, p);
    }

    await batch.commit();
  } else {
    // Local JSON
    const data = readLocalDb();
    data.lunches = [];
    data.people = newPeople.map((p, idx) => ({
      id: String(idx + 1),
      ...p
    }));
    writeLocalDb(data);
  }

  return { success: true };
}

// --- LUNCHES API & ALGORITHM ---

export async function getLunches() {
  if (dbType === 'firestore') {
    const snapshot = await firestoreDb.collection('lunches').orderBy('date', 'desc').get();
    const lunches = [];
    snapshot.forEach(doc => {
      lunches.push({ id: doc.id, ...doc.data() });
    });
    return lunches;
  } else {
    const data = readLocalDb();
    return [...data.lunches].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

export async function logLunch({ payerId, attendees, restaurant, location, recordedBy }) {
  if (attendees.length === 0) {
    throw new Error('Lunch must have at least one attendee besides the payer');
  }

  const lunchDate = new Date().toISOString();
  
  if (dbType === 'firestore') {
    const result = await firestoreDb.runTransaction(async (transaction) => {
      const payerDocRef = firestoreDb.collection('people').doc(payerId);
      const payerDoc = await transaction.get(payerDocRef);
      if (!payerDoc.exists) throw new Error('Payer does not exist');
      
      const attendeeRefs = attendees.map(id => firestoreDb.collection('people').doc(id));
      const attendeeDocs = await Promise.all(attendeeRefs.map(ref => transaction.get(ref)));
      
      attendeeDocs.forEach((doc, idx) => {
        if (!doc.exists) throw new Error(`Attendee with ID ${attendees[idx]} does not exist`);
      });

      const lunchDocRef = firestoreDb.collection('lunches').doc();
      const lunchData = {
        date: lunchDate,
        payerId,
        attendees,
        amount: attendees.length,
        restaurant: restaurant || 'Coordinates Locked',
        location,
        recordedBy,
        createdAt: lunchDate
      };
      transaction.set(lunchDocRef, lunchData);

      const payerScoreChange = attendees.length;
      transaction.update(payerDocRef, { score: parseFloat(((payerDoc.data().score || 0) + payerScoreChange).toFixed(2)) });

      attendeeDocs.forEach(doc => {
        transaction.update(doc.ref, { score: parseFloat(((doc.data().score || 0) - 1).toFixed(2)) });
      });

      return { id: lunchDocRef.id, ...lunchData };
    });

    return result;
  } else {
    const data = readLocalDb();
    
    const payer = data.people.find(p => p.id === payerId);
    if (!payer) throw new Error('Payer not found');

    const attendeesList = data.people.filter(p => attendees.includes(p.id));
    if (attendeesList.length !== attendees.length) {
      throw new Error('One or more attendees not found');
    }

    payer.score = parseFloat((payer.score + attendees.length).toFixed(2));
    attendeesList.forEach(p => {
      p.score = parseFloat((p.score - 1).toFixed(2));
    });

    const newLunch = {
      id: crypto.randomUUID(),
      date: lunchDate,
      payerId,
      attendees,
      amount: attendees.length,
      restaurant: restaurant || 'Coordinates Locked',
      location,
      recordedBy,
      createdAt: lunchDate
    };

    data.lunches.push(newLunch);
    writeLocalDb(data);

    return newLunch;
  }
}

export async function deleteLunch(lunchId) {
  if (dbType === 'firestore') {
    await firestoreDb.runTransaction(async (transaction) => {
      const lunchRef = firestoreDb.collection('lunches').doc(lunchId);
      const lunchDoc = await transaction.get(lunchRef);
      if (!lunchDoc.exists) throw new Error('Lunch log not found');
      
      const { payerId, attendees } = lunchDoc.data();

      const payerDocRef = firestoreDb.collection('people').doc(payerId);
      const payerDoc = await transaction.get(payerDocRef);

      const attendeeRefs = attendees.map(id => firestoreDb.collection('people').doc(id));
      const attendeeDocs = await Promise.all(attendeeRefs.map(ref => transaction.get(ref)));

      if (payerDoc.exists) {
        const payerScoreRevert = attendees.length;
        transaction.update(payerDocRef, { score: parseFloat(((payerDoc.data().score || 0) - payerScoreRevert).toFixed(2)) });
      }

      attendeeDocs.forEach(doc => {
        if (doc.exists) {
          transaction.update(doc.ref, { score: parseFloat(((doc.data().score || 0) + 1).toFixed(2)) });
        }
      });

      transaction.delete(lunchRef);
    });
    return { success: true };
  } else {
    const data = readLocalDb();
    
    const lunchIdx = data.lunches.findIndex(l => l.id === lunchId);
    if (lunchIdx === -1) throw new Error('Lunch record not found');

    const lunch = data.lunches[lunchIdx];
    const { payerId, attendees } = lunch;

    const payer = data.people.find(p => p.id === payerId);
    if (payer) {
      payer.score = parseFloat((payer.score - attendees.length).toFixed(2));
    }

    attendees.forEach(id => {
      const attendee = data.people.find(p => p.id === id);
      if (attendee) {
        attendee.score = parseFloat((attendee.score + 1).toFixed(2));
      }
    });

    data.lunches.splice(lunchIdx, 1);
    writeLocalDb(data);

    return { success: true };
  }
}

// --- SETTINGS API ---

export async function getSettings() {
  if (dbType === 'firestore') {
    const docRef = firestoreDb.collection('settings').doc('config');
    const doc = await docRef.get();
    if (!doc.exists) {
      const defaultSettings = { theme: 'dark', adminPin: '1234' };
      await docRef.set(defaultSettings);
      return defaultSettings;
    }
    return doc.data();
  } else {
    const data = readLocalDb();
    return data.settings || { theme: 'dark', adminPin: '1234' };
  }
}

export async function updateSettings(updates) {
  if (dbType === 'firestore') {
    const docRef = firestoreDb.collection('settings').doc('config');
    await docRef.update(updates);
    const updated = await docRef.get();
    return updated.data();
  } else {
    const data = readLocalDb();
    data.settings = { ...data.settings, ...updates };
    writeLocalDb(data);
    return data.settings;
  }
}

export function getDbType() {
  return dbType;
}
