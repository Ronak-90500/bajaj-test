const submitBtn = document.getElementById("submitBtn");
const nodeInput = document.getElementById("nodeInput");
const resultsSection = document.getElementById("results");

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
}

async function handleSubmit() {
  const raw = nodeInput.value.trim();
  if (!raw) {
    nodeInput.focus();
    return;
  }

  setLoading(true);
  resultsSection.classList.remove("hidden");
  resultsSection.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  try {
    const data = await submitNodes(raw);
    renderResponse(data, resultsSection);
  } catch (err) {
    renderError(err.message, resultsSection);
  } finally {
    setLoading(false);
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

submitBtn.addEventListener("click", handleSubmit);

nodeInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") handleSubmit();
});
