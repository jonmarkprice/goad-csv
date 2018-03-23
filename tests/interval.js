const base = [
   {
      "Value": 206.52,
      "Timestamp": "2018-03-16T06:27:00Z"
   },
   {
      "Value": 209.98,
      "Timestamp": "2018-03-16T06:36:00Z"
   },
   {
      "Value": 54.9,
      "Timestamp": "2018-03-16T06:35:00Z"
   },
   {
      "Value": 54.76,
      "Timestamp": "2018-03-16T06:26:00Z"
   },
   {
      "Value": 173.53,
      "Timestamp": "2018-03-16T06:34:00Z"
   },
   {
      "Value": 1033.01,
      "Timestamp": "2018-03-16T06:25:00Z"
   },
   {
      "Value": 230.94,
      "Timestamp": "2018-03-16T06:24:00Z"
   },
   {
      "Value": 211.05,
      "Timestamp": "2018-03-16T06:33:00Z"
   },
   {
      "Value": 71.54,
      "Timestamp": "2018-03-16T06:23:00Z"
   },
   {
      "Value": 68.66,
      "Timestamp": "2018-03-16T06:32:00Z"
   },
   {
      "Value": 142.92,
      "Timestamp": "2018-03-16T06:22:00Z"
   },
   {
      "Value": 249.95,
      "Timestamp": "2018-03-16T06:31:00Z"
   },
   {
      "Value": 113.08,
      "Timestamp": "2018-03-16T06:30:00Z"
   },
   {
      "Value": 220.48,
      "Timestamp": "2018-03-16T06:21:00Z"
   },
   {
      "Value": 57.77,
      "Timestamp": "2018-03-16T06:29:00Z"
   },
   {
      "Value": 66.05,
      "Timestamp": "2018-03-16T06:20:00Z"
   },
   {
      "Value": 186.1,
      "Timestamp": "2018-03-16T06:28:00Z"
   },
   {
      "Value": 150.19,
      "Timestamp": "2018-03-16T06:37:00Z"
   }
];

const expected = [
   {
      "Value": 1033.01,
      "Timestamp": "2018-03-16T06:25:00Z"
   },
   {
      "Value": 230.94,
      "Timestamp": "2018-03-16T06:24:00Z"
   },
   {
      "Value": 71.54,
      "Timestamp": "2018-03-16T06:23:00Z"
   },
   {
      "Value": 142.92,
      "Timestamp": "2018-03-16T06:22:00Z"
   }
];

const { interval } = require("../intermediate.js");
const test = require("tape");

test("non-empty interval", function(t) {
  t.plan(1);

  // NOTE: Must do at least 25:01 to include.
  t.deepEqual(interval(new Date("2018-03-16T06:22:00Z"), new Date("2018-03-16T06:25:01Z"))(base), expected);
});




