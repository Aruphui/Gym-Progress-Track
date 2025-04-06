// app.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const db = new sqlite3.Database('./gym_progress.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create exercises table
    db.run(`CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL
    )`);
    
    // Create progress table
    db.run(`CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    )`);
  }
});

// Routes
// Get all exercises
app.get('/api/exercises', (req, res) => {
  db.all('SELECT * FROM exercises ORDER BY muscle_group, name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get exercises by muscle group
app.get('/api/exercises/muscle/:group', (req, res) => {
  const muscleGroup = req.params.group;
  db.all('SELECT * FROM exercises WHERE muscle_group = ? ORDER BY name', [muscleGroup], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new exercise
app.post('/api/exercises', (req, res) => {
  const { name, muscle_group } = req.body;
  
  if (!name || !muscle_group) {
    res.status(400).json({ error: 'Exercise name and muscle group are required' });
    return;
  }
  
  // Check if exercise already exists
  db.get('SELECT id FROM exercises WHERE name = ? AND muscle_group = ?', [name, muscle_group], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row) {
      res.status(400).json({ error: 'Exercise already exists' });
      return;
    }
    
    // Insert new exercise
    db.run('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', [name, muscle_group], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        id: this.lastID,
        name: name,
        muscle_group: muscle_group,
        message: 'Exercise added successfully'
      });
    });
  });
});

// Get progress data
app.get('/api/progress', (req, res) => {
  db.all(`
    SELECT p.id, p.exercise_id, e.name as exercise_name, e.muscle_group, p.weight, p.date
    FROM progress p
    JOIN exercises e ON p.exercise_id = e.id
    ORDER BY p.date DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get progress for specific exercise
app.get('/api/progress/exercise/:id', (req, res) => {
  const exerciseId = req.params.id;
  db.all(`
    SELECT p.id, p.exercise_id, e.name as exercise_name, e.muscle_group, p.weight, p.date
    FROM progress p
    JOIN exercises e ON p.exercise_id = e.id
    WHERE p.exercise_id = ?
    ORDER BY p.date
  `, [exerciseId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get progress by muscle group
app.get('/api/progress/muscle/:group', (req, res) => {
  const muscleGroup = req.params.group;
  db.all(`
    SELECT p.id, p.exercise_id, e.name as exercise_name, e.muscle_group, p.weight, p.date
    FROM progress p
    JOIN exercises e ON p.exercise_id = e.id
    WHERE e.muscle_group = ?
    ORDER BY e.name, p.date
  `, [muscleGroup], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add progress entry
app.post('/api/progress', (req, res) => {
  const { exercise_id, weight, date } = req.body;
  
  if (!exercise_id || !weight || !date) {
    res.status(400).json({ error: 'Exercise ID, weight, and date are required' });
    return;
  }
  
  // Check if exercise exists
  db.get('SELECT id FROM exercises WHERE id = ?', [exercise_id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(400).json({ error: 'Exercise does not exist' });
      return;
    }
    
    // Insert progress entry
    db.run('INSERT INTO progress (exercise_id, weight, date) VALUES (?, ?, ?)', 
      [exercise_id, weight, date], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        id: this.lastID,
        exercise_id: exercise_id,
        weight: weight,
        date: date,
        message: 'Progress added successfully'
      });
    });
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Gym progress tracker app listening at http://localhost:${port}`);
});