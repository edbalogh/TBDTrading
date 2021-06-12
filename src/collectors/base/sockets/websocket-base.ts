import cors from 'cors'
import express, {Express, NextFunction, Request, Response} from 'express'
import http from 'http'
import {Server, Socket} from 'socket.io'
import { ProviderOptions, ProviderType } from '../models/provider-options'
import { v4 as uuid } from 'uuid'
import { isEqual } from 'lodash'
import { Mode } from '../../../constants/types'

export type SubscriptionType = 'BAR' | 'BOOK' | 'TRADE' | 'ORDER'

export class WebSocketServerBase {
    port: number
    url: string 
    connections: Map<string, Socket> = new Map()
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
        
        this.socketServer.on('connection', (socket: Socket) => {
            this.connections.set(socket.id, socket)            
            console.log(`user connected: ${socket.id}`)

            socket.on('disconnect', (reason) => {
                console.log(`${new Date()} disconnecting ${socket.id}, reason=${reason}`)
                this.connections.delete(socket.id)
            })

            socket.on('message', (type: any) => {
                if (type === 'status') {
                    socket.emit('ServerStatus', {
                        providerId: this.providerId, type: 'WebSocket', status: this.status,
                        connections: this.connections.size, activeSubscriptions: this.activeSubscriptions
                    })
                }
            })

            socket.on('ping', () => socket.emit('pong'))
        })        
    }
    
    addSubscription(connectionId: string, type: SubscriptionType, options: any) {
        if (this.subscriptionExists(type, options)) {
            console.log(`adding new connection ${connectionId} to existing type ${type}`)
            const subscriptionDetails = this.findSubscriptionDetails(type, options)
            if (!subscriptionDetails.connections.includes(connectionId)) subscriptionDetails.connections.push(connectionId)
        } else {
            console.log(`adding new subscription type ${type} with connection ${connectionId}`)
            this.activeSubscriptions.push({type, options, connections: [connectionId]})
        }
    }

    removeConnectionFromActiveSubscriptions(connectionId: string, type: SubscriptionType, options: any) {
        console.log(`removing connection ${connectionId} from type ${type}`)
        const subscriptionDetails = this.findSubscriptionDetails(type, options)
        subscriptionDetails.connections = subscriptionDetails.connections.filter( (c: string) => c !== connectionId)
        this.cleanActiveSubscriptions()
    }

    removeConnectionFromAllSubscriptions(connectionId: string) {
        console.log('remove connection from all subscriptions initiated')
        this.activeSubscriptions.forEach( (s: any) => {
            if(s.connections.includes(connectionId)) this.removeConnectionFromActiveSubscriptions(connectionId, s.type, s.options)
        })
        this.cleanActiveSubscriptions()
    }

    subscriptionExists(type: SubscriptionType, options: any) {
        return this.activeSubscriptions.filter( (s:any) => {
            return s.type === type && isEqual(s.options, options)
        }).length > 0
    }

    cleanActiveSubscriptions() {
        this.activeSubscriptions = this.activeSubscriptions.filter(a => a.connections.length > 0)
    }

    findSubscriptionDetails(type: SubscriptionType, options: any): any {
        return this.activeSubscriptions.find( (a: any) => {
            return a.type === type && isEqual(a.options, options)
        })
    }

    close() {
        this.status = 'CLOSED'
        this.socketServer?.close()
    }
}
