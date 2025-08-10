import express from "express";
import { createServer } from "node:http";
import { hostname } from "node:os";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { createBareServer } from "@tomphttp/bare-server-node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import wisp from "wisp-server-node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bare = createBareServer("/bare/");
const app = express();

const mime = {
    '.obamahavedih': 'text/javascript'
};

app.use((req, res, next) => {
    const ext = path.extname(req.url).toLowerCase();
    if (mime[ext]) {
        const filePath = path.join(__dirname, req.url.split('?')[0]);
        fs.promises.access(filePath, fs.constants.F_OK)
            .then(() => {
                res.setHeader('Content-Type', mime[ext]);
                next();
            })
            .catch(() => {
                next();
            });
    } else {
        next();
    }
});

app.use(express.static(__dirname));

app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/bareasmodule/", express.static(bareModulePath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/scramjet/", express.static("scramjet"));
app.use("/envade/", express.static("envade"));

const server = createServer();

server.on("request", (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else app(req, res);
});
server.on("upgrade", (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else if (req.url.endsWith("/wisp/")) {
        wisp.routeRequest(req, socket, head);
    } else socket.end();
});
let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

server.on("listening", () => {
    const address = server.address();

    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(`\thttp://${hostname()}:${address.port}`);
    console.log(
        `\thttp://${
            address.family === "IPv6" ? `[${address.address}]` : address.address
        }:${address.port}`
    );
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        bare.close();
        process.exit(0);
    });
}

server.listen({
    port,
});