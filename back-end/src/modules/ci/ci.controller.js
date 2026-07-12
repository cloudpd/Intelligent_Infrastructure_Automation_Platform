const ciService = require('./ci.service');

async function pushToGithub(req, res, next) {
  try {
    const { serviceId } = req.body;
    const result = await ciService.pushFile(req.user.id, serviceId);
    res.status(200).json({ success: true, result });
  } catch (err) {
    next(err);
  }
}

module.exports = { pushToGithub };  
