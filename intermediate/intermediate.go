package intermediate // result-summary

import (
	"time"
	// "github.com/aws/aws-sdk-go/service/cloudwatch"
)

//* DEPRECATED
// Let's put it here..

type Datapoint struct {
    Value		float64
    Timestamp   time.Time   // use time(0) for nil
}

type MetricData struct {
	Datapoints	[]Datapoint
	Statistic	string
	Unit		string
}

type PerfMetrics struct {
	Start	time.Time
	End		time.Time
	Metrics *map[string]MetricData
	// Env string
}

// NOTE:
// Unlike AggData, etc. what we want here is not all the
// data we have, but none of the computed but the exact
// opposite. We want as much of the computed data as possible!
type Result struct {
	// Summed over all regions
	// Test setup
	Concurrency int
	Requests    int
	Path        string // alt names: Route, URL

	// Test results
	ErrorCount     int // Is this better than (Timeout, ConnErr)
	Statuses       map[string]int
	ReqTimesBinned map[int64]int
	AvgReqTime     float64
	ReqTimeSD      float64
	MaxReqTime     int64
	MinReqTime     int64
	ReqsPerSec   float64
	Performance    PerfMetrics
	Env            string
	Time95PctDone	int64
}

/*
type Perf interface {
	isPerf() // "tag" function
}

////////////////////////////////////////////////////////////////
type LambdaPerf struct {
	Invocations          int
	ConcurrentExecutions int
	Duration             time.Duration // float64
}

type EBPerf struct {
	MemUsage float64
	CPUUsage float64
}
*/

/*
// These will likely need to include all datapoints in addn
// to just summary statistics. As Max ptd out, we may want to
// day pictures in GUI.

LambdaPerf(2.0) {
	Invocations: 	[]DataPts{}
	ConcExec: 		..
	Duration: 		..

	Summary: {
		Invocations: 	{Data float64, Unit string}
		ConcExec: 		..
		Duration: 		..
	}

}
*/
