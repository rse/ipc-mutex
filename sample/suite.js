
/* eslint no-console: off */

const expect = require("chai").expect
const Mutex = require("..")

module.exports = (url, id = 0) => {
    let delay = Math.trunc(Math.random() * 1 * 10)
    setTimeout(async () => {
        /*  open connection  */
        console.log(`++ START ${id}: ${url}`)
        let mutex = new Mutex(url)
        await mutex.open()

        for (let i = 0; i < 10; i++) {
            await mutex.acquire()
            // console.log(`++ ACQUIRED ${id} (#${i})`)
            await new Promise((resolve, reject) => {
                let delay = Math.trunc(Math.random() * 1 * 10)
                console.log(`++ WORK ${id} (#${i}): ${delay}ms`)
                setTimeout(() => {
                    resolve()
                }, delay)
            })
            // console.log(`++ RELEASE ${id} (#${i})`)
            await mutex.release()
            await new Promise((resolve) => {
                let delay = Math.trunc(Math.random() * 1 * 500)
                setTimeout(resolve, delay)
            })
        }

        /*  close connection  */
        await mutex.close()
        console.log(`++ END ${id}`)
    }, delay)
}

