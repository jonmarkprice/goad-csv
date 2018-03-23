package summary

import "github.com/goadapp/goad/result"

// TODO: this might be a good place for fn.Environment
type Description struct {
    Concurrency int
    Requests    int
    Path        string // or url?
    Regions     map[string]result.AggData
    Overall     *Analyzed
}

type Analyzed struct {
    Summed              result.AggData
    StandardDeviation   float64
    Variance            float64
    Mean                float64
}
