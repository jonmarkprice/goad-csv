const { run } = require("./runner.js")

if (process.argv.length != 3) {
  console.error("Filename required");
  process.exit(1);
}

run(process.argv[2])
