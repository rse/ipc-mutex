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

import URL             from "url"

import MutexSPM        from "./ipc-mutex-1-spm"
import MutexMPM        from "./ipc-mutex-2-mpm"
import MutexRPMredis   from "./ipc-mutex-3-rpm-redis"
import MutexRPMpgsql   from "./ipc-mutex-4-rpm-pgsql"
import MutexRPMconsul  from "./ipc-mutex-5-rpm-consul"

/*  Mutex API  */
class Mutex {
    constructor (url) {
        let m
        let urlParsed = URL.parse(url, true)
        if (urlParsed.protocol === "spm:")
            this.strategy = new MutexSPM(urlParsed)
        else if (urlParsed.protocol === "mpm:")
            this.strategy = new MutexMPM(urlParsed)
        else if (typeof urlParsed.protocol === "string" && (m = urlParsed.protocol.match(/^rpm(?:\+([a-z]+))?:$/)) !== null) {
            if      (m[1] === "redis")  this.strategy = new MutexRPMredis(urlParsed)
            else if (m[1] === "pgsql")  this.strategy = new MutexRPMpgsql(urlParsed)
            else if (m[1] === "consul") this.strategy = new MutexRPMconsul(urlParsed)
            else
                throw new Error(`unknown implementation strategy "${url}"`)
        }
        else
            throw new Error(`unknown implementation strategy "${url}"`)
    }
    open      (...args) { return this.strategy.open(...args) }
    acquire   (...args) { return this.strategy.acquire(...args) }
    release   (...args) { return this.strategy.release(...args) }
    close     (...args) { return this.strategy.close(...args) }
}

module.exports = Mutex

