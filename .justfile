set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

sync-path := if os_family() == "windows" { "/cygdrive/c/Users/sikongjueluo/AppData/Roaming/CraftOS-PC/computer/0/user/" } else { "/home/sikongjueluo/.local/share/craftos-pc/computer/0/user/" }

build: build-autocraft build-accesscontrol build-test build-example sync

build-autocraft:
    pnpm tstl -p ./targets/tsconfig.autocraft.json

build-accesscontrol:
    pnpm tstl -p ./targets/tsconfig.accesscontrol.json

build-test:
    pnpm tstl -p ./targets/tsconfig.test.json

build-example: build-tuiExample build-cliExample build-logExample

build-tuiExample:
    pnpm tstl -p ./targets/tsconfig.tuiExample.json

build-cliExample:
    pnpm tstl -p ./targets/tsconfig.cliExample.json

build-logExample:
    pnpm tstl -p ./targets/tsconfig.logExample.json

sync:
    rsync --delete -r "./build/" "{{ sync-path }}"

lint:
    pnpm dlx eslint src/**/*.ts --fix
