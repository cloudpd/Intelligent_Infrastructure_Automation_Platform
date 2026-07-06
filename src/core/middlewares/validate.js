// Usage: validate(someJoiSchema) as route middleware
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,      // stop at the first error (set false to collect all)
      stripUnknown: true,    // remove fields not defined in the schema
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    req.body = value; // validated + sanitized data
    next();
  };
}

module.exports = validate;