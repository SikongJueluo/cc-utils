set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

build: build-autocraft build-accesscontrol build-test sync

build-autocraft:
    pnpm tstl -p ./tsconfig.autocraft.json

build-accesscontrol:
    pnpm tstl -p ./tsconfig.accesscontrol.json
    cp ./src/accesscontrol/access.config.json ./build/

build-test:
    pnpm tstl -p ./tsconfig.test.json

sync:
    cp -r "./build/*" "C:\\Users\\sikongjueluo\\AppData\\Roaming\\CraftOS-PC\\computer\\0\\user\\"
