const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error stack to the console

  // Customize the response sent to the client
  res.status(500).json({
    message: "An unexpected error occurred. Please try again later.",
  });
};

module.exports = errorHandler;
