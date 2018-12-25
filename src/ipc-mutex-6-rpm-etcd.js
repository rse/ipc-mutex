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

import { Etcd3 as EtcD } from "etcd3"

/*  Mutex for Remote-Process-Model (RPM) with EtcD cluster manager  */
export default class Mutex {
    constructor (url) {
        if (!url.pathname)
            throw new Error("missing pathname in URL")
        this.url        = url
        this.id         = this.url.pathname.replace(/^\/([^/]+).*/, "$1")
        this.etcd       = null
        this.lock       = null
        this.lockdelay  = this.url.searchParams && this.url.searchParams.get("lockdelay") ? this.url.searchParams.get("lockdelay") : 0.5
        this.opened     = false
        this.locked     = false
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        let options = {}
        if (this.url.searchParams !== undefined && this.url.searchParams.get("tls"))
            options.hosts = "https://"
        else
            options.hosts = "http://"
        options.hosts += `${this.url.hostname}:${this.url.port ? parseInt(this.url.port) : 2379}`
        if (this.url.username && this.url.password) {
            options.auth = {
                username: this.url.username,
                password: this.url.password
            }
        }
        this.etcd = new EtcD(options)
        this.lock = this.etcd.lock(`IPC-Mutex-RPM-${this.id}-lock`)
        this.opened = true
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            throw new Error("already acquired")
        const lock = {
            claim: () => {
                return this.lock.acquire().then(() => {
                    this.locked = true
                }).catch(() => {
                    return lock.wait()
                })
            },
            wait: () => {
                return new Promise((resolve /*, reject */) => {
                    setTimeout(() => {
                        resolve(lock.claim())
                    }, this.lockdelay * 1000)
                })
            }
        }
        return lock.claim()
    }

    /*  release mutual exclusion lock  */
    async release () {
        if (!this.opened)
            throw new Error("still not opened")
        if (!this.locked)
            throw new Error("still not acquired")
        return this.lock.release()
            .then(() => { this.locked = false })
            .catch(() => undefined)
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        this.etcd.close()
        this.etcd   = null
        this.lock   = null
        this.opened = false
        this.locked = false
    }
}

