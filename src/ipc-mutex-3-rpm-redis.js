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

import fs        from "fs"
import Redis     from "ioredis"
import redisLock from "redis-lock"

/*  Mutex for Remote-Process-Model (RPM) with Redis standalone database  */
export default class Mutex {
    constructor (url) {
        if (!url.pathname)
            throw new Error("missing pathname in URL")
        this.url    = url
        this.opened = false
        this.lock   = null
        this.locked = false
        this.unlock = null
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        return new Promise((resolve, reject) => {
            let options = {}
            options.host = this.url.hostname
            options.port = this.url.port ? parseInt(this.url.port) : 6379
            if (this.url.password)
                options.password = this.url.password
            if (this.url.pathname)
                options.keyPrefix = this.url.pathname.replace(/^\/([^/]+).*/, "$1/")
            if (   this.url.searchParams !== undefined
                && (   this.url.searchParams.get("tls")
                    || this.url.searchParams.get("ca")
                    || this.url.searchParams.get("key")
                    || this.url.searchParams.get("crt"))) {
                options.tls = { rejectUnauthorized: false }
                if (this.url.searchParams.get("ca")) {
                    options.tls.ca = fs.readFileSync(this.url.searchParams.get("ca")).toString()
                    options.tls.rejectUnauthorized = true
                }
                if (this.url.searchParams.get("key"))
                    options.tls.key = fs.readFileSync(this.url.searchParams.get("key")).toString()
                if (this.url.searchParams.get("crt"))
                    options.tls.cert = fs.readFileSync(this.url.searchParams.get("crt")).toString()
            }
            this.client = new Redis(options)
            this.lock = redisLock(this.client)
            let handled = false
            this.client.on("connect", () => {
                if (handled)
                    return
                handled = true
                this.opened = true
                resolve()
            })
            this.client.on("error", (err) => {
                if (handled)
                    return
                handled = true
                reject(err)
            })
        })
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.lock("IPC-Mutex-rpm", 10 * 1000, (unlock) => {
                this.unlock = unlock
                this.locked = true
                resolve()
            })
        })
    }

    /*  release mutual exclusion lock  */
    async release () {
        if (!this.opened)
            throw new Error("still not opened")
        if (!this.locked)
            throw new Error("still not acquired")
        return new Promise((resolve, reject) => {
            this.unlock(() => {
                this.unlock = null
                this.locked = false
                resolve()
            })
        })
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        this.client.quit()
        delete this.client
        this.opened = false
    }
}

