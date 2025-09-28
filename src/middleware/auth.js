const jwt = require('jsonwebtoken');
module.exports = (req,res,next)=>{
  const bearer = req.headers.authorization?.split(' ')[1];
  const token = req.cookies?.token || bearer;
  if(!token) return res.status(401).json({message:'Unauthenticated'});
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({message:'Invalid token'}); }
};
