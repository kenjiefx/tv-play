const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const docsDir = path.join(root, "docs");
let indexHtml = fs.readFileSync(path.join(root, "src/app.html"), "utf-8");
const appJs = fs.readFileSync(path.join(root, "src/app.js"), "utf-8");
const favicon = fs.readFileSync(path.join(root, "src/favicon.ico"));

try {
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }
  const uniqjs = `app-${Date.now()}.js`;
  indexHtml = indexHtml.replace(
    '<script type="module" src="./app.js"></script>',
    `<script type="module" src="./${uniqjs}"></script>`,
  );
  fs.writeFileSync(path.join(docsDir, "index.html"), indexHtml, "utf-8");
  fs.writeFileSync(path.join(docsDir, uniqjs), appJs, "utf-8");
  fs.writeFileSync(path.join(docsDir, "favicon.ico"), favicon);
} catch (error) {
  console.error("Deployment failed:", error);
}
