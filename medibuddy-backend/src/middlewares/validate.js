
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  } catch (err) {
    next({
      statusCode: 400,
      message: err.errors?.[0]?.message || "Validation Error",
    });
  }
};
