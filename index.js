const express = require("express");
const bodyParser = require("body-parser");
const connectToMongo = require("./db/db");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");
const port = 8000;

connectToMongo();
const app = express();

app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use(
  cors(
    {
    origin: ["*"],
    methods: ["POST", "GET", "PUT", "DELETE"],
  }
)
);

app.use(bodyParser.json());

app.get("/api/", (req, res) => {
  return res.send("Hello World");
});

// adding routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notify", require("./routes/notify"));
app.use("/api/activity", require("./routes/activity"));

app.use(errorHandler);

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  // Optionally exit the process
  process.exit(1);
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Optionally exit the process
  process.exit(1);
});


app.listen(port, () => {
  console.log(`utsav backend running on http://localhost:${port}`);
});
