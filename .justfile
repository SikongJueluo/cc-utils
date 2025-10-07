set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

build: build-autocraft sync

build-autocraft:
    pnpm build-autocraft

sync:
    cp -r "./build/*" "C:\\Users\\sikongjueluo\\AppData\\Roaming\\CraftOS-PC\\computer\\0\\user\\"
