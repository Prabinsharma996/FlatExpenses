require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const flatRoutes = require("./routes/flats");
const bookRoutes = require("./routes/books");
const expenseRoutes = require("./routes/expenses");
const pollRoutes = require("./routes/polls");
const choreRoutes = require("./routes/chores");
const taskRoutes = require("./routes/tasks");
const shoppingRoutes = require("./routes/shopping");
const budgetRoutes = require("./routes/budgets");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/flats", flatRoutes);
app.use("/", budgetRoutes); // exposes /books/:bookId/budget
app.use("/", bookRoutes); // exposes /flats/:flatId/books and /books/:id...
app.use("/", expenseRoutes); // exposes /books/:bookId/expenses and /expenses/:id
app.use("/", pollRoutes); // exposes /flats/:flatId/polls and /polls/:id/...
app.use("/", choreRoutes); // exposes /flats/:flatId/chores and /chores/:id/...
app.use("/", taskRoutes);
app.use("/", shoppingRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`FlatSplit API listening on port ${port}`));
