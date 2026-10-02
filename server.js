// For local development

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files in the 'src' directory
app.use(express.static(path.join(__dirname, "src")));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
