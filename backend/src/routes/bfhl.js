const express = require("express");
const router = express.Router();
const { postBfhl } = require("../controllers/bfhlController");

router.post("/", postBfhl);

module.exports = router;
