#!/bin/bash -e
#Make would do this better but coreos doesn't have make!
DESTDIR="/home/core/deployNinja/passNinja"
BINDIR=${DESTDIR}/bin
TARGET="passNinja"
IMAGE="passninja/build-web"
CMD=$1

if [ -z "$1" ]; then
	echo usage: args [build, install, deploy]
	exit 1
elif [ $# -gt 1 ]; then
	echo usage: $0 args [build, install, deploy]
	exit 1
fi

#deploy
if [ "$CMD" == "deploy" ]; then
	echo Deploying... $TARGET to $BINDIR
	cp $TARGET $BINDIR
	exit 0
#all
elif [ "$CMD" == "build" ]; then
	echo Linting...
	docker run --rm -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE golint
	echo --------------------------------------------------------------
	echo Vetting...
	docker run --rm -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE go vet
	echo --------------------------------------------------------------
	echo Building...
	docker run --rm -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE go build -v
	exit 0
#install
elif [ "$CMD" == "install" ]; then
	echo Installing...
	docker run --rm -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE go install
	exit 0
else
	echo usage: option [build, install, deploy]
	exit 1
fi
