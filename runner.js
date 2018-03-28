const { resolve } = require("path");
const { execFile } = require("child_process");
const fs = require("fs");
const R = require("ramda");
// const F = require("fluture");
const os = require("os");
const util = require("util");
const { parseConfig } = require("./parseConfig.js")

const platforms = {
  "darwin": "osx",
  "linux": "linux"
};
const archs = {
  "x64": "x86-64"
};

const randomString = () => Math.floor(Math.random() * Math.floor(1e15)).toString(36);

const DIR_NAME = "/tmp/goad-" + randomString();
const GOPATH = process.env.GOPATH;
const ARCH = archs[os.arch()];
const OS = platforms[os.platform()];
if (ARCH == undefined || OS == undefined) {
  process.exit(1);
}
const GOAD_REPO = resolve(GOPATH, "./src/github.com/goadapp/goad");
const GOAD = resolve(GOAD_REPO, "./build", OS, ARCH, "./goad");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

async function run(configFile) {
  const config = await parseConfig(configFile, {reader: fs.readFile})
    .promise()
    .catch(err => {throw err}); // Best way with await?

  // const config = {};

  console.log("Config: %O", config);

  await mkdir(DIR_NAME);

  // TODO: pass config to runTest?
  seq(runTest(config), combinations(config))
  .then(data => JSON.stringify(data, null, 3))
  .then(text => writeFile(config.outFile, text))
  .catch(console.error);
}

function round(period) {
  const now = new Date();
  const time = now.getSeconds()
  const ms = (period - (time % period)) * 1000;
  console.log("It is now %s.", now);
  console.log("Waiting %s seconds.", Math.floor(ms / 1000));

  return new Promise(function(res, rej) {
    setTimeout(res, ms)
  })
  .catch(err => {throw err});
}

async function seq(fn, args) {
  let results = [];
  const N = args.length;
  for (let i = 0; i < N; i++) {
    const result = await fn(args[i]) // TODO can spread too...
      .then(readFile)
      .then(JSON.parse)
      .catch(err => {
        console.log(`Failure on test #${i + 1}.`);
        throw err;
      });

    if (i < N - 1) { // Don't wait if we are done!
      await round(60);
      // TODO: +60 if "safe" option
    }
    results.push(result);
  }
  return results;
}

//:: (...) -> fn -> Promise
function runTest(config) {
  const regionsFlags = R.map(R.concat("--region="), config.regions);
  return function(testParams) {
    const [req, conc, url, index] = testParams;

    const outputFile = `${DIR_NAME}/path-${index + 1}_${req}x${conc}.json`;
    const args = [
      "--json-output=" + outputFile,
      "-n", req,
      "-c", conc,
      ...regionsFlags,
      "-H", config.headers,
      url,
    ];
    return new Promise(function (resolve, reject) {
      execFile(GOAD, args, {}, function(err, stdout, stderr) {
        if (err != null) {
          reject(err);
        } else {
          console.log("--- std out ---")
          console.log(stdout)
          console.log("--- std err ---")
          console.log(stderr)
          resolve(outputFile);
        }
      });
    })
    .catch(err => {throw err});
  };
}

function combinations({requests, concurrency, paths, url}) {
  let all = []
  for (let r of requests) {
    for (let c of concurrency) {
      for (let i = 0; i < paths.length; i++) {
        all.push([r, c, url + paths[i], i]);
      }
    }
  }

  return all;
}

module.exports = { run };
