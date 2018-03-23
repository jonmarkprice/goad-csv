package reducers

import "math"

type reducer func(xs []float64) float64

var Map = map[string]reducer{
	"Average": avg,
	"Sum": sum,
	"Maximum": max,
	"Minimum": min,
	"ExtendendStatistics": noop, // not supported
	"SampleCount": count,
}

func count(xs []float64) float64 {
	return float64(len(xs))
}

// Unexported individual functions
func avg(xs []float64) float64 {
	if len(xs) == 0 {
		return math.NaN() // must check explicitly or go panics
	}
	sum := 0.0
	for _, x := range xs {
		sum += x
	}
	return sum / float64(len(xs))
}

func sum(xs []float64) float64 {
	if len(xs) == 0 {
		return math.NaN() // must check explicitly or go panics
	}
	sum := 0.0
	for _, x := range xs {
		sum += x
	}
	return sum
}

func max(xs []float64) float64 {
	if len(xs) == 0 {
		return math.NaN() // cleaner, IMHO than -Inf
	}
	max := xs[0]
	for _, x := range xs {
		if x > max {
			max = x
		}
	}
	return max

}

func min(xs []float64) float64 {
	if len(xs) == 0 {
		return math.NaN() // cleaner, IMHO than +Inf
	}
	min := xs[0]
	for _, x := range xs {
		if x < min {
			min = x
		}
	}
	return min
}

func noop(xs []float64) float64 {
	return math.NaN() // Mock out extended statistics
}





