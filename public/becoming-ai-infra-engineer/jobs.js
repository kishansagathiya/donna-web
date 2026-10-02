(function () {
  var FREE_LIMIT = 20;
  var COURSE = "becoming-ai-infra-engineer";
  var LOGIN_NEXT = "/becoming-ai-infra-engineer/#jobs";
  var SUPABASE_URL = "https://eghhxjlhautsikejocze.supabase.co";
  var SUPABASE_KEY = "sb_publishable_sFpDOcCxs9aKq283JIQPBg_eZRIpUTB";
  var STORAGE_KEY = "sb-eghhxjlhautsikejocze-auth-token";

  var table = document.getElementById("job-table");
  var meta = document.getElementById("job-meta");
  var input = document.getElementById("job-search");
  var jobs = [];
  var updated = "";
  var unlocked = false;
  var jobsLoaded = false;

  function loginHref() {
    return "/login?next=" + encodeURIComponent(LOGIN_NEXT);
  }

  function clearRows() {
    table.querySelectorAll(".job-row:not(.job-head), .job-empty, .job-gate").forEach(function (node) {
      node.remove();
    });
  }

  function renderGate(hiddenCount) {
    var gate = document.createElement("div");
    gate.className = "job-gate";
    var copy = document.createElement("p");
    copy.textContent = hiddenCount === 1
      ? "Sign in to see 1 more role."
      : "Sign in to see " + hiddenCount + " more roles.";
    var link = document.createElement("a");
    link.className = "btn btn-primary";
    link.href = loginHref();
    link.textContent = "Sign in with Donna";
    gate.append(copy, link);
    table.appendChild(gate);
  }

  function render(list) {
    clearRows();
    var visible = list;
    var hidden = 0;
    if (!unlocked && list.length > FREE_LIMIT) {
      hidden = list.length - FREE_LIMIT;
      visible = list.slice(0, FREE_LIMIT);
    }
    if (!visible.length) {
      var empty = document.createElement("p");
      empty.className = "job-empty";
      empty.textContent = jobs.length
        ? "No roles match that search."
        : "No open roles right now.";
      table.appendChild(empty);
      return;
    }
    visible.forEach(function (job) {
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
    if (hidden) renderGate(hidden);
  }

  function status(shown) {
    var count = jobs.length === 1 ? "1 role" : jobs.length + " roles";
    var searching = input.value.trim();
    if (!unlocked && shown > FREE_LIMIT) {
      var matched = searching ? shown + " matches" : count;
      meta.textContent = FREE_LIMIT + " of " + matched + " · Sign in to see the rest";
      return;
    }
    if (searching) {
      meta.textContent = shown + " of " + count;
      return;
    }
    meta.textContent = updated ? count + " · Updated " + updated : count;
  }

  function applyFilter() {
    var query = input.value.trim().toLowerCase();
    var list = jobs.filter(function (job) {
      if (!query) return true;
      var haystack = [job.title, job.company, job.location, job.source].join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    });
    render(list);
    status(list.length);
  }

  function readStoredSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var session = parsed && parsed.access_token ? parsed : parsed && parsed.currentSession;
      if (!session || !session.access_token || !session.refresh_token) return null;
      return session;
    } catch (e) {
      return null;
    }
  }

  function writeStoredSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function tokenPayload(token) {
    try {
      var part = token.split(".")[1];
      if (!part) return null;
      var padded = part.replace(/-/g, "+").replace(/_/g, "/");
      while (padded.length % 4) padded += "=";
      return JSON.parse(atob(padded));
    } catch (e) {
      return null;
    }
  }

  function tokenFresh(token) {
    var payload = tokenPayload(token);
    if (!payload || !payload.sub || !payload.exp) return false;
    return payload.exp * 1000 > Date.now() + 15000;
  }

  function refreshSession(session) {
    return fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then(function (response) {
      if (!response.ok) throw new Error("refresh");
      return response.json();
    }).then(function (next) {
      if (!next || !next.access_token || !next.refresh_token) throw new Error("refresh");
      writeStoredSession(next);
      return next;
    });
  }

  function confirmUser(token) {
    return fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + token,
      },
    }).then(function (response) {
      if (!response.ok) throw new Error("user");
      return response.json();
    }).then(function (user) {
      if (!user || !user.id) throw new Error("user");
      return user;
    });
  }

  function recordSignin(token, userId) {
    return fetch(SUPABASE_URL + "/rest/v1/course_signins?on_conflict=user_id,course", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        course: COURSE,
      }),
    }).then(function (response) {
      if (!response.ok) throw new Error("record");
    });
  }

  function resolveSession() {
    var session = readStoredSession();
    if (!session) return Promise.resolve(null);
    var ready = tokenFresh(session.access_token)
      ? Promise.resolve(session)
      : refreshSession(session);
    return ready.then(function (current) {
      return confirmUser(current.access_token).then(function (user) {
        return { token: current.access_token, userId: user.id };
      });
    }).catch(function () {
      return null;
    });
  }

  input.addEventListener("input", applyFilter);

  var jobsReady = fetch("data/jobs.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error("missing");
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
      jobsLoaded = true;
    });

  var sessionReady = resolveSession().then(function (auth) {
    unlocked = !!auth;
    if (auth) {
      recordSignin(auth.token, auth.userId).catch(function () {});
    }
  });

  Promise.all([jobsReady, sessionReady])
    .then(function () {
      if (!jobsLoaded) return;
      applyFilter();
    })
    .catch(function () {
      meta.textContent = "Jobs could not be loaded.";
      clearRows();
    });
})();
