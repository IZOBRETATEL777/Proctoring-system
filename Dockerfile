# dockerfile for nodejs express project

# base image
FROM node:16.3.0-alpine3.13

# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH /usr/src/app/node_modules/.bin:$PATH

# install and cache app dependencies
COPY package.json /usr/src/app/package.json
RUN npm install --silent
RUN npm install

# add app
COPY . /usr/src/app

# start app
CMD ["npm", "start"]


