const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, "your_jwt_secret", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Database connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "user_auth",
});

// Create tasks table
connection.query(
  `
    CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating tasks table:", err);
      return;
    }
    console.log("Tasks table created or already exists");
  }
);

// Existing routes (register and login) remain the same...

// Get all tasks for user
app.get("/tasks", authenticateToken, (req, res) => {
  connection.query(
    "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.userId],
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Error fetching tasks" });
      }
      res.json(results);
    }
  );
});

// Create new task
app.post("/tasks", authenticateToken, async (req, res) => {
  const { title } = req.body;

  // Check task limit
  connection.query(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ?",
    [req.user.userId],
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Server error" });
      }

      if (results[0].count >= 10) {
        return res.status(400).json({ message: "Task limit reached (max 10)" });
      }

      // Create task
      connection.query(
        "INSERT INTO tasks (user_id, title) VALUES (?, ?)",
        [req.user.userId, title],
        (error, results) => {
          if (error) {
            return res.status(500).json({ message: "Error creating task" });
          }
          res
            .status(201)
            .json({ id: results.insertId, message: "Task created" });
        }
      );
    }
  );
});

// Update task
app.patch("/tasks/:id", authenticateToken, (req, res) => {
  const { completed } = req.body;

  connection.query(
    "UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?",
    [completed, req.params.id, req.user.userId],
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Error updating task" });
      }
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Task not found or unauthorized" });
      }
      res.json({ message: "Task updated" });
    }
  );
});

// Delete task
app.delete("/tasks/:id", authenticateToken, (req, res) => {
  connection.query(
    "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.userId],
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Error deleting task" });
      }
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Task not found or unauthorized" });
      }
      res.json({ message: "Task deleted" });
    }
  );
});

// Update login route to redirect to dashboard
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    connection.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (error, results) => {
        if (error) {
          return res.status(500).json({ message: "Server error" });
        }

        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
          { userId: user.id, username: user.username },
          "your_jwt_secret",
          { expiresIn: "1h" }
        );

        res.json({ token, redirect: "/dashboard.html" });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
