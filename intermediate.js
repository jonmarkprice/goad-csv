/* GOAL
The goals here are to
  1.  Read in the summary JSON file
  2.  Obtain performance data 
      either: proc. call to Go
      or: using AWS-SDK
  3.  Create a unified JSON document that can be read by print-csv.go
      and later the GUI.
*/
const R = require("ramda");
const F = require("fluture");
const S = require("./sanctuary");
const { getCWData } = require("./cw.js");

// Useful objects
const noop = () => {};
const MIN_DATE = new Date(-8640000000000000);
const MAX_DATE = new Date(+8640000000000000);

//:: (string, string, string, int) -> Future (cw.GetMetricStatisticsOutput)
// TODO

//:: string -> Future [time, time]
function readData(filename, reader) {
  return F.node(done => reader(filename, 'utf8', done)) 
}

//:: string -> Effects{reader} -> Future string
function parseJSON(data) {
  return F.encase(JSON.parse, data); // encase catches exceptions
}

function serialize(data) {
  const stringify = data => JSON.stringify(data, null, 3)
  return F.encase(stringify, data)
}

function writeFile(filename, effects) {
  return function(data) { // Take data when ready
    return F.node(done => effects.writer(filename, data, done))
  }
}

////////////////////////////
function walk(x) {
  return x
  .map(R.map(R.path(["Overall", "Summed"])))
  .map(R.map(R.props(["StartTime", "EndTime"])))

  // Now what?
  // Do need an identifier? I suppose the times are good enough...
}

// TODO better name for fn
// Should TAKE an effect/aws sdk fn
// TODO Return CW data in the proper form
// return {... }

// Let's say this returns what CW returns:
/*
let cw = {
  Datapoints: []*cw.Datapoint, {_: null, ..., Unit: string}
  Label :*string
}*/

/* // Performance:  map[string][]Datapoints
TP = { // Think of a better name // timePoint
  Statistic: string,
  Value: float
  Unit: string
  Timestamp: time 
}
*/

// NOTE: We could call our datastruct, Map{string: []Timepts}, PerfByMet

//:: []GetMetricStatisticsOutput -> Map{string: []Timepts}
function perfByMetric(metrics) {
  // console.log(metrics)
  const output = metrics.map(parseMetricOutput)
  return S.fromMaybe({}, mappify(S.justs(output)))
}

// helper
function insertLabelAsKey(obj, entry) {
  const key = entry.Label;
  const entryData = R.dissoc("Label", entry)
  if (S.equals(S.map(R.has(key), obj), S.Just(true))) {
    // console.log("map %o has key %s", obj, key)
    return S.Nothing
  }
  return S.map(R.assoc(key, entryData), obj)
}

//:: []{Label, []Timepts, Statistic, Unit} -> Map{string -> {Stat, Unit, []Timepts}}
function mappify(objs) {
  return R.reduce(insertLabelAsKey, S.Just({}), objs);
}

//:: cw.GetMetricStatisticsOutput -> Maybe {[]Timepts, Label, Statistic, Unit}
function parseMetricOutput(obj) {
  // All Statistics and Units are the same.
  // TODO: I don't like "ok" as a name...
  // We want to copy just two props (Value, Timestamp)
  const maybes = obj.Datapoints.map(parseCW) // [M tp]
  const ok = S.justs(maybes);

  const uniqProp = p => R.compose(R.uniq, R.pluck(p));
  const stats = uniqProp("Statistic")(ok);
  const units = uniqProp("Unit")(ok);

  // remove Statistics, Units
  const dropProps = R.pipe(R.dissoc("Statistic"), R.dissoc("Unit"));
  const trimmed = ok.map(dropProps);
  
  if (stats.length == 1 || units.length == 1) {
    return S.Just({
      Label: obj.Label,
      Datapoints: trimmed, 
      Statistic: R.head(stats),
      Unit: R.head(units)
    });
  } else {
    return S.Nothing;
  }
}

// This ensures that there is exactly, non-null statistic
//:: cw.Datapt -> Maybe timepoint
function parseCW(obj) {
  // mv out
  const stats = [
    "Average",
    "ExtendedStatistics",
    "Maximum",
    "Minimum",
    "SampleCount",
    "Sum",
  ]; 
  const pairs = R.pipe(
    R.compose(R.zip(stats), R.props(stats)),
    R.filter(([k, v]) => v !== null),
  )(obj);

  // We want there to be exactly one non-null statistic.
  if (pairs.length != 1) return S.Nothing

  const [Statistic, Value] = R.head(pairs);
  return S.Just({
    Statistic, 
    Value,
    Unit: obj.Unit,
    Timestamp: obj.Timestamp
  })
}

//:: [a] -> Maybe a
function getUnique(xs) {
  return R.compose(R.equals(1), R.length, R.uniq)(xs)
    ? S.head(xs)
    : S.Nothing;
}

