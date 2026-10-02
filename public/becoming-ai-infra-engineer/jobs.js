(function () {
  var table = document.getElementById("job-table");
  var meta = document.getElementById("job-meta");
  var input = document.getElementById("job-search");
  var jobs = [];
  var updated = "";

  function clearRows() {
    table.querySelectorAll(".job-row:not(.job-head), .job-empty").forEach(function (node) {
      node.remove();
    });
  }

  function render(list) {
    clearRows();
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "job-empty";
      empty.textContent = jobs.length
        ? "No roles match that search."
        : "No open roles right now.";
      table.appendChild(empty);
      return;
    }
    list.forEach(function (job) {
      var row = document.createElement("a");
      row.className = "job-row";
      row.href = job.url;
      row.target = "_blank";
      row.rel = "noopener noreferrer";
      var title = document.createElement("strong");
      title.textContent = job.title;
      var company = document.createElement("span");
      company.textContent = job.company;
      var location = document.createElement("span");
      location.textContent = job.location || "Location not listed";
      var source = document.createElement("span");
      source.textContent = job.source;
      row.append(title, company, location, source);
      table.appendChild(row);
    });
  }

  function status(shown) {
    var count = jobs.length === 1 ? "1 role" : jobs.length + " roles";
    if (input.value.trim()) {
      meta.textContent = shown + " of " + count;
      return;
    }
    meta.textContent = updated ? count + " · Updated " + updated : count;
  }

  function applyFilter() {
    var query = input.value.trim().toLowerCase();
    var list = jobs.filter(function (job) {
      if (!query) {
        return true;
      }
      var haystack = [job.title, job.company, job.location, job.source].join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    });
    render(list);
    status(list.length);
  }

  input.addEventListener("input", applyFilter);

  fetch("data/jobs.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("missing");
      }
      return response.json();
    })
    .then(function (data) {
      jobs = data.jobs || [];
      if (data.updated_at) {
        updated = new Date(data.updated_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      applyFilter();
    })
    .catch(function () {
      meta.textContent = "Jobs could not be loaded.";
      clearRows();
    });
})();
