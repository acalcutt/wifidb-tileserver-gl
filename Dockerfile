FROM debian:stretch
MAINTAINER Petr Sloup <petr.sloup@klokantech.com>

RUN apt-get -qq update \
&& DEBIAN_FRONTEND=noninteractive apt-get -y install \
    curl \
    build-essential \
    python \
    libcairo2-dev \
    xvfb \
&& curl -sL https://deb.nodesource.com/setup_4.x | bash - \
&& apt-get -y install nodejs \
&& apt-get clean

RUN mkdir -p /usr/src/app
COPY / /usr/src/app
RUN cd /usr/src/app && npm install --production

VOLUME /data
WORKDIR /data

EXPOSE 80
CMD ["/usr/src/app/run.sh"]
