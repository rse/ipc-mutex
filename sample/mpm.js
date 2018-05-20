
/* eslint no-console: off */

const suite   = require("./suite")
const cluster = require("cluster")

;(async () => {
    if (cluster.isMaster) {
        for (let i = 0; i < 2; i++)
            cluster.fork()
        cluster.on("exit", (worker, code, signal) => {
            console.log(`DIED ${worker.process.pid}`)
        })
    }
    setTimeout(async () => {
        await suite(`mpm:foo:${process.pid}`)
        if (!cluster.isMaster)
            process.exit(0)
    }, cluster.isMaster ? 1000 : 3000)
})()

