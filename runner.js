const { resolve } = require("path");
const { execFile } = require("child_process");
const fs = require("fs");
const R = require("ramda");
const F = require("fluture");
const os = require("os");

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

// const addFlag = R.compose(R.prepend("--region"), R.of);
const regionsFlags = R.map(R.concat("--region="), regions);
console.log(regionsFlags)

const {
  readData,
  parseJSON,
  serialize,
  writeFile
} = require("./intermediate.js");

fs.mkdir(dirname, function(err) {
  if (err) {
    console.error("Could not create directory, quitting.");
  } else {
    F.parallel(1, 
      combos(baseUrl).map(p => 
        F.node(runTest(p))
        .chain(filename => readData(filename, fs.readFile))
        .chain(parseJSON)
    ))
    .chain(serialize)
    .chain(writeFile(outFile, {writer: fs.writeFile}))
    .fork(console.log, console.error);
}});

//:: (...) -> fn -> Future
function runTest(params) {
  return function(cb) {
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

    return execFile(goad, args, {}, function(err, stdout, stderr) {
      console.log("--- std out ---")
      console.log(stdout)
      console.log("--- std err ---")
      console.log(stderr)
      return cb(err, outputFile);
    });
  }
}

function combos(url) {
  // TODO write a 3-way (or N-way) Catesian product, like xprod.
  const requests = [1000];
  const concurrency = [200];
  const paths = ['/ping', '/'];

  /*
  const RxC = R.xprod(requests, concurrency);
  const all = routes.map(route => {
    return RxC.map(([r,c]) => {
      return [r, c, url + route];
    });
  });
  */
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
