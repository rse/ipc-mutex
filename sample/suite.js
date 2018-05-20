
/* eslint no-console: off */

const expect = require("chai").expect
const Mutex = require("..")

module.exports = async function (url, id = 0) {
    /*  open connection  */
    console.log(`++ START: ${id}: ${url}`)
    let mutex = new Mutex(url)
    await mutex.open()

    await mutex.acquire()
    console.log(`++ PROCESS: ${id}: ${url}`)
    await mutex.release()

    /*  close connection  */
    await mutex.close()
    console.log(`++ END: ${id}: ${url}`)
}

