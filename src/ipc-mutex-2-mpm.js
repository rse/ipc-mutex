/*
**  IPC-Mutex -- Inter-Process-Communication Mutual Exclusion Lock
**  Copyright (c) 2018 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import Bluebird from "bluebird"
import cluster  from "cluster"
import { Lock } from "lock"

/*  internal Mutex class  */
class InternalMutex {
    constructor (id) {
        this.id     = id
        this.lock   = Lock()
        this.unlock = null
    }
    acquire (cb) {
        this.lock(`IPC-Mutex-mpm:${this.id}`, (unlock) => {
            this.unlock = unlock
            cb(null)
        })
    }
    release (cb) {
        if (this.unlock === null)
            throw new Error("still not acquired")
        this.unlock((err) => {
            if (err)
                cb(err)
            else {
                this.unlock = null
                cb(null)
            }
        })()
    }
    destroy (cb) {
        if (this.unlock !== null)
            this.release().then(() => cb(null), (err) => cb(err))
        else
            cb(null)
    }
}

/*  Mutex for Multi-Process-Model (MPM)  */
export default class Mutex {
    constructor (url) {
        if (url.hostname === "")
            throw new Error("no mutex id given")
        this.url    = url
        this.id     = this.url.hostname
        this.opened = false
        this.mutex  = null
        this.crpc   = null
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        let methods = [ "acquire", "release", "destroy" ]
        if (cluster.isMaster) {
            let mutex = new InternalMutex(this.id)
            this.crpc = require("cluster-rpc/master").create({
                debug:     false,
                addOnFork: true,
                instance:  mutex,
                methods:   methods,
                name:      `IPC-Mutex-mpm:${this.id}`
            })
            for (const id in cluster.workers)
                this.crpc.addWorker(cluster.workers[id])
        }
        else {
            this.crpc = require("cluster-rpc/worker").create({
                debug: false,
                name:  `IPC-Mutex-mpm:${this.id}`
            })
        }
        return this.crpc.then((mutex) => {
            methods.forEach((method) => {
                mutex[method] = Bluebird.promisify(mutex[method], { context: mutex })
            })
            this.mutex = mutex
            this.opened = true
        })
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        return this.mutex.acquire()
    }

    /*  release mutual exclusion lock  */
    async release () {
        return this.mutex.release()
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (cluster.isMaster)
            await this.mutex.destroy()
        this.mutex  = null
        this.crpc   = null
        this.opened = false
    }
}

