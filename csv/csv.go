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
	"regexp"

	"goad-csv/intermediate"
	"goad-csv/reducers"
)

func getPath(url string) (string, bool) {
	path, err := regexp.Compile("https?://.*(/.*)")
	if err != nil {
		log.Fatal(err)
	}

	matches := path.FindStringSubmatch(url)
	if len(matches) == 2 {
		return matches[1], true
	}
	return "", false
}

// func Print(parsed *[]summary.Description) {
func Print(results *[]intermediate.Result, sep string) {
	// We want a single pass structuring.
	// colsets := make(map[[2]int][]intermediate.Result)

	// Copy from a list of results to a "Matrix" map with a pair as keys.
	// TODO This would be a lot more efficient if it used ptrs vs. copying.
  /*
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
  */

	headers := [...]string{
    "Conc",
    "Req",
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
  /*
	routeCount := 0
	for _, route := range colsets {
		// max
		if n := len(route); n > routeCount {
			routeCount = n
		}
	}
	log.Printf("Detected %d columns sets.\n", routeCount)

  */
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
	// fmt.Printf("Conc%s", sep)
	// fmt.Printf("Req%s", sep)
	// for i := 0; i < len(*results); i++ {
	for _, text := range headers {
		fmt.Printf("%s%s", text, sep)
	}

	// Print performance data headers 
	for _, name := range metrics {
		fmt.Printf("%s%s", name, sep)
	}
	// }
	fmt.Println()

	// Print data
// for key, value := range colsets {
// fmt.Printf("%d%s%d%s", key[0], sep, key[1], sep)
  for _, item := range *results {
	path, ok := getPath(item.Path)
	if !ok {
		path = "--"
	}

    fmt.Printf("%d%s", item.Concurrency, sep)
    fmt.Printf("%d%s", item.Requests, sep)
    fmt.Printf("%s%s", path, sep)
    fmt.Printf("%.0f%s", item.AvgReqTime, sep)
    fmt.Printf("%.2f%s", item.ReqTimeSD, sep)
    fmt.Printf("%.2f%s", item.ReqsPerSec, sep)
    fmt.Printf("%d%s", item.MinReqTime, sep)
    fmt.Printf("%d%s", item.MaxReqTime, sep)
    fmt.Printf("%d%s", item.Time95PctDone, sep)
    fmt.Printf("%d%s", item.ErrorCount, sep)

    // We need to do this in a consistent order.
    for _, name := range metrics {
      metric, ok := (*item.Performance.Metrics)[name]
      if !ok {
        fmt.Printf("metric: '%s' not found.\n", name)
      }

      summary, ok := summarize(metric.Statistic, metric.Datapoints)
      if ok {
        fmt.Printf("%.2f%s", summary, sep)
      } else {
        fmt.Printf("--%s", sep)
        fmt.Printf("metric name: '%s', value:  %v\n", name, metric)
        panic("Not ok!")
      }
    }
	fmt.Println()
  }
}
// }

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
