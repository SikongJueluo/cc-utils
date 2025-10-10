{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    pnpm
  ];

  # https://devenv.sh/languages/
  languages.typescript.enable = true;
}
