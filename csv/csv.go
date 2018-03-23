// Plan:

// 1. Run on current 'saved.json' (cp'd to 4-10c_all.json)

// it should extract Overall, and make table
// table should be obv., esp. if reading .ini file.
// But even without: ...
// Aggregate colsets by (concurrency, request) pairs
// For now, just expect through stdin...
// unless it's easier through a file...

// package main
package csv

import (
	"fmt"
	"log"
	"math"
	// "errors"

	"goad-csv/intermediate"
	"goad-csv/reducers"
)

// func Print(parsed *[]summary.Description) {
func Print(results *[]intermediate.Result) {
	// We want a single pass structuring.
	colsets := make(map[[2]int][]intermediate.Result)

	// Copy from a list of results to a "Matrix" map with a pair as keys.
	// TODO This would be a lot more efficient if it used ptrs vs. copying.
	for _, entry := range *results {
		c := entry.Concurrency
		r := entry.Requests
		index := [2]int{c, r}
		if colsets[index] != nil {
			var p []intermediate.Result
			p = colsets[index]
			p = append(p, entry)
			colsets[index] = p
		} else {
			// Allocate new
			p := make([]intermediate.Result, 1)
			p[0] = entry
			colsets[index] = p
		}
	}

	headers := [...]string{
		"URL",
		"Mean",
		"SD",
		"RPS",
		"Min",
		"Max",
		"95%",
		"Err",
	}

	// TODO: I should refactor somewhat to not disallow ragged
	// rows, as this makes alignment much more difficult and we
	// don't need/support it from the backend anyway.
	// Just get from config file.
	// These variable names are unhelpful / misleading
	// "colsets" should be "col[umn]sets" or something.
	// As it's really "colsets per (R x C) pair"...
	routeCount := 0
	for _, route := range colsets {
		// max
		if n := len(route); n > routeCount {
			routeCount = n
		}
	}
	log.Printf("Detected %d columns sets.\n", routeCount)


	if len(*results) == 0 {
		return
	}



	// Getting "invalid argument" for len
	// var x map[string]intermediate.MetricData
	// x = *(*results)[0].Performance.Metrics
	// fmt.Println(len(x))

	metricsPtr := (*results)[0].Performance.Metrics
	// fmt.Printf("Got %d metrics\n", len(*metricsPtr))

	// metrics := []string{"CPUUtilization"}
	metrics := make([]string, 0, len(*metricsPtr))
	for key := range *metricsPtr {
		metrics = append(metrics, key)
	}

	// fmt.Printf("Metrics: %v.\n", metrics)
	// fmt.Println(len(metrics))
	// */

	// Print headers
	fmt.Printf("%s;%s;", "Conc", "Req")
	for i := 0; i < routeCount; i++ {
		for _, text := range headers {
			fmt.Printf("%s;", text)
		}

		// Print performance data headers 
		for _, name := range metrics {
			fmt.Printf("%s;", name)
		}
	}
	fmt.Println()

	// Print data
	for key, value := range colsets {
		fmt.Printf("%d;%d;", key[0], key[1])
		for _, item := range value {
			fmt.Printf("%s;", item.Path)
			fmt.Printf("%.0f;", item.AvgReqTime)
			fmt.Printf("%.2f;", item.ReqTimeSD)
			fmt.Printf("%.2f;", item.ReqsPerSec)
			fmt.Printf("%d;", item.MinReqTime)
			fmt.Printf("%d;", item.MaxReqTime)
			fmt.Printf("%d;", item.Time95PctDone)
			fmt.Printf("%d;", item.ErrorCount)

			// We need to do this in a consistent order.
			for _, name := range metrics {
				metric, ok := (*item.Performance.Metrics)[name]
				if !ok {
					fmt.Printf("metric: '%s' not found.\n", name)
				}

				summary, ok := summarize(metric.Statistic, metric.Datapoints)
				if ok {
					fmt.Printf("%.2f;", summary)
				} else {
					fmt.Printf("--;")
					fmt.Printf("metric name: '%s', value:  %v\n", name, metric)
					panic("Not ok!")
				}
			}
		}
		fmt.Println()
	}
}

func summarize(metric string, points []intermediate.Datapoint) (float64, bool) {
    // If we haven't returned with a failure value, by now we're good.
	values := make([]float64, len(points))
	for i, pt := range points {
		values[i] = pt.Value
	}

    fn, ok := reducers.Map[metric]
    if ok {
        summary := fn(values)
		return summary, ok
    } else {
        return math.NaN(), ok
    }
}

type header struct {
	Concurrency		int
	Requests		int
	Path			string
}
