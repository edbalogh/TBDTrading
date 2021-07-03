 import { MongoClient, Collection, Db } from 'mongodb'
import config from '../../config'


export async function getClient(): Promise<MongoClient> {
    const mongoClient = new MongoClient(config.mongo.uri, { useNewUrlParser: true, useUnifiedTopology: true })
    return mongoClient.connect()
}

export async function run(cb: Function, database?: any): Promise<any> {
    const client = await getClient()
    try {
        await client.connect()
        const db = client.db(database || config.mongo.defaultDatabase)
        return await cb(db)
    } catch(e) {
        console.log('error running collectionProcessor', e)
    } finally {
        client.close()
    }
}

export async function collectionProcessor(collection: string, cb: Function, database?: any): Promise<any> {
    const client = await getClient()
    try {        
        await client.connect()
        const db =  client.db(database || config.mongo.defaultDatabase)
        const cln = db.collection(collection)
        return await cb(cln)
    } 
    catch(e) {
        console.log('error running collectionProcessor', e)
    } finally {
        client.close()
    }
}

export async function findOne(collection: string, query: any, database?: string): Promise<any> {
    const cb = async (cln: Collection<any>) => {
        return await cln.findOne(query)
    }
    return collectionProcessor(collection, cb, database)
}

export async function upsert(collection: string, document: any, query: any, database?: any): Promise<any> {
    const cb = async (cln: Collection) => {
        return await cln.replaceOne(query, document, { upsert: true })
    }
    return collectionProcessor(collection, cb, database)
}

export async function insertOne(collection: string, document: any, database?: any): Promise<any> {
    const cb = async (cln: Collection) => {
        return await cln.insert(document)
    }
    return collectionProcessor(collection, cb, database)
}
