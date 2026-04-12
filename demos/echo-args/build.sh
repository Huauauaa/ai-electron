#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
rm -f EchoArgs.class echo-args.jar MANIFEST.MF
javac EchoArgs.java
printf '%s\n' "Manifest-Version: 1.0" "Main-Class: EchoArgs" "" >MANIFEST.MF
jar cfm echo-args.jar MANIFEST.MF EchoArgs.class
echo "Built: $(pwd)/echo-args.jar"
