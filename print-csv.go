package main

import (
	"encoding/json"
	"log"
	"os"
	"flag"

	"goad-csv/csv"
	"goad-csv/intermediate"
)

func main() {
	errlog := log.New(os.Stderr, "", 0)

	filename := flag.String("file", "", "JSON file to read")
	flag.Parse()

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

	// TODO: am i in charge of allocing?????
	var data *[]intermediate.Result
	dec := json.NewDecoder(file)
	err = dec.Decode(&data)
	if err != nil {
		errlog.Fatal(err)
	}
	csv.Print(data)
}

