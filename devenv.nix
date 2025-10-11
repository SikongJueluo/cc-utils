{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    pnpm
    craftos-pc
    qwen-code
    gemini-cli
  ];

  # https://devenv.sh/languages/
  languages.typescript.enable = true;
}
