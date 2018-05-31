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

import consul from "consul"

/*  Mutex for Remote-Process-Model (RPM) with Consul cluster manager  */
export default class Mutex {
    constructor (url) {
        if (!url.pathname)
            throw new Error("missing pathname in URL")
        this.url        = url
        this.id         = this.url.pathname.replace(/^\/([^/]+).*/, "$1")
        this.consul     = null
        this.session    = null
        this.timer      = null
        this.key        = `IPC-Mutex-RPM/${this.id}/leader`
        this.sessionttl = this.url.query.ttl       ? this.url.query.ttl       : 15
        this.readwait   = this.url.query.readwait  ? this.url.query.readwait  : 30
        this.lockdelay  = this.url.query.lockdelay ? this.url.query.lockdelay : 2
        this.opened     = false
        this.locked     = false
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        let options = {
            host:      this.url.hostname,
            port:      this.url.port ? parseInt(this.url.port) : 8500,
            promisify: true,
            defaults:  {}
        }
        if (this.url.auth)
            options.defaults.token = this.url.auth.split(":")[1]
        this.consul = consul(options)
        let result = await this.consul.session.create({
            name:      `IPC-Mutex-RPM/${this.id}/session`,
            behavior:  "release",
            ttl:       `${this.sessionttl}s`,
            lockDelay: `${this.lockdelay}s`
        })
        this.session = result.ID
        this.timer = setInterval(() => {
            this.consul.session.renew({ id: this.session })
        }, this.sessionttl * 1000 * 0.9)
        this.opened = true
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            throw new Error("already acquired")
        let waitIndex
        const lock = {
            claim: async () => {
                let acquired = await this.consul.kv.set({
                    key:     this.key,
                    value:   "leader",
                    acquire: this.session
                })
                if (!acquired)
                    return lock.wait()
                else {
                    this.locked = true
                    return true
                }
            },
            wait: async () => {
                let result = await this.consul.kv.get({
                    key:   this.key,
                    index: waitIndex,
                    wait:  `${this.readwait}s`
                })
                waitIndex = result.ModifyIndex
                return new Promise((resolve /*, reject */) => {
                    if (!result.Session)
                        setTimeout(() => resolve(lock.claim()), this.lockdelay * 1000)
                    else
                        setTimeout(() => resolve(lock.wait()), 0)
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
        let released = await this.consul.kv.set({
            key:     this.key,
            value:   "leader",
            release: this.session
        })
        if (released)
            this.locked = false
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        if (this.timer !== null) {
            clearTimeout(this.timer)
            this.timer = null
        }
        if (this.session !== null) {
            await this.consul.session.destroy({ id: this.session })
            this.session = null
        }
        this.consul  = null
        this.opened  = false
    }
}

