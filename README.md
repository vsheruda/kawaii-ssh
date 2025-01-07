# Kawaii SSH

A subjectively nice GUI for ssh cmd. Created to easily manage multiple SSH tunnels and stop bothering with dozens of terminal windows.

## Demo

![Demo 0.3.0](etc/demo-0.3.0.gif)


## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.

```shell
wails build -platform darwin/universal
```

```shell
wails build -platform linux/amd64
```

```shell
wails build -platform windows/amd64
```

### To change icon
- Change the default appicon.png
- Delete: /build/bin and /frontend/dist then run `wails dev`

## Debug

```shell
wails build -platform darwin/amd64
```

```shell
$ dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient --build-flags='-tags=dev'
```

## Issues

- [ ] Decouple saving profile from tunnel connection state;
- [ ] Log file is not saved;
- [ ] Add visual grouping by server;
- [ ] Add autocomplete for key paths;