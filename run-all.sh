#!/bin/bash

if test $# -ne 2; then
  echo "Usage: run-all.sh --EB|--Lambda <folder>";
  exit;
fi

#echo "Env: $1"
#echo "Name: $2"
#echo "Goad file $3"

env=$1
name=$2
dir="$HOME/runs/${name}"

# goadd="$HOME/go/src/github.com/goadapp/goad/"
# results=/tmp/${resultDir}
# This no longer works, now we need a directory name from
# the runner. Or else it needs to make the file!

# Also, we need to ensure that we are treating ${file} as a directory.
# XXX file=${goadd}$3

echo "Env: $env"
echo "Dir: $dir"
# echo "Goad file: ${file}"

# TODO more err checking

mkdir $dir || true

#if test ! -d $file; then 
#  echo "No result directory $file.";
#  exit;
if test ! -d $dir; then
  echo "No directory $dir";
  exit;
fi

# run runner!
echo "Running tests..."
if node runner.js; then
  cp -v raw.json ${dir}/goad.json
else
  echo "Aborting"; exit;
fi

# cp $file $dir/goad.json

# TODO outfile
if ./annotate $env --file="${dir}/goad.json"; then
  cp -v annotated.json ${dir}/annotated.json
else
  echo "Aborting"; exit;
fi

./pull-cw $dir
