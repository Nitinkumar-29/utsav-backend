const jwt = require("jsonwebtoken")
const JWT_SECRET = "utsav-application@2905"

const fetchUser = (req, res, next) => {
    // get the user details from the token and id to the request
    const token = req.header("auth-token")
    if (!token) {
        return res.status(401).send({ error: "Please use correct credentials" })
    }
    try {
        const data = jwt.verify(token, JWT_SECRET)
        req.user = data.user
        next()
    } catch (error) {
        return res.status(401).send({ error: error.message })
    }
}

module.exports = fetchUser