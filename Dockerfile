FROM golang:1.4.2-wheezy
MAINTAINER Noah Shibley
#Build environment container for Pass Ninja web app

#get go libraries
WORKDIR /go/src
RUN go get github.com/zenazn/goji && \
go get github.com/lidashuang/goji_gzip && \
go get github.com/nullboundary/govalidator && \
go get github.com/coreos/go-etcd/etcd && \
go get github.com/dancannon/gorethink && \
go get github.com/xordataexchange/crypt/config && \
go get github.com/hashicorp/logutils && \
go get github.com/dgrijalva/jwt-go && \
go get github.com/pressly/cji && \
go get golang.org/x/oauth2 && \
go get github.com/markbates/goth

#install crypt for setting up encrypted etcd key/value
RUN go install github.com/xordataexchange/crypt/bin/crypt

#private repos need ssh key. TODO
#RUN go get bitbucket.org/cicadaDev/storer
#RUN go get bitbucket.org/cicadaDev/utils

WORKDIR /go/src/bitbucket.org/passNinja
EXPOSE 80 443

#build this container
#docker build -t passninja/build-web .

#access and run bash in build container
#docker run --rm -it -v "$PWD":/go/src/bitbucket.org/passNinja passninja/build-web /bin/bash -i

#to compile app in container
#docker run --rm -v "$PWD":/go/src/bitbucket.org/passNinja passninja/build-web go build -v

#run the app in the container
#docker run --rm --name ninjawebapp1 -v "$PWD":/go/src/bitbucket.org/passNinja --link ninjadb1:ninjadb -p 443:10443 passninja/build-web ./passNinja
#docker run --rm --name ninjawebapp1 -v "$PWD":/go/src/bitbucket.org/passNinja -v "$PWD"/www:/usr/share/ninja/www  -v "$PWD"/tls:/etc/ninja/tls --link ninjadb1:ninjadb -p 443:10443 passninja/build-web ./passNinja
