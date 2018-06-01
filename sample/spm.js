
const Suite = require("./suite")

;(async () => {
    let suite = new Suite("spm:foo")
    await suite.open()
    await suite.work()
    await suite.close()
})()

