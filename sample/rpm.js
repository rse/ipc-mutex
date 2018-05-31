
const suite = require("./suite")

;(async () => {
    for (let i = 0; i < 10; i++)
        suite("rpm+redis://x:local-secret@127.0.0.1:6379/test", i)
        //suite("rpm+pgsql://postgresql:postgresql@127.0.0.1:5432/template1/foo", i)
        //suite("rpm+consul://127.0.0.1:8500/test", i)
})().catch((err) => {
    console.log(`ERROR: ${err}`)
})

