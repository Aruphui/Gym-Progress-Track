// File structure:
// - app.js (main server file)
// - /public
//   - /css
//     - style.css
//   - /js
//     - main.js
// - /views
//   - index.html

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

// ----- CSS FILE (public/css/style.css) -----
/* 
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background-color: #2c3e50;
  color: #fff;
  padding: 20px 0;
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  margin: 0;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.tab-button {
  background-color: #f1f1f1;
  border: none;
  padding: 15px 25px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.tab-button:hover {
  background-color: #ddd;
}

.tab-button.active {
  background-color: #2c3e50;
  color: white;
}

.tab-content {
  display: none;
  padding: 20px;
  background-color: #fff;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.tab-content.active {
  display: block;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

button {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #219653;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #2c3e50;
  color: white;
}

tr:hover {
  background-color: #f5f5f5;
}

.chart-container {
  height: 400px;
  margin-top: 30px;
}

.filter-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-controls label {
  margin-bottom: 0;
  margin-right: 5px;
}

.filter-controls select {
  width: auto;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@media (max-width: 768px) {
  .tabs {
    flex-direction: column;
  }
  
  .tab-button {
    width: 100%;
  }
}
*/

// ----- JavaScript (public/js/main.js) -----
/*
document.addEventListener('DOMContentLoaded', function() {
  // Tab functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to current button and content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Activate first tab by default
  tabButtons[0].click();
  
  // Load muscle groups for dropdowns
  const muscleGroups = ["Biceps", "Triceps", "Back", "Chest", "Shoulders", "Legs"];
  
  const muscleGroupDropdowns = document.querySelectorAll('.muscle-group-dropdown');
  muscleGroupDropdowns.forEach(dropdown => {
    muscleGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      dropdown.appendChild(option);
    });
  });
  
  // Load exercises
  loadExercises();
  loadProgress();
  setupChartFilters();
  
  // Add exercise form
  const addExerciseForm = document.getElementById('add-exercise-form');
  if (addExerciseForm) {
    addExerciseForm.addEventListener('submit', event => {
      event.preventDefault();
      
      const exerciseName = document.getElementById('exercise-name').value.trim();
      const muscleGroup = document.getElementById('muscle-group').value;
      
      if (!exerciseName || !muscleGroup) {
        showAlert('Please enter both exercise name and select a muscle group.', 'error');
        return;
      }
      
      fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: exerciseName,
          muscle_group: muscleGroup
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          showAlert(data.error, 'error');
        } else {
          showAlert('Exercise added successfully!', 'success');
          document.getElementById('exercise-name').value = '';
          document.getElementById('muscle-group').value = '';
          loadExercises();
        }
      })
      .catch(error => {
        showAlert('Error adding exercise: ' + error, 'error');
      });
    });
  }
  
  // Add progress form
  const addProgressForm = document.getElementById('add-progress-form');
  if (addProgressForm) {
    addProgressForm.addEventListener('submit', event => {
      event.preventDefault();
      
      const exerciseId = document.getElementById('progress-exercise').value;
      const weight = document.getElementById('weight').value.trim();
      const date = document.getElementById('date').value;
      
      if (!exerciseId || !weight || !date) {
        showAlert('Please select an exercise, enter a weight, and select a date.', 'error');
        return;
      }
      
      fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercise_id: exerciseId,
          weight: parseFloat(weight),
          date: date
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          showAlert(data.error, 'error');
        } else {
          showAlert('Progress added successfully!', 'success');
          document.getElementById('weight').value = '';
          loadProgress();
        }
      })
      .catch(error => {
        showAlert('Error adding progress: ' + error, 'error');
      });
    });
  }
  
  // Set default date
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    let month = today.getMonth() + 1;
    let day = today.getDate();
    
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;
    
    dateInput.value = `${year}-${month}-${day}`;
  }
  
  // Generate chart button
  const generateChartBtn = document.getElementById('generate-chart');
  if (generateChartBtn) {
    generateChartBtn.addEventListener('click', generateChart);
  }
});

function loadExercises() {
  // Load exercises for the exercises table
  fetch('/api/exercises')
    .then(response => response.json())
    .then(exercises => {
      updateExercisesTable(exercises);
      updateExerciseDropdowns(exercises);
    })
    .catch(error => {
      console.error('Error loading exercises:', error);
    });
}

function updateExercisesTable(exercises) {
  const exercisesTable = document.getElementById('exercises-table-body');
  if (!exercisesTable) return;
  
  exercisesTable.innerHTML = '';
  
  if (exercises.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3">No exercises found. Add some exercises to get started!</td>';
    exercisesTable.appendChild(row);
    return;
  }
  
  exercises.forEach(exercise => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${exercise.id}</td>
      <td>${exercise.name}</td>
      <td>${exercise.muscle_group}</td>
    `;
    exercisesTable.appendChild(row);
  });
}

function updateExerciseDropdowns(exercises) {
  const progressExerciseDropdown = document.getElementById('progress-exercise');
  const chartExerciseDropdown = document.getElementById('chart-exercise');
  
  if (progressExerciseDropdown) {
    progressExerciseDropdown.innerHTML = '<option value="">Select Exercise</option>';
    
    exercises.forEach(exercise => {
      const option = document.createElement('option');
      option.value = exercise.id;
      option.textContent = `${exercise.name} (${exercise.muscle_group})`;
      progressExerciseDropdown.appendChild(option);
    });
  }
  
  if (chartExerciseDropdown) {
    chartExerciseDropdown.innerHTML = '<option value="all">All Exercises</option>';
    
    exercises.forEach(exercise => {
      const option = document.createElement('option');
      option.value = exercise.id;
      option.textContent = `${exercise.name} (${exercise.muscle_group})`;
      chartExerciseDropdown.appendChild(option);
    });
  }
}

function loadProgress() {
  fetch('/api/progress')
    .then(response => response.json())
    .then(progress => {
      updateProgressTable(progress);
    })
    .catch(error => {
      console.error('Error loading progress:', error);
    });
}

function updateProgressTable(progress) {
  const progressTable = document.getElementById('progress-table-body');
  if (!progressTable) return;
  
  progressTable.innerHTML = '';
  
  if (progress.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4">No progress entries found. Add some progress to get started!</td>';
    progressTable.appendChild(row);
    return;
  }
  
  // Limit to the most recent 10 entries
  const recentProgress = progress.slice(0, 10);
  
  recentProgress.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.exercise_name} (${entry.muscle_group})</td>
      <td>${entry.weight}</td>
      <td>${entry.date}</td>
    `;
    progressTable.appendChild(row);
  });
}

function setupChartFilters() {
  const muscleGroupFilter = document.getElementById('chart-muscle-group');
  const exerciseFilter = document.getElementById('chart-exercise');
  
  if (muscleGroupFilter) {
    muscleGroupFilter.addEventListener('change', () => {
      const selectedGroup = muscleGroupFilter.value;
      
      if (selectedGroup === 'all') {
        fetch('/api/exercises')
          .then(response => response.json())
          .then(exercises => {
            updateChartExerciseOptions(exercises, exerciseFilter);
          });
      } else {
        fetch(`/api/exercises/muscle/${selectedGroup}`)
          .then(response => response.json())
          .then(exercises => {
            updateChartExerciseOptions(exercises, exerciseFilter);
          });
      }
    });
  }
}

function updateChartExerciseOptions(exercises, dropdown) {
  if (!dropdown) return;
  
  dropdown.innerHTML = '<option value="all">All Exercises</option>';
  
  exercises.forEach(exercise => {
    const option = document.createElement('option');
    option.value = exercise.id;
    option.textContent = exercise.name;
    dropdown.appendChild(option);
  });
}

function generateChart() {
  const muscleGroup = document.getElementById('chart-muscle-group').value;
  const exerciseId = document.getElementById('chart-exercise').value;
  const timeRange = document.getElementById('chart-time-range').value;
  
  let apiUrl = '/api/progress';
  
  if (exerciseId !== 'all') {
    apiUrl = `/api/progress/exercise/${exerciseId}`;
  } else if (muscleGroup !== 'all') {
    apiUrl = `/api/progress/muscle/${muscleGroup}`;
  }
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Filter by time range if needed
      const filteredData = filterDataByTimeRange(data, timeRange);
      
      if (filteredData.length === 0) {
        showAlert('No data available for the selected filters.', 'error');
        document.getElementById('chart-container').innerHTML = '';
        return;
      }
      
      renderChart(filteredData);
    })
    .catch(error => {
      console.error('Error generating chart:', error);
      showAlert('Error generating chart. Please try again.', 'error');
    });
}

function filterDataByTimeRange(data, timeRange) {
  const today = new Date();
  let cutoffDate;
  
  switch (timeRange) {
    case 'last-month':
      cutoffDate = new Date();
      cutoffDate.setMonth(today.getMonth() - 1);
      break;
    case 'last-3-months':
      cutoffDate = new Date();
      cutoffDate.setMonth(today.getMonth() - 3);
      break;
    case 'last-6-months':
      cutoffDate = new Date();
      cutoffDate.setMonth(today.getMonth() - 6);
      break;
    default:
      // All time
      return data;
  }
  
  return data.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= cutoffDate;
  });
}

function renderChart(data) {
  const chartContainer = document.getElementById('chart-container');
  
  // Group data by exercise
  const exerciseData = {};
  
  data.forEach(entry => {
    const key = `${entry.exercise_name} (${entry.muscle_group})`;
    
    if (!exerciseData[key]) {
      exerciseData[key] = {
        dates: [],
        weights: []
      };
    }
    
    exerciseData[key].dates.push(entry.date);
    exerciseData[key].weights.push(entry.weight);
  });
  
  // Create datasets for Chart.js
  const datasets = [];
  const colors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)'
  ];
  
  let colorIndex = 0;
  
  for (const exercise in exerciseData) {
    datasets.push({
      label: exercise,
      data: exerciseData[exercise].weights,
      backgroundColor: colors[colorIndex % colors.length],
      borderColor: colors[colorIndex % colors.length].replace('0.8', '1'),
      tension: 0.1
    });
    
    colorIndex++;
  }
  
  // Get all unique dates across all exercises
  const allDates = [...new Set(data.map(entry => entry.date))].sort();
  
  // Chart setup using Chart.js (would be loaded via CDN in the HTML)
  chartContainer.innerHTML = '<canvas id="progressChart"></canvas>';
  
  // This would be executed if Chart.js is available
  // The code below shows the structure but won't work without Chart.js
  /*
  const ctx = document.getElementById('progressChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: allDates,
      datasets: datasets
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Weight'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        }
      }
    }
  });
  */
  
  // For now, render a simple visualization
  let html = '<div class="chart-placeholder">';
  html += '<h3>Progress Chart</h3>';
  
  for (const exercise in exerciseData) {
    html += `<div><h4>${exercise}</h4><table class="chart-table">`;
    html += '<tr><th>Date</th><th>Weight</th></tr>';
    
    for (let i = 0; i < exerciseData[exercise].dates.length; i++) {
      html += `<tr>
        <td>${exerciseData[exercise].dates[i]}</td>
        <td>${exerciseData[exercise].weights[i]}</td>
      </tr>`;
    }
    
    html += '</table></div>';
  }
  
  html += '</div>';
  chartContainer.innerHTML = html;
}

