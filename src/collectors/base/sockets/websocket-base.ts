import cors from 'cors'
import express, {Express, NextFunction, Request, Response} from 'express'
import http from 'http'
import {Server, Socket} from 'socket.io'
import { ProviderOptions, ProviderType } from '../models/provider-options'
import { v4 as uuid } from 'uuid'
import { Mode } from '../../../constants/types'

export type SubscriptionType = 'BAR' | 'BOOK' | 'TRADE' | 'ORDER'

export class WebSocketServerBase {
    port: number
    url: string 
    connections: any = {}
    socketServer?: Server
    status: string
    connectionTime?: Date
    instanceId: string
    providerId: string
    providerType: ProviderType
    mode: Mode
    activeSubscriptions:any[] = []

    constructor(options: ProviderOptions, type: ProviderType, mode: Mode) {
        this.instanceId = uuid()
        this.providerId = options.id
        this.port = options.webSocketOptions ? options.webSocketOptions.port : 3000
        this.url = options.webSocketOptions && options.webSocketOptions.url ? options.webSocketOptions.url : 'https://localhost'
        this.providerType = type
        this.mode = mode
        this.status = 'ACTIVE'
        this.connectionTime = new Date()
    }
    
    startServer() {
        const app: Express = express()
        const server = http.createServer(app);
        server.listen(this.port, () => console.log(`Listening on port: ${this.port}`));
        this.socketServer = new Server(server);
        app.use(express.json()); 
        app.use(cors());
        app.use((err: any, req: Request, res: Response, next: NextFunction) => next(res.status(err.output.statusCode).json(err.output.payload)));
        
        this.socketServer.on("connection", (socket: Socket) => {
            this.connections[socket.id] = socket            
            console.log(`user connected: ${socket.id}`)
            socket.on('disconnect', (reason) => {
                console.log(`${new Date()} disconnecting ${socket.id}, reason=${reason}`)
                delete this.connections[socket.id]
            })
        })

        this.socketServer.on("message", (type: any) => {
            if (type === 'status') {
                this.socketServer?.emit("ServerStatus", {
                    providerId: this.providerId, type: 'WebSocket', status: this.status,
                    connections: this.connections.length, activeSubscriptions: this.activeSubscriptions
                })
            }
        })
    }

    addConnectionToActiveSubscription(connectionId: string, type: SubscriptionType, options: any) {
        console.log(`adding connection ${connectionId} to type ${type}`)

        // TODO: this is not finding the match when a 2nd connection asks for the same symbol
        const subscriptionDetails = this.findSubscriptionDetails(type, options)
        subscriptionDetails.connections.push(connectionId)
        console.log(this.activeSubscriptions)
    }

    removeConnectionFromActiveSubscriptions(connectionId: string, type: SubscriptionType, options: any) {
        console.log(`removing connection ${connectionId} from type ${type}`)
        const subscriptionDetails = this.findSubscriptionDetails(type, options)
        subscriptionDetails.connections = subscriptionDetails.connections.filter( (c: string) => c !== connectionId)
    }

    removeConnectionFromAllSubscriptions(connectionId: string) {
        console.log('remove connection from all subscriptions initiated')
        this.activeSubscriptions.forEach( (s: any) => {
            if(s.connections.includes(connectionId)) this.removeConnectionFromActiveSubscriptions(connectionId, s.type, s.options)
        })
    }

    subscriptionExists(type: SubscriptionType, options: any) {
        return this.activeSubscriptions.filter( (s:any) => s.type === type && s.options === options).length > 0
    }

    findSubscriptionDetails(type: SubscriptionType, options: any): any {
        let sub = this.activeSubscriptions.find( (a: any) => {
            a.type === type && a.options === options
        })

        if (!sub) {
            sub = {type, options, connections: []}
            this.activeSubscriptions.push(sub)
        }

        return sub
    }

    close() {
        this.socketServer?.close()
    }
}
