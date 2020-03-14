const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { User } = require('../db');
const ServerError = require('../utils/ServerError');

const verifyJwt = promisify(jwt.verify);

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;
    // check header for verification token
    if (authHeader && authHeader.startsWith('Bearer')) token = authHeader.split(' ')[1];

    if (!token) throw new ServerError('Invalid Credentials', 401);
    // validate authentication token
    const decode = await verifyJwt(token, process.env.JWT_KEY);

    // check if user still exists
    const user = await User.findByPk(decode.sub);

    if (!user) throw new ServerError('Invalid Credentials', 401);

    // check if token was generated for the user last version
    if (user.authUserChanged(decode.iat)) throw new ServerError('Invalid Credentials', 401);

    // grant access to protected route
    req.user = user;
    next();
  } catch (ex) {
    next(ex);
  }
};