function showAlert(message, type) {
  const alertsContainer = document.getElementById('alerts');
  if (!alertsContainer) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  alertsContainer.appendChild(alert);
  
  // Remove alert after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}
*/

// ----- HTML (views/index.html) -----
/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gym Progress Tracker</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header>
    <div class="container">
      <h1>Gym Progress Tracker</h1>
    </div>
  </header>
  
  <div class="container">
    <div id="alerts"></div>
    
    <div class="tabs">
      <button class="tab-button" data-tab="add-exercise-tab">Add Exercise</button>
      <button class="tab-button" data-tab="update-progress-tab">Update Progress</button>
      <button class="tab-button" data-tab="view-progress-tab">View Progress</button>
    </div>
    
    <!-- Add Exercise Tab -->
    <div id="add-exercise-tab" class="tab-content">
      <h2>Add New Exercise</h2>
      <form id="add-exercise-form">
        <div class="form-group">
          <label for="exercise-name">Exercise Name:</label>
          <input type="text" id="exercise-name" placeholder="Enter exercise name" required>
        </div>
        
        <div class="form-group">
          <label for="muscle-group">Muscle Group:</label>
          <select id="muscle-group" class="muscle-group-dropdown" required>
            <option value="">Select Muscle Group</option>
          </select>
        </div>
        
        <button type="submit">Add Exercise</button>
      </form>
      
      <h3>Existing Exercises</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Exercise Name</th>
            <th>Muscle Group</th>
          </tr>
        </thead>
        <tbody id="exercises-table-body">
          <!-- Exercises will be populated here -->
        </tbody>
      </table>
    </div>
    
    <!-- Update Progress Tab -->
    <div id="update-progress-tab" class="tab-content">
      <h2>Record Progress</h2>
      <form id="add-progress-form">
        <div class="form-group">
          <label for="progress-exercise">Select Exercise:</label>
          <select id="progress-exercise" required>
            <option value="">Select Exercise</option>
            <!-- Exercises will be populated here -->
          </select>
        </div>
        
        <div class="form-group">
          <label for="weight">Weight (lbs/kg):</label>
          <input type="number" id="weight" step="0.1" min="0" placeholder="Enter weight" required>
        </div>
        
        <div class="form-group">
          <label for="date">Date:</label>
          <input type="date" id="date" required>
        </div>
        
        <button type="submit">Record Progress</button>
      </form>
      
      <h3>Recent Progress</h3>
      <table>
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Weight</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="progress-table-body">
          <!-- Progress entries will be populated here -->
        </tbody>
      </table>
    </div>
    
    <!-- View Progress Tab -->
    <div id="view-progress-tab" class="tab-content">
      <h2>View Progress</h2>
      
      <div class="filter-controls">
        <div>
          <label for="chart-muscle-group">Muscle Group:</label>
          <select id="chart-muscle-group" class="muscle-group-dropdown">
            <option value="all">All Muscle Groups</option>
          </select>
        </div>
        
        <div>
          <label for="chart-exercise">Exercise:</label>
          <select id="chart-exercise">
            <option value="all">All Exercises</option>
          </select>
        </div>
        
        <div>
          <label for="chart-time-range">Time Range:</label>
          <select id="chart-time-range">
            <option value="all-time">All Time</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="last-6-months">Last 6 Months</option>
          </select>
        </div>
        
        <button id="generate-chart">Generate Chart</button>
      </div>
      
      <div id="chart-container" class="chart-container">
        <!-- Chart will be displayed here -->
      </div>
    </div>
  </div>
  
  <script src="/js/main.js"></script>
</body>
</html>
*/
