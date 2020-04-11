#!/bin/bash

cd "$1"

[ -f ./pom.xml ] && grep java ./pom.xml > /dev/null && echo JAVA && exit

echo SOMETHINGELSE