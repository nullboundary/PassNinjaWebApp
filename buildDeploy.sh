#!/bin/bash -e
#Make would do this better but coreos doesn't have make!
DESTDIR="/home/core/deployNinja/passNinja"
BINDIR=${DESTDIR}/bin
TARGET="passNinja"
SRCDIR="www/static/public/"
IMAGE="passninja/build-web"
CMD=$1


if [ -z "$1" ]; then
	#echo usage: args [build, install, stage, deploy, minify]
	echo usage: args [build, install, stage, test, minify]
	exit 1
elif [ $# -gt 2 ]; then
	#echo usage: $0 args [build, install, stage, deploy, minify]
	echo usage: $0 args [build, install, stage, test, minify]
	exit 1
fi


function minify {
	echo Minifying Javascript...
	echo --------------------------------------------------------------
	docker run --rm -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE goClosure all www/static/auth/accounts.html ninja.min.js -m /assets/js -p /assets/:$SRCDIR
	#copy js to deploy
	echo Deploying... ninja.min.js to ${DESTDIR}/${SRCDIR}js/
	mv ninja.min.js ${DESTDIR}/${SRCDIR}js/
	#copy html to deploy
	echo Deploying... accounts.min.html to ${DESTDIR}/www/static/auth/accounts.html
	mv www/static/auth/accounts.min.html ${DESTDIR}/www/static/auth/accounts.html
}

#stage copies bin to deploy bin directory
if [ "$CMD" == "stage" ]; then
	echo Staging Binary... $TARGET to $BINDIR
	cp $TARGET $BINDIR
	if [ "$2" == "all" ]; then
		echo --------------------------------------------------------------
		echo Staging www... $SRCDIR
		cp -R ${SRCDIR} ${DESTDIR}/www/static/
		#remove normal js and minify js
		rm -r ${DESTDIR}/www/static/public/js/
		mkdir ${DESTDIR}/www/static/public/js/
		minify
		#restore js files needed for index.html (todo: should also be minified)
		cp ${SRCDIR}js/register.js ${DESTDIR}/${SRCDIR}js/
		cp ${SRCDIR}js/api.js ${DESTDIR}/${SRCDIR}js/
		mkdir ${DESTDIR}/www/static/public/js/plugin/
		cp ${SRCDIR}js/plugin/dialog-polyfill.js ${DESTDIR}/${SRCDIR}js/plugin/dialog-polyfill.js
	fi
	exit 0
#build, builds the binary
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
#minify, minifies the js and moves it to the deploy js directory
elif [ "$CMD" == "minify" ]; then
	minify
	exit 0
#run go tests
elif [ "$CMD" == "test" ]; then
	echo Testing...
	docker run --rm  -v $PWD/www:/usr/share/ninja/www -v /etc/ssl/passninja-web-certs/:/etc/ninja/tls -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE go test
	exit 0	
#deploy pushes the deploy directory live to the server. NOT WORKING!
#elif [ "$CMD" == "deploy" ]; then
#	MSG="${2?"No git commit messsage"}"
#	echo "$MSG"
#	echo Pushing deploy live to server...
#	echo --------------------------------------------------------------
#	git --git-dir=/home/core/deployNinja/.git --work-tree=${DESTDIR} add .
#	git --git-dir=/home/core/deployNinja/.git --work-tree=${DESTDIR} commit -m "$MSG"
#	git --git-dir=/home/core/deployNinja/.git --work-tree=${DESTDIR} push live master
#	exit 0
#install, installs the binary inside the build-web docker image
elif [ "$CMD" == "install" ]; then
	echo Installing...
	docker run --rm -v $PWD:/go/src/bitbucket.org/$TARGET $IMAGE go install
	exit 0
else
	echo usage: option [build, install, deploy, minify]
	exit 1
fi
