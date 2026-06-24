const identity = require("../config/identity");
const { processEntries } = require("../services/validationService");
const { buildHierarchies, buildSummary } = require("../services/graphService");

function postBfhl(req, res) {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({
      error: 'Request body must contain a "data" array.',
    });
  }

  const { invalidEntries, duplicateEdges, validEdges } = processEntries(data);
  const hierarchies = buildHierarchies(validEdges);
  const summary = buildSummary(hierarchies);

  return res.status(200).json({
    user_id: identity.user_id,
    email_id: identity.email_id,
    college_roll_number: identity.college_roll_number,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  });
}

module.exports = { postBfhl };
