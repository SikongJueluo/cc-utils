set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

sync-path := if os_family() == "windows" { "/cygdrive/c/Users/sikongjueluo/AppData/Roaming/CraftOS-PC/computer/0/user/" } else { "/home/sikongjueluo/.local/share/craftos-pc/computer/0/user/" }

build: build-autocraft build-accesscontrol build-test build-example sync

build-autocraft:
    pnpm tstl -p ./tsconfig.autocraft.json

build-accesscontrol:
    pnpm tstl -p ./tsconfig.accesscontrol.json

build-test:
    pnpm tstl -p ./tsconfig.test.json

build-example:
    pnpm tstl -p ./tsconfig.tuiExample.json

sync:
    rsync --delete -r "./build/" "{{ sync-path }}"

lint:
    pnpm dlx eslint src/**/*.ts --fix
