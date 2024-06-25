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

// List of allowed origins
const allowedOrigins = [
  "https://utsav-alpha.vercel.app",
  "http://localhost:3000", // Add other allowed origins here
];

// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["POST", "GET", "PUT", "DELETE"],
};

app.use(cors(corsOptions));
// Handle preflight requests
app.options('*', cors(corsOptions));


app.use(bodyParser.json());

app.get("/", (req, res) => {
  return res.send("Hello World");
});

// adding routes
app.use("/api/auth", require("./routes/auth"));
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
