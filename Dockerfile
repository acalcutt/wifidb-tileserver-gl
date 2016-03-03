FROM node:5.7.1
MAINTAINER Petr Sloup <petr.sloup@klokantech.com>

RUN apt-get -qq update \
&& DEBIAN_FRONTEND=noninteractive apt-get -qq -y install \
    xvfb \
&& apt-get clean

RUN mkdir -p /usr/src/app
COPY / /usr/src/app
RUN cd /usr/src/app && npm install

VOLUME /data
WORKDIR /data

EXPOSE 80
CMD ["/usr/src/app/run.sh"]
