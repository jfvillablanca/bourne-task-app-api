# Bourne Task App API

#### (Work in progress)
#### This backend provides the API endpoints for the Bourne Task App.

### Table of Contents

- [Installation](#installation)
  - [Nix Dev Environment](#nix-dev-environment)
- [Development](#development)
  - [MongoDB Playground](#mongodb-playground)
- [Testing](#testing)
  - [Running Watched Tests](#running-watched-tests)
- [Production](#production)
- [Contribute](#contribute)
- [License](#license)

## Installation <a name="installation"></a>

```bash
$ yarn install
```

<details>
<summary>Nix Dev Environment </summary>

### Nix Dev Environment <a name="nix-dev-environment"></a>

- The development environment on my local machine is set up using a declarative approach with the help of a `flake.nix` file. It provides an isolated environment that includes the necessary packages like `nest-cli` and `docker`.

  - If you use Nix and enabled flake experimental features: you can just run:

```bash
# This will install packages such as nodejs, yarn, etc and run `yarn install`
$ nix develop
```

- You can also enable `direnv` in order to [automatically enter the environment](https://devenv.sh/automatic-shell-activation/#using-direnv) without running `nix develop` all the time

- If you want this type of workflow, checkout [devenv.sh](https://devenv.sh/getting-started/)

      - In this context, the presence of `devenv.nix` is not required as the configuration expression is already declared as a module within the `flake.nix` file.

  </details>

## Development <a name="development"></a>

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev
```

### MongoDB Playground: <a name="mongodb-playground"></a>

- Make sure that you have a MongoDB instance running on port 27018 before starting the application in development mode.

```bash
# Good thing we can easily spin one up with a docker container, just run (in detached mode)
$ docker compose up mongodb-playground -d
```

- Then you can use Insomnia/Postman to make your HTTP requests and check the database with Mongo Shell or MongoDB Compass.

## Testing <a name="testing"></a>

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

### Running Watched Tests: <a name="running-watched-tests"></a>

- The tests uses `mongodb-memory-server` which spins up a `mongod` instance and holds data in memory.

  - You could get away with running `yarn start:dev` out of the box and `mongodb-memory-server` will download a mongodb binary based on your operating system.

- In the rare case that your operating system does not have a [prebuilt binary for mongodb](https://nodkz.github.io/mongodb-memory-server/docs/guides/supported-systems/) such as Alpine Linux or NixOS (the machine that I use 💪)

  - You can run a Docker container with a Debian image.

```bash
# Build the 'test-watch' service. See docker-compose.yml
$ docker compose build test-watch

# Run the container. This will be equivalent to 'jest --watch'
$ docker compose run test-watch
```

## Production <a name="production"></a>

```bash
# production mode
$ yarn run start:prod
```

## Contribute <a name="contribute"></a>

Feel free to open an issue/PR if you have a question, suggestion, whatever.

## License <a name="license"></a>

The project is licensed under the MIT license.
