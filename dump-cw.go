package main

import (
	"encoding/json"
	"flag"
	"log"
	"os"
	"time"

	"goad-csv/cwmetrics"
	"github.com/aws/aws-sdk-go/service/cloudwatch"
)

func main() {
	errlog := log.New(os.Stderr, "", 0) // to silence, use ioutil.Discard

	// --- PARSE COMMAND LINE ARGUMENTS ---
	period := flag.Int64("period", 1, "temporal resolution in seconds")

	// Either --EB or --Lambda
	eb := flag.Bool("EB", false, "the Elastic Beanstalk environment")
	lambda := flag.Bool("Lambda", false, "the Lambda environment")

	// TODO start, end tags
	// these are going to come in a strings and will need to be parsed into time.Time
	start := flag.String("start", "", "the start time, YYYY-MM-DDTHH:MM:SSZ")
	end := flag.String("end", "", "the end time, YYYY-MM-DDTHH:MM:SSZ")

	flag.Parse()

	format := time.RFC3339
	startTime, err := time.Parse(format, *start)
	if err != nil {
		errlog.Fatal("Bad --start value.")
	}

	endTime, err := time.Parse(format, *end)
	if err != nil {
		errlog.Fatal("Bad --end value.")
	}

	var env cwmetrics.Environment
	if *eb && !*lambda {
		env = cwmetrics.EB
	} else if *lambda && !*eb {
		env = cwmetrics.Lambda
	} else {
		// TODO usage
		errlog.Fatal("Must specify either --Lambda or --EB, but not both.")
	}

	//////////////////////////////////////////////////////////////////////////////
	real_start := startTime.Truncate(time.Minute)
	real_end := endTime.Add(30 * time.Second).Round(time.Minute)

	// errlog.Printf("Using:\nstart: %v,\nend: %v\n", start, end)
	var results []*cloudwatch.GetMetricStatisticsOutput
	var errs []error

	if env == cwmetrics.EB {
		results, errs = cwmetrics.Launch(cwmetrics.EB, real_start, real_end, *period)
	} else {
		results, errs = cwmetrics.Launch(cwmetrics.Lambda, real_start, real_end, *period)
	}

	if len(errs) > 0 {
		errlog.Fatal(errs)
	}

	bytes, err := json.Marshal(results)
	if err != nil {
		errlog.Println(err)
	}

	os.Stdout.Write(bytes)
}

