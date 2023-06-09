# Using a Debian build
FROM node:20

# Installing "git" because "jest --watch" only works inside a git repository.
RUN apt-get install -y git

# Installing "libcurl4" because some Debian images may not come with this package installed, but is required by the mongodb binaries
RUN apt-get install libcurl4

WORKDIR /project

ENV GIT_DIR=/project/.git

COPY . /project

RUN yarn install --frozen-lockfile

ENTRYPOINT ["yarn", "run", "_test"]
