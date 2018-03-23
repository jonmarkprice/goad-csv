const test = require("tape");
const F = require("fluture");
const S = require("../sanctuary");
const {
  parse,  // probably rename at some point
  parseCW,
  parseMetricOutput,
  mappify,
  perfByMetric,
  getUnique,
  getEnv,
  pluckPath,
  getInterval,
  populateTest,
} = require("../intermediate.js")

const R = require("ramda");

// Readers
function alwaysHi(filename, opts, callback) {
  callback(null, '{"message": "hi"}')
}

test("pluckPath", function(t) {
  t.plan(1);
  t.deepEquals(pluckPath(["x", "y"])([{x: {y: 3}, y: 4}]), [3]);  
})

// test("findStartAndEnd", 

/*
TODO update
test("simple reader", function (t) {
  parse(null, {reader: alwaysHi})
  .map(d => d.message)
  .fork(
    res => { t.fail("Promise rejected"); t.end(); },
    res => { t.equal("hi", res); t.end(); });
}) */

const cwDataPts = [
  {
    // It will generally be one per
    Average: 32.86,
    ExtendedStatistics: null,
    Maximum: null,
    Minimum: null,
    SampleCount: null,
    Sum: null,
    Timestamp: "",
    Unit: "Milliseconds"
  }, {
    Average: 37.14,
    ExtendedStatistics: null,
    Maximum: null,
    Minimum: null,
    SampleCount: null,
    Sum: null,
    Timestamp: "",
    Unit: "Milliseconds"
  }
];

const dataPts = [
  {
    Value: 32.86,
    Timestamp: "",
    Unit: "Milliseconds",
    Statistic: "Average",
  }, {
    Value: 37.14,
    Timestamp: "",
    Unit: "Milliseconds",
    Statistic: "Average",
  }
]

const timePts = [
  {
    Value: 32.86,
    Timestamp: ""
  }, {
    Value: 37.14,
    Timestamp: ""
  }
]

test("parse metric output", function (t) {
  // There will be N*M[env] of these per test suit,
  // Where
  //  N = number of tests = |C| * |R| * |P|
  //  M[env], either M[L] = 3, or M[Eb] = 2; Metrics (columns) per test
  // Each of these is relative to single time interval, a single metric.
  const parsed = parseMetricOutput({
    Label: "MetricName",
    Datapoints: cwDataPts,
  })

  t.deepEqual(parsed, S.Just({
    Label: "MetricName",
    Datapoints: timePts,
    Statistic: "Average",
    Unit: "Milliseconds",
  }));
  t.end() 
});

test("parse one cw", function(t) {
  t.deepEqual(parseCW(cwDataPts[0]), S.Just(dataPts[0]));
  t.end();
})

const cwMetrics = [
  {Label: 'invocations',  Datapoints: [1, 2, 3]},
  {Label: 'duration',     Datapoints: [4, 5, 6]},
  {Label: 'concurrentEx', Datapoints: [7, 8, 9]},
];

const wanted = {
  invocations:  {Datapoints: [1, 2, 3]},
  duration:     {Datapoints: [4, 5, 6]},
  concurrentEx: {Datapoints: [7, 8, 9]},
};

test("mappify shoud merge equal labels", function(t) {
  t.deepEqual(mappify(cwMetrics), S.Just(wanted));
  t.end();
});

/*
test("putting it all together", function(t) {
  const metricMap = perfByMetric([
    {Label: "A", Datapoints: [cwDataPts[0]]},
    {Label: "A", Datapoints: [cwDataPts[
    {Label: "B", Datapoints: []}
  ]);
 
  // XXX had to swap around to get the test to pass because of the aforementioned
  // issue with object ordering/comparision. 
  t.deepEqual({"A": [timePts[1], timePts[0]], "B": []}, metricMap)
  t.end();
});

TODO test for perfByMetric
/*
test("", function(t) {
  // const cwMetrics = [
  //  Label: [], 
  //]

  t.deepEqual()
  t.end()
}) */

test("test getUnique", function(t) {
  t.plan(3);

  t.deepEquals(getUnique([3, 3, 3]), S.Just(3));

  t.deepEquals(getUnique(['a', 'a', 'b', 'a']), S.Nothing);

  t.deepEquals(getUnique([]), S.Nothing);
});

test("get env", function(t) {
  t.plan(1);

  const full = [{
    // ...
    "AvgReqTime": 52.466,
    "ReqTimeSD": 15.85573234663881,
    "MaxReqTime": 211,
    "MinReqTime": 32,
    "ReqsPerSec": 186.6966607157561,
    "Performance": {
      "Start": "2018-03-08T00:40:00Z",
      "End": "2018-03-08T00:41:00Z",
      "Metrics": null
    },
    "Env": "EB",
    "Time95PctDone": 70
  }];

  // got bad env..
  const expect = F.of({env: "EB", tests: full});
  t.deepEqual(getEnv(full), expect);
});

// TODO
// NOTE: This could take the form of proof if I could generalize 
// <a> and <b>.
// In this case, proving might be easier that testing, as I would not
// have to come up with any data.

// XXX This is missing a lot.
/*
test("populateTest", function(t) {
  const a = "2018-03-08T00:40:00Z";
  const b = "2018-03-08T00:41:00Z";

  const testInput = {
    Performance: {Start: a, End: b, Metrics: null}
  };

  const perfInput = {
    MetricName: {
      Datapoints: [{Timestamp: a}, {Timestamp: b}]
    }
  };

  const expect = {
    Performance: {
      Start: a, 
      End: b, 
      Metrics: R.map(getInterval(a, b), perfInput),
    }
  };

  t.deepEqual(populateTest(perfInput)(testInput), expect);
  t.end();
});
*/

/*
// Time data
const ms = {
  Metric1: {
    Statistic: "",
    Unit: "",
    Datapoints: [{Value: 133.23, Timestamp: "2018-03-17T00:41:00Z"}, ]
  },
  Metric2: {
    // ...
  },
}*/
//   "Timestamp": "2018-03-16T06:20:00Z"
//   "Timestamp": "2018-03-16T06:37:00Z"

// TODO: Can I grab some real data then work with a snapshot...?
/*
function compareDate(fn, str, t2) {
  t1 = new Date(str)
  return fn(t1, t2);
} */

