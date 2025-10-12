{
  pkgs,
  lib,
  config,
  inputs,
  ...
}: {
  packages = with pkgs; [
    pnpm
    craftos-pc
  ];

  # https://devenv.sh/languages/
  languages.typescript.enable = true;
}
