package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"goad-csv/summary"

	// NOTE: If this is the only usage of intermediate, we could probably
	// simplify the file a *LOT*.
	"goad-csv/intermediate"
)

type Environment int
const (
	EB		Environment	= iota
	Lambda
)

func (env Environment) Name() string {
	return [...]string{"EB", "Lambda"}[env]
}

func main() {
	// to silence, use ioutil.Discard
	errlog := log.New(os.Stderr, "", 0)

	// --- PARSE COMMAND LINE ARGUMENTS ---
	// period := flag.Int64("period", 1, "temporal resolution in seconds")
	filename := flag.String("file", "", "JSON file to read")

	// Either --EB or --Lambda
	eb := flag.Bool("EB", false, "the Elastic Beanstalk environment")
	lambda := flag.Bool("Lambda", false, "the Lambda environment")
	flag.Parse()

	var env Environment
	if *eb && !*lambda {
		env = EB
	} else if *lambda && !*eb {
		env = Lambda
	} else {
		// TODO usage
		errlog.Fatal("Must specify either --Lambda or --EB, but not both.")
	}

	if *filename == "" {
		// TODO usage
		errlog.Printf("Please pass me a JSON file to read.\n")
		os.Exit(1)
	}

	// --- PARSE JSON ---
	file, err := os.Open(*filename)
	if err != nil {
		errlog.Fatal(err)
	}

	// TODO: what does csv.Print expect?
	// JSON is smart enough to take care of all allocation, even with ptrs.
	data := make([]*summary.Description, 0) // why list?

	// TODO:
	/*
		Each entry in data is a test.
		Thus we must loop through each test
	*/

	dec := json.NewDecoder(file)
	err = dec.Decode(&data)

	if err != nil {
		errlog.Fatal(err)
	}

	fmt.Println(env.Name())

	// data now holds... data...

	testPerf := make([]intermediate.PerfMetrics, len(data))
	entries := make([]*intermediate.Result, len(data))

	for i, test := range data {
		// -- DEBUGGING --
		errlog.Printf("----[%d x %d, %s]----\n", test.Concurrency, test.Requests,
			test.Path)

		// --- GET START/END OF TEST FROM JSON ---
		// XXX: Overall is a ptr and thus could be nil
		if test.Overall == nil {
			errlog.Fatal("No overall data.")
		}

		// Round up to the next minute if the time interval is too small.
		// It might also be interesting to get a neighborhood of times around
		// the exact time. Actually since each datapoint is labelled, we can
		// be quite liberal with our ranges if need be.

		// Assumes that we will exit (log.Fatal) if Overall == nil.
		start := test.Overall.Summed.StartTime.Truncate(time.Minute)
		end := test.Overall.Summed.EndTime.Add(30 * time.Second).Round(time.Minute)

		errlog.Printf("Using:\nstart: %v,\nend: %v\n", start, end)
		testPerf[i].Start = start
		testPerf[i].End = end


		// XXX getting nil ptr deref. somewhere...
		// Am I forgetting to "make" some of these?
		// XXX Probably need to do a test..

		////// Don't need to make a []of testPerfs...

		///TODO need to alloc ptrs here
		// potentially just deal with env here.. needed in AddCW??
		entries[i] = &intermediate.Result{}
		AddCloudwatchData(entries[i], test, env, testPerf[i])
	}

	// DISCUSSION: We may want to do some parsing here, before passing
	// on to AddCloudwatchData. My assumption was that we needed the data
	// in some form other than what it is now.
	// In particular, it needed to be (mostly) ready for display. However,
	// we do want to leave the raw data for some of the consumers, including,
	// namely the GUI. 
	// Do we need to do any parsing on it at all then? Let's forgo it for now,
	// and just serialize what we get from CW.

	// Moving into loop.
	// result := AddCloudwatchData(&data, env, testPerf[])

	// write json to file
	bytes, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		errlog.Println(err)
	}

	// what if exists? seems to be cool with it.
	f, err := os.Create("annotated.json")
	if err != nil {
		panic("astuhosth")
	}
	defer f.Close()

	// write file
	f.Write(bytes)

	// TODO to convince myself it all works, I think I just need some
	// print statements in the structure-walking loops.
	// */
}

func percentile(counts *map[int64]int, total int) int64 {
	threshold := int(float64(total) * 0.95)
	sum := 0
	for key, count := range *counts {
		sum += count
		if sum >= threshold {
			return key
		} // This should always happen
	}
	return -1
}

// TODO basically just pass the times to this. our perfdata is {start, end: time, metrics: nil}

// This would be called once per test, right?
//mv this to another file enventually
func AddCloudwatchData(entry *intermediate.Result, desc *summary.Description, env Environment, perf intermediate.PerfMetrics) {
	// Note: here we are not concerned with matrices/tables
	// We only want a list of entries.

	// entries := make([]intermediate.Result, len(*parsed))
	// for i, desc := range *parsed {

		// In order to do this we would need a way to show that the
		// data was bogus, ie. a bool flag.

	if desc.Overall == nil {
		fmt.Println("No data in entry...")
		// XXX: need entries[i].DataOk = false
		return
	}
	// Aliases to save my fingers
	data := desc.Overall.Summed
	stats := desc.Overall

	// Compute any needed data
	slowest := time.Duration(data.Slowest) / time.Millisecond
	fastest := time.Duration(data.Fastest) / time.Millisecond
	notOk := data.TotalReqs - data.Statuses["200"]
	p95 := percentile(&data.ReqTimesBinned, data.TotalReqs)

	// TODO will need bin size to do acc. percentile
	*entry = intermediate.Result{
		Concurrency:    desc.Concurrency,
		Requests:       desc.Requests,
		Path:           desc.Path,
		ErrorCount:     notOk,
		Statuses:       data.Statuses,
		ReqTimesBinned: data.ReqTimesBinned,
		AvgReqTime:     stats.Mean, // using mine, not theirs
		ReqTimeSD:      stats.StandardDeviation,
		MaxReqTime:     int64(slowest),
		MinReqTime:     int64(fastest),
		ReqsPerSec:     data.AveReqPerSec,
		Performance:    perf,
		Env:            env.Name(),
		Time95PctDone:  p95,
		// dataOk: true,
	}

	// }
	// return &entries
}
