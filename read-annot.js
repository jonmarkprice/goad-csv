const fs = require("fs")
const {
  readData,
  // perfByMetric,  
  serialize,
  writeFile,
  parseJSON,
  // appendEnv,
  getEnv,
  pullPerformanceMetrics,
  findStartAndEnd,
  populateTest,
} = require("./intermediate.js")
const { getCWData } = require("./cw.js")
const R = require("ramda");

if (process.argv.length != 3) {
  console.log("File is required") 
  process.exit(1);
}

// TODO Report *waited time* and *actual time*, not just waited!!
// TODO Period should be looked up from a table; or hardcoded if it constant.
// TODO out-file name.
const filename = process.argv[2]
const effects = {reader: fs.readFile, writer: fs.writeFile};

readData(filename, effects.reader)
.chain(parseJSON)

.chain(getEnv)  // An env to test obj // TODO refactor
.map(findStartAndEnd)
.chain(pullPerformanceMetrics)
.map(function ({tests, performance}) {
  return tests.map(test => populateTest(performance)(test))
})
.chain(serialize)
.chain(writeFile("out.json", effects))
.fork(console.error, console.log)

