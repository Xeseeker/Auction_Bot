import mongoose from 'mongoose';

export const validateObjectIdParam = (paramName) => (req, res, next) => {
  const value = req.params?.[paramName];

  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ error: `Invalid ${paramName}.` });
  }

  return next();
};
