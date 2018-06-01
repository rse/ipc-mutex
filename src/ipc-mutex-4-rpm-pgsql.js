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

import fs   from "fs"
import pg   from "pg"
import UUID from "pure-uuid"

/*  Mutex for Remote-Process-Model (RPM) with PostgreSQL database  */
export default class Mutex {
    constructor (url) {
        /*  initialize state  */
        this.url      = url
        this.db       = null
        this.opened   = false

        /*  derive database and id  */
        if (!this.url.pathname)
            throw new Error("missing pathname in URL")
        let m = this.url.pathname.match(/(?:\/(.+))?\/(.+)$/)
        if (m === null)
            throw new Error("invalid pathname in URL")
        this.database = m[1] ? m[1] : "template1"
        this.id       = m[2]

        /*  generate a id number from the id string as
            PostgreSQL Advisory Locks need a unique number  */
        let uuid = new UUID(5, "ns:URL", this.id)
        let digits = uuid.fold(2)
        this.idNum = 0
        let base = Math.pow(2, 8)
        for (let i = 0; i < digits.length; i++)
            this.idNum = (this.idNum * base) + digits[i]
    }

    /*  open connection  */
    async open () {
        /*  sanity check usage  */
        if (this.opened)
            throw new Error("already opened")

        /*  determine PostgreSQL client connection options  */
        let config = {
            database: this.database,
            host:     this.url.hostname,
            port:     this.url.port ? parseInt(this.url.port) : 5432
        }
        if (this.url.auth) {
            config.user     = this.url.auth.split(":")[0]
            config.password = this.url.auth.split(":")[1]
        }
        if (   this.url.query.tls !== undefined
            || this.url.query.ca  !== undefined
            || this.url.query.key !== undefined
            || this.url.query.crt !== undefined) {
            config.ssl = { rejectUnauthorized: false }
            if (this.url.query.ca !== undefined) {
                config.ssl.ca = fs.readFileSync(this.url.query.ca).toString()
                config.ssl.rejectUnauthorized = true
            }
            if (this.url.query.key !== undefined)
                config.ssl.key = fs.readFileSync(this.url.query.key).toString()
            if (this.url.query.crt !== undefined)
                config.ssl.cert = fs.readFileSync(this.url.query.crt).toString()
        }

        /*  create PostgreSQL client connection  */
        await new Promise((resolve, reject) => {
            this.db = new pg.Client(config)
            this.db.connect((err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
        this.opened = true
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        /*  sanity check usage  */
        if (!this.opened)
            throw new Error("still not opened")

        /*  acquire PostgreSQL advisory lock  */
        await new Promise((resolve, reject) => {
            this.db.query("SELECT pg_advisory_lock($1)", [ this.idNum ], (err, res) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  release mutual exclusion lock  */
    async release () {
        /*  sanity check usage  */
        if (!this.opened)
            throw new Error("still not opened")

        /*  release PostgreSQL advisory lock  */
        await new Promise((resolve, reject) => {
            this.db.query("SELECT pg_advisory_unlock($1)", [ this.idNum ], (err, res) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  close connection  */
    async close () {
        /*  sanity check usage  */
        if (!this.opened)
            throw new Error("still not opened")

        /*  end PostgreSQL client connection  */
        await new Promise((resolve, reject) => {
            this.db.end((err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
        this.db = null
        this.opened = false
    }
}

