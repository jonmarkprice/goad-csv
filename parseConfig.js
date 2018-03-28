/*
A object with the following format is expected:

{
  env: ("EB" | "Lambda")
  url: string,
  paths: []string,
  concurrency: []int,
  requests: []int
  cookie: string,
  [opt] outfile: string
  [opt] dirname: string,
  [opt] regions: []string,
  [opt] safeWait: bool, 
*/

// This should read a file and apply (hard-coded) defaults.
// It should also verify that each required prop is present.

const required = [
  ["url", String],
  ["paths", Array], // of strings
  ["concurrency", Array], // of ints
  ["requests", Array], // of ints
  ["env", String], 
  ["headers", String] // TODO make optional
];

// Defaults for optional props.
const defaults = {
  // safe: false,
  outFile: "raw.json",
  regions: [
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
  ],
};

const F = require("fluture");
const R = require("ramda");
const {
  parseJSON,
  readData,
} = require("./intermediate"); // TODO rename if only used here.

// parse args 
function parseConfig(filename, effects) {
  return readData(filename, effects.reader)
  .chain(parseJSON)
  .chain(parse);
}

// :: {...} -> Fluture {...}
// CONSTRAINT: length regions < max(concurrency)
// CONSTRAINT: env = one of {"EB", "Lambda"}
function parse(config) {
  const checkType = ([name, type]) => R.propIs(type, name, config);
  if (R.all(checkType, required)) {
    // TODO: [opt.] check types for optional properties too!
    // TODO: [opt.] reject/warn of any un-recognized props.
    return F.of(R.merge(defaults, config));
  } else {
    // TODO: Use something other than R.all to get *which* failed
    return F.reject("Typecheck failed for an required property.");
  }
}

module.exports = {parseConfig, parse}
