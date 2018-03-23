#!/bin/bash

if test $# -ne 3; then
  echo "Usage: run-all.sh --EB|--Lambda <folder> <goad out file>";
  exit;
fi

#echo "Env: $1"
#echo "Name: $2"
#echo "Goad file $3"

env=$1
name=$2
dir="$HOME/runs/${name}"
goadd="$HOME/go/src/github.com/goadapp/goad/"
file=${goadd}$3

echo "Env: $env"
echo "Dir: $dir"
echo "Goad file: ${file}"

# TODO more err checking

mkdir $dir || true

if test ! -f $file; then 
  echo "No file $file.";
  exit;
elif test ! -d $dir; then
  echo "No directory $dir";
  exit;
fi

cp $file $dir/goad.json

# TODO outfile
if ./annotate $env --file="${dir}/goad.json"; then
  cp -v annotated.json ${dir}/annotated.json
else
  echo "Aborting"; exit;
fi

# TODO explictly take --in, --out
if node read-annot.js "${dir}/annotated.json"; then
  cp -v out.json ${dir}/perf.json
else
  echo "Aborting"; exit
fi

./print-csv --file="${dir}/perf.json" > "${dir}/${name}.csv"
