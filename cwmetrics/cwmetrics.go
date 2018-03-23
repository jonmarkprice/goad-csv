package cwmetrics

import (
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/cloudwatch"
)

// Take a pair of timestamps and an ENUM
type Environment int
const (
	EB		Environment	= iota
	Lambda
)

func (env Environment) Name() string {
	return [...]string{"EB", "Lambda"}[env]
}

// TODO: Get from args or cfg file.
// Double check -- is this ID still good
// Specific to an invidual use-case

// const EB_AGN = "awseb-e-gu5i866cza-stack-AWSEBAutoScalingGroup-SVMRO7LZI23T"
const LAMBDA_FN  = "mcilroy-dev-sessions"
const EB_INST_ID = "i-0929206f39cbf911d"
const CWAGENT_IP = "ip-172-31-21-177"

type Metric struct {
	Name		string
	Statistic	string // only support one for now -- YAGNI
	Namespace	string
	Dimension	*cloudwatch.Dimension
}

// Alias XXX: seemingly not working, TODO test by themselves...
// type out cloudwatch.GetMetricStatisticsOutput
// type cw cloudwatch.CloudWatch
func getMetric(m Metric, start, end time.Time, svc *cloudwatch.CloudWatch, period int64) (*cloudwatch.GetMetricStatisticsOutput, error) {
	// We need to ensure that period * time <= 1440 as this is the CW limit.
	// TODO: If not we will need to parition the test times and perf. mult.
	// tests.
	input := &cloudwatch.GetMetricStatisticsInput{
		MetricName: aws.String(m.Name),
		Namespace: aws.String(m.Namespace),
		StartTime: aws.Time(start),
		EndTime: aws.Time(end),
		Period: aws.Int64(period),
		Statistics: []*string{aws.String(m.Statistic)},
		Dimensions: []*cloudwatch.Dimension{m.Dimension},
	}

	res, err := svc.GetMetricStatistics(input)
	return res, err
}


/* 
func getEBMetric(m Metric, start, end time.Time, svc *cloudwatch.CloudWatch, period int64) (*cloudwatch.GetMetricStatisticsOutput, error) {
	// We need to ensure that period * time <= 1440 as this is the CW limit.
	// TODO: If not we will need to parition the test times and perf. mult.
	// tests.
	input := &cloudwatch.GetMetricStatisticsInput{
		MetricName: aws.String(m.Name),
		Namespace: aws.String(m.Namespace),
		StartTime: aws.Time(start),
		EndTime: aws.Time(end),
		Period: aws.Int64(period),
		Statistics: []*string{aws.String(m.Statistic)},
		Dimensions: []*cloudwatch.Dimension{
			&cloudwatch.Dimension{
				Name: aws.String("AutoScalingGroupName"),
				Value: aws.String(EB_AGN),
			},
		},
	}

	res, err := svc.GetMetricStatistics(input)
	return res, err
}

func getLambdaMetric(m Metric, start, end time.Time, svc *cloudwatch.CloudWatch, period int64) (*cloudwatch.GetMetricStatisticsOutput, error) {
	// We need to ensure that period * time <= 1440 as this is the CW limit.
	// TODO: If not we will need to parition the test times and perf. mult.
	// tests.
	input := &cloudwatch.GetMetricStatisticsInput{
		MetricName: aws.String(m.Name),
		Namespace: aws.String("AWS/Lambda"),
		StartTime: aws.Time(start),
		EndTime: aws.Time(end),
		Period: aws.Int64(period),
		Statistics: []*string{aws.String(m.Statistic)},
		Dimensions: []*cloudwatch.Dimension{
			&cloudwatch.Dimension{
				Name: aws.String("FunctionName"),
				Value: aws.String(LAMBDA_FN),
			},
		},
	}

	res, err := svc.GetMetricStatistics(input)
	return res, err
}
*/

// TODO Don't forget to gather the memory usage from EC2 instances.
// Will need to inst. agent
func Launch(env Environment, start, end time.Time, period int64) ([]*cloudwatch.GetMetricStatisticsOutput, []error) {
    sess := session.Must(session.NewSession(&aws.Config{
        Region: aws.String("us-east-2"),
        // or use SharedConfigStatue...
    }))

	ebIdDim := &cloudwatch.Dimension{
		Name: aws.String("InstanceId"),
		Value: aws.String(EB_INST_ID),
	}

	lambdaFnDim := &cloudwatch.Dimension{
		Name: aws.String("FunctionName"),
		Value: aws.String(LAMBDA_FN),
	}

	cwAgentDim := &cloudwatch.Dimension{
		Name: aws.String("host"),
		Value: aws.String(CWAGENT_IP),
	}

	var svc *cloudwatch.CloudWatch
    svc = cloudwatch.New(sess)
	results	:= make([]*cloudwatch.GetMetricStatisticsOutput, 0)
	errs	:= make([]error, 0)

	// TODO: move m, dims here
	m := make([]Metric, 0)

	switch env {
	case EB:
		m = []Metric{
			{"CPUUtilization", "Maximum", "AWS/EC2", ebIdDim},
			{"mem_used_percent", "Maximum", "CWAgent", cwAgentDim},
			{"swap_used_percent", "Maximum", "CWAgent", cwAgentDim},
		}
		// TODO memory from agent
	case Lambda:
		m = []Metric{
			{"ConcurrentExecutions", "Maximum", "AWS/Lambda", lambdaFnDim},
			{"Invocations", "Sum", "AWS/Lambda", lambdaFnDim},
			{"Duration", "Maximum", "AWS/Lambda", lambdaFnDim},
		}
	}

	///////////////////////////////////////////////
	for i := range m {
		out, err := getMetric(m[i], start, end, svc, period)
		if err != nil {
			errs = append(errs, err)
		} else {
			results = append(results, out)
		}
	}

	return results, errs
}

