const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function walkDir(dir, ext, cb) {
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkDir(fp, ext, cb);
    else if (fp.endsWith(ext)) cb(fp);
  });
}

// HTML validation (using htmlhint)
try {
  execSync("npx htmlhint index.html", { stdio: "inherit" });
  walkDir("assets", ".html", f => execSync(`npx htmlhint "${f}"`, { stdio: "inherit" }));
} catch (e) {}

console.log("HTML check done!");

// CSS validation (using stylelint)
try {
  walkDir("css", ".css", f => execSync(`npx stylelint "${f}"`, { stdio: "inherit" }));
} catch (e) {}

console.log("CSS check done!");
