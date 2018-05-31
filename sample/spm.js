
const suite = require("./suite")

;(async () => {
    for (let i = 0; i < 10; i++)
        suite("spm:foo", i)
})()

