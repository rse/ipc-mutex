
/* eslint no-console: off */

const expect = require("chai").expect
const Mutex = require("..")

module.exports = class Suite {
    constructor (url, pid = process.pid) {
        this.url = url
        this.pid = pid
    }
    async open () {
        console.log(`++ OPEN pid=${this.pid} url=${this.url}`)
        this.mutex = new Mutex(this.url)
        await this.mutex.open()
    }
    async work (workers = 10, tasks = 10) {
        let promises = []
        for (let i = 0; i < workers; i++) {
            promises.push(new Promise((resolve, reject) => {
                let delay = Math.trunc(Math.random() * 50)
                setTimeout(async () => {
                    for (let j = 0; j < tasks; j++) {
                        await this.mutex.acquire()
                        await new Promise((resolve, reject) => {
                            let delay = Math.trunc(Math.random() * 50)
                            console.log(`++ WORK pid=${this.pid} worker=${i} task=${j} duration=${delay}ms`)
                            setTimeout(resolve, delay)
                        })
                        await this.mutex.release()
                        await new Promise((resolve, reject) => {
                            let delay = Math.trunc(Math.random() * 50)
                            setTimeout(resolve, delay)
                        })
                    }
                    resolve()
                }, delay)
            }))
        }
        await Promise.all(promises)
    }
    async close () {
        console.log(`++ CLOSE pid=${this.pid}`)
        await this.mutex.close()
    }
}

