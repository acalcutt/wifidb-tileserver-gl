FROM node:4
MAINTAINER Petr Sloup <petr.sloup@klokantech.com>

RUN mkdir -p /usr/src/app
COPY / /usr/src/app
RUN cd /usr/src/app && npm install --production

VOLUME /data
WORKDIR /data

EXPOSE 80
ENTRYPOINT ["node", "/usr/src/app/", "-p", "80"]