// NOTE: must be chained
// NOTE: Alt. name: "aggregateEnv"
function getEnv(objs) {
  /*
  const envs = getUnique(R.pluck("Env", objs));
  const mdata = S.Just({tests: objs});
  const combined = S.lift2(R.assoc("env"), envs, mdata);
  return S.maybe(F.reject("Bad env"), F.of, combined);
  // XXX: since we "check" with maybe before return, 
  // we could as easily return F.reject *early* from
  // an if statment, without needing to lift!
  */

  const envs = getUnique(R.pluck("Env", objs));
  if (S.isNothing(envs)) return F.reject("Bad env");
  else return F.of({
    tests: objs, // object spread?
    env: S.maybeToNullable(envs),
  });
  // -- or -- 
  /*
  const envs = getUnique(...)
  return S.maybe(F.reject(""), common => F.of({
    tests: objs,
    env: common
  }), env)
  */
}

const pluckPath = path => data => data.map(R.view(R.lensPath(path)));
const asDate = s => new Date(s);
const metricsLens = R.lensPath(["Performance", "Metrics"]);

function findStartAndEnd({tests, env}) {
  // NOTE: this could easily be done from the main fn, but 
  // this would require a new wrapper data structure around
  // *everything*, so just compute here. O(N) time; O(1) space.
  const startTime = pluckPath(["Performance", "Start"]);
  const endTime = pluckPath(["Performance", "End"]);
  const start = R.reduce(R.min, MAX_DATE, startTime(tests).map(asDate));
  const end   = R.reduce(R.max, MIN_DATE, endTime(tests).map(asDate));
  return {tests, start, end, env};
}

function populateTest(performance) {
  return function(test) {
    const start = new Date(test.Performance.Start); //time?
    const end = new Date(test.Performance.End); //time

    // XXX Have I been going about this wrong?
    // TODO check signatures or deduce "intended" sigs.
    // Basically my tests may have been expecting: a single list
    // but what we have is a map of objs with lists
    // Map{[metric]: {datapoints: []{Value, TS}, ...}}

    // Map over an obj-map
    const data = R.map(getInterval(start, end), performance);

    /* DEBUGGING
    console.log("POPULATE TEST %s %s %o", start, end, performance)
    console.log("Data ", data)
    console.log("Test ", test)
    console.log("View %o", R.view(metricsLens, test))
    */
    return R.set(metricsLens, data, test);
  }
}

// TODO incl. univ start/end? -- or just calc?
// agg = {tests: [...], env} /* start, end */
// function getPerformanceData(agg) {
function pullPerformanceMetrics(agg) {
  // Format as ISO since it will be passed as a string. 
  const [start, end] = [agg.start, agg.end].map(x => x.toISOString());
  return getCWData(start, end, agg.env, 60)
  .map(perfByMetric) // Gather into map
  .map(x => ({performance: x, tests: agg.tests}))

  // combine with rest of data
  // .map(fmetrics => R.set(metricsLens, fmetrics, agg.tests))
  /*
  .map(
    R.map(
        getInterval(_, _
        R.set(lens, ...),
      agg.tests)

  )*/
}

// was "getTests"
/*
function appendEnv({data: obj, env}) {
  // Collect test data 
  const perfLens = R.lensProp("Performance");
  return R.map(R.over(perfLens, R.assoc("Env", env)), obj)
}
*/

// TODO "data" should be renamed to something more descriptive
// {testData, performanceData}i
/*
function addMetrics(data) {
  const metricsLens = R.lensPath(["Performance",  "Metrics"]);
  // const {Start, End Env} = data.Performance;

  // XXX replace with 
  R.map(getInterval(Start, End))
  // return getCWData(Start, End, Env, 60) // returns a Future

  .map(perfByMetric)
  .map(fmetrics => R.set(metricsLens, fmetrics, data))

}
*/

//:: []{Env, Start, End} -> []Future
/*
function pullPerformanceMetrics(tests) {
  const withMetrics = R.map(addMetrics, tests);
  // TODO Allow an option for  the limit.
  return F.parallel(5, withMetrics); // 1 -> serially for now.
} */

// NOTE 1: The data is *not* in sorted order. So we cannot slice by indices.
// NOTE 2: Filter is already a sort of lens. The decider function it takes can
// dig as deep as needed into the the data structure to makes its inclusion
// decision -- all without mutating the original data.
function interval(start, end) {
  return function (data) {
    const afterStart = s => new Date(s.Timestamp) >= start;
    const beforeEnd  = s => new Date(s.Timestamp) < end;
    return R.filter(R.both(afterStart, beforeEnd), data);
  }
}

function getInterval(start, end) {
  return function(metrics) {
    const datapoints = R.lensProp("Datapoints");
    return R.over(datapoints, interval(start, end), metrics);
  }
}

// TODO: Make sure we get CW metrics in an acceptable form.
// Write at least one unit test for each fn (bottom up)
// This should give us a decent understanding of what the file does as a whole
module.exports = {
  readData,
  parseJSON,
  perfByMetric,
  parseMetricOutput,
  parseCW,
  mappify,
  serialize,
  writeFile,
  getEnv,
  // appendEnv, // DEPRECATED
  getUnique,
  pullPerformanceMetrics,
  getInterval,
  interval,
  findStartAndEnd,
  pluckPath,
  populateTest,
}
