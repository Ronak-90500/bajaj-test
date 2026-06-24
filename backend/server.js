const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`BFHL API running → http://localhost:${PORT}`);
});
