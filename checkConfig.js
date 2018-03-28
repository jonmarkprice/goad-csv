const fs = require("fs");
const { parseConfig } = require("./parseConfig");

if (process.argv.length != 3) {
  console.error("Filename required");
  process.exit(1);
}

parseConfig(process.argv[2], {reader: fs.readFile})
.fork(console.error, console.log);
