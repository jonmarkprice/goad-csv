#!/bin/bash

if test $# -ne 1; then
  echo "Usage: pull-cw.sh <folder>";
  exit;
fi

dir=$1

echo "Dir: $dir"
if test ! -d $dir; then
  echo "No directory $dir";
  exit;
fi

# TODO explictly take --in, --out
if node read-annot.js "${dir}/annotated.json"; then
  cp -v out.json ${dir}/perf.json
else
  echo "Aborting"; exit
fi

./print-csv --file="${dir}/perf.json" | tee "${dir}/table.csv"
