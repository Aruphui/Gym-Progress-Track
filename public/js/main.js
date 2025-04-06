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