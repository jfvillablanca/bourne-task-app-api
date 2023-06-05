{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
    devshell.url = "github:numtide/devshell";
  };

  outputs = { self, nixpkgs, flake-utils, devshell, ... }:
    flake-utils.lib.eachDefaultSystem (system: {
      devShell =
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ devshell.overlays.default ];
          };
        in
        pkgs.devshell.mkShell {
          name = "bourne-task-app-api";
          commands = [
            {
              name = "node";
              package = pkgs.nodejs_20;
            }
            {
              name = "yarn";
              package = pkgs.yarn;
            }
            {
              name = "nest";
              package = pkgs.nest-cli;
            }
            {
              name = "insomnia";
              package = pkgs.insomnia;
            }
            {
              name = "docker";
              package = pkgs.docker;
            }
            {
              name = "docker-compose";
              package = pkgs.docker-compose;
            }
          ];
          env = [ ];
        };
    });
}
