
/* eslint no-console: off */

const Suite   = require("./suite")
const cluster = require("cluster")

;(async () => {
    let workers = 10
    if (cluster.isMaster) {
        for (let i = 0; i < workers; i++)
            setTimeout(() => cluster.fork(), 0)
        cluster.on("exit", (worker, code, signal) => {
            workers--
        })
    }
    let suite = new Suite("rpm+pgsql://postgresql:postgresql@127.0.0.1:5432/template1/foo",
        cluster.isMaster ? "MASTER" : `WORKER-${process.pid}`)
    await suite.open()
    await suite.work()
    if (cluster.isMaster) {
        let timer = setInterval(async () => {
            if (workers === 0) {
                clearTimeout(timer)
                await suite.close()
                process.exit(0)
            }
        }, 100)
    }
    else {
        await suite.close()
        process.exit(0)
    }
})()

