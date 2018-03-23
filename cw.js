const { execFile } = require("child_process");
const F = require("fluture");

function run(start, end, env, period, cb) {
  const args = [
    "--start", start,
    "--end", end, 
    "--period", period,
    "--" + env,
  ];
  // console.log(cb)
  const groupIO = (err, stdout, stderr) => cb(err, {stdout, stderr});
  return execFile("./dump-cw", args, {}, groupIO);
}

/*
function log(x) {
  console.log(x);
  return x;
}*/

// TODO integrate the 'cw' executable it calls with what is working from
// intermediate.go -- should have already done all the hard work there.

// This function is designed to have a consistent interface, whether
// it calls the AWS SDK directly, or using an extern. program.
function getCWData(start, end, env, period) {
  return F.node(done => { run(start, end, env, 60, done) })
  .map(res => res.stdout) // TODO deal with stderr at some point too
  // .map(log)
  .chain(F.encase(JSON.parse))
  // .fork(console.error, console.log);
}

module.exports = { getCWData };
