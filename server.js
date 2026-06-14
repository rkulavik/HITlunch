import express from 'express';
import cors from 'cors';
import path from 'path';
import {
  initDb,
  getPeople,
  addPerson,
  updatePerson,
  deletePerson,
  authenticateUser,
  getLunches,
  logLunch,
  deleteLunch,
  getSettings,
  updateSettings,
  getDbType,
  resetDatabaseState
} from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize DB and launch server
async function startServer() {
  await initDb();
  
  // API Routes
  
  // People
  app.get('/api/people', async (req, res) => {
    try {
      const people = await getPeople();
      res.json(people);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/people', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }
      const newPerson = await addPerson(name.trim());
      res.status(201).json(newPerson);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/people/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, name, password } = req.body;
      const updates = {};
      
      if (isActive !== undefined) updates.isActive = isActive;
      if (name !== undefined) updates.name = name.trim();
      if (password !== undefined) updates.password = password;
      
      const updated = await updatePerson(id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/people/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deletePerson(id);
      res.json({ success: true, message: 'Person profile deleted and balances redistributed.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const user = await authenticateUser(username, password);
      res.json({ success: true, user });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });

  // Lunches
  app.get('/api/lunches', async (req, res) => {
    try {
      const lunches = await getLunches();
      res.json(lunches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lunches', async (req, res) => {
    try {
      const { payerId, attendees, restaurant, location, recordedBy } = req.body;
      
      if (!payerId) {
        return res.status(400).json({ error: 'Payer ID is required' });
      }
      if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
        return res.status(400).json({ error: 'At least one attendee is required' });
      }
      if (!recordedBy) {
        return res.status(400).json({ error: 'Recorder identity is required' });
      }

      const newLunch = await logLunch({
        payerId,
        attendees,
        restaurant: restaurant || 'Unknown Restaurant',
        location: location || { lat: null, lng: null },
        recordedBy
      });
      res.status(201).json(newLunch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/lunches/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteLunch(id);
      res.json({ success: true, message: 'Lunch log deleted and scores reverted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await getSettings();
      res.json({ ...settings, dbType: getDbType() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const updates = req.body;
      const updated = await updateSettings(updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/settings/reset', async (req, res) => {
    try {
      const { people } = req.body;
      if (!people || !Array.isArray(people) || people.length === 0) {
        return res.status(400).json({ error: 'Array of names is required' });
      }
      const result = await resetDatabaseState(people);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve static frontend files in production
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  
  // Catch-all route to serve the built index.html for React Router / Single Page Apps
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HIT Lunch Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Express server:', err);
});
