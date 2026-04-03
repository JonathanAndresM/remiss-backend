import bcryptjs from "bcryptjs"

export default async (req, res, next) => {
    let password = req.body.password
    let passwordHash = bcryptjs.hashSync(password, 10)
    req.body.password = passwordHash
    next()
}