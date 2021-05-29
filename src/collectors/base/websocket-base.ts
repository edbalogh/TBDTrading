import cors from 'cors'
import express, {Express, NextFunction, Request, Response} from 'express'
import http from 'http'
import {Server, Socket} from 'socket.io'
import config from '../../../config'

export function startProviderServer() {
    const app: Express = express();
    const server = http.createServer(app);
    const io = new Server(server);

    server.listen(config.webServer.port, () => console.log(`Listening on port: ${config.webServer.port}`));

    app.use(express.json());
    app.use(cors());

    app.use((err: any, req: Request, res: Response, next: NextFunction) => next(res.status(err.output.statusCode).json(err.output.payload)));

    io.on("connection", (socket: Socket) => {
        console.log(`user connected: ${socket.id}`)
    });

    io.on("disconnect", (reason: any) => {
        console.log(reason);
    });

    return io
}
