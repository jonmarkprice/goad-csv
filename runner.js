const { resolve } = require("path");
const { execFile } = require("child_process");
const fs = require("fs");
const R = require("ramda");
const F = require("fluture");
const os = require("os");
const util = require("util");

const randomString = () => Math.floor(Math.random() * Math.floor(1e15)).toString(36);

const dirname = "/tmp/goad-" + randomString();

const GOPATH = process.env.GOPATH;

const platform = {
  "darwin": "osx",
  "linux": "linux"
}

const arch = {
  "x64": "x86-64"
}

const myArch = arch[os.arch()];
const myOS = platform[os.platform()];

if (myArch == undefined || myOS == undefined) {
  process.exit(1);
}

const goad = resolve(GOPATH, `./src/github.com/goadapp/goad/build/${myOS}/${myArch}/goad`);

const baseUrl = "https://d3meihy2uf6moq.cloudfront.net";
const headers = "Cookie: connect.sid=s%3AvdbZcF8ZZf7Uzdbk_uWgdpXhi1-jNJVA.b3i9m36LdekHceo59k2ogUFPqI8YnfgIm5ol%2BCtIOVs";

/*
if (process.argv.length != 3) {
  console.error("Output filename is required.");
  process.exit(1);
} */

const outFile = /* process.argv[2] || */ "raw.json";

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "sa-east-1",
];

const regionsFlags = R.map(R.concat("--region="), regions);
console.log(regionsFlags)

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

fs.mkdir(dirname, function(err) {
  if (err) {
    console.error("Could not create directory, quitting.");
  } else {
    seq(runTest, combos(baseUrl))
    .then(data => JSON.stringify(data, null, 3))
    .then(text => writeFile(outFile, text))
    .catch(console.error);
  }
});

function round(period) {
  const now = new Date();
  const time = now.getSeconds()
  const ms = (period - (time % period)) * 1000;
  console.log("It is now %s.", now);
  console.log("Waiting %s seconds.", Math.floor(ms / 1000));

  return new Promise(function(res, rej) {
    setTimeout(res, ms)
  });
}

async function seq(fn, args) {
  let results = [];
  const N = args.length;
  for (let i = 0; i < N; i++) {
    const result = await fn(args[i]) // TODO can spread too...
      .then(readFile)
      .then(JSON.parse); // XXX No catch

    if (i < N - 1) { // Don't wait if we are done!
      await round(60);
      // TODO: +60 if "safe" option
    }
    results.push(result);
  }
  return results;
}

//:: (...) -> fn -> Promise
function runTest(params) {
  const [req, conc, url, index] = params;
  const outputFile = `${dirname}/path-${index+1}_${req}x${conc}.json`;
  const args = [
    "--json-output=" + outputFile,
    "-n", req,
    "-c", conc,
    ...regionsFlags,
    "-H", headers,
    url,
  ];
  return new Promise(function (resolve, reject) {
    execFile(goad, args, {}, function(err, stdout, stderr) {
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
  });
}

function combos(url) {
  const requests = [1000];
  const concurrency = [200];
  const paths = ['/ping', '/'];

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
