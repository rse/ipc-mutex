/*
**  IPC-Mutex -- Inter-Process-Communication Mutual Exclusion Lock
**  Copyright (c) 2018-2019 Dr. Ralf S. Engelschall <rse@engelschall.com>
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

import { Lock } from "lock"

/*  Mutex for Single-Process-Model (SPM)  */
export default class Mutex {
    constructor (url) {
        if (!url.pathname)
            throw new Error("no mutex id given")
        if (!url.pathname.match(/^[a-zA-Z][a-zA-Z0-9-]*$/))
            throw new Error("invalid mutex id given")
        this.url    = url
        this.id     = this.url.pathname
        this.lock   = Lock()
        this.locked = false
        this.unlock = null
        this.opened = false
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        this.opened = true
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        return new Promise((resolve /*, reject */) => {
            this.lock(`IPC-Mutex-spm:${this.id}`, (release) => {
                this.locked = true
                this.unlock = release
                resolve()
            })
        })
    }

    /*  release mutual exclusion lock  */
    async release () {
        if (!this.locked)
            throw new Error("still not acquired")
        return new Promise((resolve, reject) => {
            this.unlock((err) => {
                if (err)
                    reject(err)
                else {
                    this.unlock = null
                    this.locked = false
                    resolve()
                }
            })()
        })
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        this.opened = false
    }
}

