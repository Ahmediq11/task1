// Check authentication
function checkAuth() {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  if (!token || !username) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Initialize dashboard
async function initDashboard() {
  if (!checkAuth()) return;

  document.getElementById("username").textContent =
    localStorage.getItem("username");
  await loadTasks();
}

// Show feedback message
function showFeedback(message, type = "success") {
  const feedback = document.getElementById("feedback");
  feedback.textContent = message;
  feedback.className = `alert alert-${type} mb-3`;
  setTimeout(() => {
    feedback.className = "alert d-none";
  }, 3000);
}

// Update task count
function updateTaskCount(tasks) {
  const count = tasks.length;
  document.getElementById("taskCount").textContent = `${count}/10`;
  return count;
}

// Load tasks
async function loadTasks() {
  try {
    const response = await fetch("http://localhost:3000/tasks", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load tasks");
    }

    const tasks = await response.json();
    const activeTaskList = document.getElementById("activeTaskList");
    const completedTaskList = document.getElementById("completedTaskList");

    // Clear both lists
    activeTaskList.innerHTML = "";
    completedTaskList.innerHTML = "";

    // Sort tasks by completion status
    const activeTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);

    // Function to create task element
    const createTaskElement = (task) => {
      const li = document.createElement("li");
      li.className = "list-group-item fade-in";

      // Format the date
      const taskDate = new Date(task.created_at);
      const formattedDate = taskDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML = `
          <div class="d-flex justify-content-between align-items-start">
            <div class="task-content">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" 
                       ${task.completed ? "checked" : ""} 
                       onchange="toggleTask(${task.id}, this.checked)">
                <label class="form-check-label ${
                  task.completed
                    ? "text-decoration-line-through text-secondary"
                    : ""
                }">
                  ${task.title}
                </label>
              </div>
              <div class="task-date text-secondary">
                <small>Created: ${formattedDate}</small>
              </div>
            </div>
            <button class="btn btn-icon btn-danger" onclick="deleteTask(${
              task.id
            })" title="Delete task">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;
      return li;
    };

    // Populate active tasks
    activeTasks.forEach((task) => {
      activeTaskList.appendChild(createTaskElement(task));
    });

    // Populate completed tasks
    completedTasks.forEach((task) => {
      completedTaskList.appendChild(createTaskElement(task));
    });

    updateTaskCount(tasks);
  } catch (error) {
    showFeedback(error.message, "danger");
  }
}

// Add new task
document.getElementById("taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = document.getElementById("taskInput");
  const title = input.value.trim();

  if (!title) return;

  try {
    const response = await fetch("http://localhost:3000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ title }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add task");
    }

    input.value = "";
    showFeedback("Task added successfully");
    await loadTasks();
  } catch (error) {
    showFeedback(error.message, "danger");
  }
});

// Toggle task completion
async function toggleTask(taskId, completed) {
  try {
    const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ completed }),
    });

    if (!response.ok) {
      throw new Error("Failed to update task");
    }

    showFeedback("Task updated successfully");
    await loadTasks();
  } catch (error) {
    showFeedback(error.message, "danger");
    await loadTasks(); // Reload to revert UI
  }
}

// Delete task
async function deleteTask(taskId) {
  try {
    const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete task");
    }

    showFeedback("Task deleted successfully");
    await loadTasks();
  } catch (error) {
    showFeedback(error.message, "danger");
  }
}

// Logout function
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "index.html";
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", initDashboard);
