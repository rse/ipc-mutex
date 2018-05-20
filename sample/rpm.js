
const suite = require("./suite")

;(async () => {
    await suite("rpm+redis://x:local-secret@127.0.0.1:6379/test")
})().catch((err) => {
    console.log(`ERROR: ${err}`)
})

