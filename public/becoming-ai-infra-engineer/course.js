(function () {
  var main = document.getElementById("main");
  var course = null;
  var topicById = {};
  var topicOrder = [];
  var checkpointById = {};
  var KEY = "ai-infra-course-progress";
  var OPEN_CHAPTERS = 2;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function loadProgress() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      saved.articles = saved.articles || {};
      saved.problems = saved.problems || {};
      return saved;
    } catch (err) {
      return { articles: {}, problems: {} };
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(KEY, JSON.stringify(progress));
  }

  function articleKey(topicId, articleId) {
    return topicId + ":" + articleId;
  }

  function problemKey(topicId, problemId) {
    return topicId + ":" + problemId;
  }

  function markArticle(topicId, articleId) {
    var progress = loadProgress();
    progress.articles[articleKey(topicId, articleId)] = true;
    saveProgress(progress);
  }

  function markProblem(topicId, problemId) {
    var progress = loadProgress();
    progress.problems[problemKey(topicId, problemId)] = true;
    saveProgress(progress);
  }

  function isArticleDone(topicId, articleId) {
    return !!loadProgress().articles[articleKey(topicId, articleId)];
  }

  function isProblemDone(topicId, problemId) {
    return !!loadProgress().problems[problemKey(topicId, problemId)];
  }

  function topicArticleCount(topic) {
    return topic.articles.filter(function (article) {
      return isArticleDone(topic.id, article.id);
    }).length;
  }

  function indexCourse() {
    topicById = {};
    topicOrder = [];
    checkpointById = {};
    course.levels.forEach(function (level) {
      level.topics.forEach(function (topic) {
        topic.level = level;
        topicById[topic.id] = topic;
        topicOrder.push(topic);
      });
    });
    course.checkpoints.forEach(function (checkpoint) {
      checkpointById[checkpoint.id] = checkpoint;
    });
  }

  function stars(count) {
    var html = "";
    for (var i = 1; i <= 3; i += 1) {
      html += '<span class="' + (i <= count ? "on" : "") + '" aria-hidden="true">★</span>';
    }
    return '<span class="stars" aria-label="Difficulty ' + count + ' of 3">' + html + "</span>";
  }

  function playIcon() {
    return '<span class="play" aria-hidden="true"><svg viewBox="0 0 12 14" fill="currentColor"><path d="M1 1.2v11.6L11 7 1 1.2z"/></svg></span>';
  }

  function lockIcon() {
    return '<svg class="lock-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  function isOpenLevel(level) {
    return !!level && course.levels.indexOf(level) < OPEN_CHAPTERS;
  }

  function mark(done) {
    return '<span class="mark' + (done ? " done" : "") + '" aria-hidden="true"></span>';
  }

  function neighbor(topic, step) {
    var index = topicOrder.indexOf(topic);
    return topicOrder[index + step] || null;
  }

  function pager(prev, next) {
    return (
      '<nav class="pager" aria-label="Nearby">' +
      (prev ? '<a href="' + prev.href + '">← ' + esc(prev.label) + "</a>" : "<span></span>") +
      (next ? '<a href="' + next.href + '">' + esc(next.label) + " →</a>" : "<span></span>") +
      "</nav>"
    );
  }

  function sidebar(activeHref) {
    var html = '<aside class="side" id="contents"><p class="side-label">Contents</p>';
    course.levels.forEach(function (level) {
      if (!isOpenLevel(level)) {
        html += '<p class="side-level">Chapter ' + esc(level.id) + "</p>";
        html += '<p class="side-locked">' + lockIcon() + "<span>Locked</span></p>";
        return;
      }
      html += '<p class="side-level">Chapter ' + esc(level.id) + " · " + esc(level.title) + "</p>";
      level.topics.forEach(function (topic) {
        var href = "#/t/" + topic.id;
        var count = topicArticleCount(topic) + "/4";
        html +=
          '<a class="' + (href === activeHref ? "active" : "") + '" href="' + href + '">' +
          '<span class="side-count">' + count + "</span>" +
          "<span>" + esc(topic.title) + "</span></a>";
      });
      var checkpoint = checkpointById[level.id];
      if (checkpoint) {
        var checkHref = "#/c/" + checkpoint.id;
        html +=
          '<a class="side-check ' + (checkHref === activeHref ? "active" : "") + '" href="' + checkHref + '">' +
          '<span class="side-count"></span><span>Checkpoint</span></a>';
      }
    });
    html += "</aside>";
    return html;
  }

  function learnHead(kicker, title, actions) {
    return (
      '<header class="learn-head"><div><p class="learn-kicker">' + esc(kicker) + "</p><h1>" +
      esc(title) + "</h1></div><div class=\"learn-actions\">" + actions + "</div></header>"
    );
  }

  function shell(activeHref, head, body, foot) {
    main.innerHTML =
      '<div class="learn">' + sidebar(activeHref) +
      '<div class="learn-main"><div class="contents-bar"><button type="button" class="contents-btn btn btn-secondary" id="contents-btn">Contents</button></div>' +
      head + body + (foot || "") + "</div></div>";
    var button = document.getElementById("contents-btn");
    var aside = document.getElementById("contents");
    if (button && aside) {
      button.addEventListener("click", function () {
        aside.classList.toggle("open");
      });
    }
  }

  function renderTrack() {
    var html = '<div class="track-page"><div class="track-intro"><p class="eyebrow">Course</p>';
    html += "<h1>AI Infrastructure</h1>";
    html += "<p>" + course.levels.length + " chapters. The first two are open. Each open lesson works the mechanism, the arithmetic, and the failure. Then the problems.</p></div>";
    html += '<div class="track"><div class="track-line" aria-hidden="true"></div>';
    course.levels.forEach(function (level) {
      if (!isOpenLevel(level)) {
        html += '<section class="level-block locked" aria-label="Chapter ' + esc(level.id) + ', locked">';
        html += '<p class="level-pill">Chapter ' + esc(level.id) + "</p>";
        html += '<div class="locked-plate">' + lockIcon() + "<span>Locked</span></div></section>";
        return;
      }
      html += '<section class="level-block" aria-label="Chapter ' + esc(level.id) + '">';
      html += '<p class="level-pill">Chapter ' + esc(level.id) + "</p>";
      html += '<h2 class="level-name">' + esc(level.title) + "</h2>";
      html += '<div class="topic-pair">';
      level.topics.forEach(function (topic) {
        html += '<a class="topic-card" href="#/t/' + topic.id + '">';
        html += '<div class="topic-card-top">' + esc(topic.title) + "</div>";
        html += '<div class="topic-card-body">';
        html += '<span class="topic-stat"><strong>' + topic.articles.length + "</strong>Articles</span>";
        html += '<span class="topic-stat"><strong>' + topic.problems.length + "</strong>Problems</span>";
        html += stars(level.stars);
        html += "</div>" + playIcon() + "</a>";
      });
      html += "</div></section>";
      var checkpoint = checkpointById[level.id];
      if (checkpoint) {
        var done = checkpoint.problems.every(function (problem) {
          return isProblemDone("c" + checkpoint.id, problem.id);
        });
        html += '<a class="check-node' + (done ? " done" : "") + '" href="#/c/' + checkpoint.id + '">';
        html += "<strong>Checkpoint</strong><small>" + checkpoint.problems.length + " problems</small></a>";
      }
    });
    html += "</div></div>";
    main.innerHTML = html;
  }

  function renderTopic(topicId) {
    var topic = topicById[topicId];
    if (!topic) return renderMissing();
    if (!isOpenLevel(topic.level)) return renderLocked();
    var rows = topic.articles.map(function (article) {
      var done = isArticleDone(topic.id, article.id);
      return (
        '<a class="row" href="#/t/' + topic.id + "/a/" + article.id + '">' +
        mark(done) + '<span class="row-title">' + esc(article.title) + "</span>" +
        '<span class="row-meta">' + article.minutes + " min</span></a>"
      );
    }).join("");
    var prev = neighbor(topic, -1);
    var next = neighbor(topic, 1);
    if (prev && !isOpenLevel(prev.level)) prev = null;
    if (next && !isOpenLevel(next.level)) next = null;
    shell(
      "#/t/" + topic.id,
      learnHead(
        "Chapter " + topic.level.id + " · " + topic.level.title,
        topic.title,
        '<a class="btn btn-primary" href="#/t/' + topic.id + '/problems">Go to Problems</a>'
      ),
      '<div class="stack"><section class="group-card"><div class="group-head"><span>Articles</span><span>' +
      topicArticleCount(topic) + " / " + topic.articles.length + "</span></div>" + rows + "</section></div>",
      pager(
        prev && { href: "#/t/" + prev.id, label: prev.title },
        next && { href: "#/t/" + next.id, label: next.title }
      )
    );
  }

  function renderArticle(topicId, articleId) {
    var topic = topicById[topicId];
    if (!topic) return renderMissing();
    if (!isOpenLevel(topic.level)) return renderLocked();
    var index = topic.articles.findIndex(function (article) { return article.id === articleId; });
    var article = topic.articles[index];
    if (!article) return renderMissing();
    markArticle(topic.id, article.id);
    var prev = topic.articles[index - 1];
    var next = topic.articles[index + 1];
    shell(
      "#/t/" + topic.id,
      learnHead(
        topic.title,
        article.title,
        '<a class="btn btn-secondary" href="#/t/' + topic.id + '">All articles</a>' +
        '<a class="btn btn-primary" href="#/t/' + topic.id + '/problems">Go to Problems</a>'
      ),
      '<article class="reader"><p class="row-meta">' + article.minutes + ' min read</p>' +
      '<div class="prose">' + article.html + "</div></article>",
      pager(
        prev && { href: "#/t/" + topic.id + "/a/" + prev.id, label: prev.title },
        next && { href: "#/t/" + topic.id + "/a/" + next.id, label: next.title }
      )
    );
  }

  function problemRows(topicId, problems) {
    return problems.map(function (problem) {
      return (
        '<a class="row" href="#/t/' + topicId + "/p/" + problem.id + '">' +
        mark(isProblemDone(topicId, problem.id)) +
        '<span class="row-title">' + esc(problem.title) + "</span>" +
        '<span class="row-meta">' + problem.minutes + " min</span>" +
        '<span class="row-points">' + problem.points + " pts</span></a>"
      );
    }).join("");
  }

  function group(title, done, total, rows) {
    return (
      '<section class="group-card"><div class="group-head"><span>' + esc(title) + "</span><span>" +
      done + " / " + total + "</span></div>" + rows + "</section>"
    );
  }

  function renderProblems(topicId) {
    var topic = topicById[topicId];
    if (!topic) return renderMissing();
    if (!isOpenLevel(topic.level)) return renderLocked();
    var buckets = [
      ["Easy", "easy"],
      ["Medium", "medium"],
      ["Hard", "hard"]
    ];
    var cards = buckets.map(function (bucket) {
      var problems = topic.problems.filter(function (problem) { return problem.difficulty === bucket[1]; });
      var done = problems.filter(function (problem) { return isProblemDone(topic.id, problem.id); }).length;
      return group(bucket[0], done, problems.length, problemRows(topic.id, problems));
    }).join("");
    var bonusDone = isProblemDone(topic.id, "bonus") ? 1 : 0;
    cards += group(
      "Bonus",
      bonusDone,
      1,
      '<a class="row" href="#/t/' + topic.id + '/bonus">' + mark(bonusDone === 1) +
      '<span class="row-title">' + esc(topic.bonus.title) + "</span>" +
      '<span class="row-meta">' + topic.bonus.minutes + " min</span>" +
      '<span class="row-points">' + topic.bonus.points + " pts</span></a>"
    );
    shell(
      "#/t/" + topic.id,
      learnHead(
        "Chapter " + topic.level.id + " · Problems",
        topic.title,
        '<a class="btn btn-secondary" href="#/t/' + topic.id + '">Read articles</a>'
      ),
      '<div class="stack">' + cards + "</div>"
    );
  }

  function renderPrompt(options) {
    var shown = options.done;
    shell(
      options.active,
      learnHead(options.kicker, options.title, options.actions),
      '<article class="prompt"><p class="row-meta">' + options.minutes + " min · " + options.points + " pts · " +
      esc(options.difficulty) + "</p>" + options.promptHtml +
      '<button type="button" class="btn btn-primary" id="show-answer"' + (shown ? " hidden" : "") + ">Show answer</button>" +
      '<div class="answer"' + (shown ? "" : " hidden") + '><p><strong>A complete answer includes:</strong> ' +
      esc(options.answer) + "</p></div></article>",
      options.foot || ""
    );
    var button = document.getElementById("show-answer");
    if (button) {
      button.addEventListener("click", function () {
        options.onShow();
        button.hidden = true;
        main.querySelector(".answer").hidden = false;
      });
    }
  }

  function renderProblem(topicId, problemId) {
    var topic = topicById[topicId];
    if (!topic) return renderMissing();
    if (!isOpenLevel(topic.level)) return renderLocked();
    var index = topic.problems.findIndex(function (problem) { return problem.id === problemId; });
    var problem = topic.problems[index];
    if (!problem) return renderMissing();
    var prev = topic.problems[index - 1];
    var next = topic.problems[index + 1];
    renderPrompt({
      active: "#/t/" + topic.id,
      kicker: topic.title,
      title: problem.title,
      actions: '<a class="btn btn-secondary" href="#/t/' + topic.id + '/problems">All problems</a>',
      minutes: problem.minutes,
      points: problem.points,
      difficulty: problem.difficulty,
      promptHtml: problem.promptHtml,
      answer: problem.answer,
      done: isProblemDone(topic.id, problem.id),
      onShow: function () { markProblem(topic.id, problem.id); },
      foot: pager(
        prev && { href: "#/t/" + topic.id + "/p/" + prev.id, label: prev.title },
        next && { href: "#/t/" + topic.id + "/p/" + next.id, label: next.title }
      )
    });
  }

  function renderBonus(topicId) {
    var topic = topicById[topicId];
    if (!topic) return renderMissing();
    if (!isOpenLevel(topic.level)) return renderLocked();
    renderPrompt({
      active: "#/t/" + topic.id,
      kicker: topic.title + " · Bonus",
      title: topic.bonus.title,
      actions: '<a class="btn btn-secondary" href="#/t/' + topic.id + '/problems">All problems</a>',
      minutes: topic.bonus.minutes,
      points: topic.bonus.points,
      difficulty: "bonus",
      promptHtml: topic.bonus.promptHtml,
      answer: topic.bonus.answer,
      done: isProblemDone(topic.id, "bonus"),
      onShow: function () { markProblem(topic.id, "bonus"); }
    });
  }

  function renderCheckpoint(checkpointId) {
    var checkpoint = checkpointById[checkpointId];
    if (!checkpoint) return renderMissing();
    var level = course.levels.find(function (item) { return item.id === checkpoint.id; });
    if (!isOpenLevel(level)) return renderLocked();
    var key = "c" + checkpoint.id;
    var rows = checkpoint.problems.map(function (problem) {
      return (
        '<a class="row" href="#/c/' + checkpoint.id + "/p/" + problem.id + '">' +
        mark(isProblemDone(key, problem.id)) +
        '<span class="row-title">' + esc(problem.title) + "</span>" +
        '<span class="row-meta">' + problem.minutes + " min</span>" +
        '<span class="row-points">' + problem.points + " pts</span></a>"
      );
    }).join("");
    var done = checkpoint.problems.filter(function (problem) {
      return isProblemDone(key, problem.id);
    }).length;
    shell(
      "#/c/" + checkpoint.id,
      learnHead("After chapter " + checkpoint.id, checkpoint.title, '<a class="btn btn-secondary" href="course.html#/">Back to path</a>'),
      '<div class="stack">' + group(level ? level.title : "Checkpoint", done, checkpoint.problems.length, rows) + "</div>"
    );
  }

  function renderCheckpointProblem(checkpointId, problemId) {
    var checkpoint = checkpointById[checkpointId];
    if (!checkpoint) return renderMissing();
    var level = course.levels.find(function (item) { return item.id === checkpoint.id; });
    if (!isOpenLevel(level)) return renderLocked();
    var index = checkpoint.problems.findIndex(function (problem) { return problem.id === problemId; });
    var problem = checkpoint.problems[index];
    if (!problem) return renderMissing();
    var key = "c" + checkpoint.id;
    var prev = checkpoint.problems[index - 1];
    var next = checkpoint.problems[index + 1];
    renderPrompt({
      active: "#/c/" + checkpoint.id,
      kicker: checkpoint.title,
      title: problem.title,
      actions: '<a class="btn btn-secondary" href="#/c/' + checkpoint.id + '">All checkpoint problems</a>',
      minutes: problem.minutes,
      points: problem.points,
      difficulty: problem.difficulty,
      promptHtml: problem.promptHtml,
      answer: problem.answer,
      done: isProblemDone(key, problem.id),
      onShow: function () { markProblem(key, problem.id); },
      foot: pager(
        prev && { href: "#/c/" + checkpoint.id + "/p/" + prev.id, label: prev.title },
        next && { href: "#/c/" + checkpoint.id + "/p/" + next.id, label: next.title }
      )
    });
  }

  function renderMissing() {
    main.innerHTML = '<div class="missing"><h1>That page is not in the course.</h1><p><a href="#/">Back to the path</a></p></div>';
  }

  function renderLocked() {
    main.innerHTML = '<div class="missing"><h1>This chapter is locked.</h1><p><a href="#/">Back to the path</a></p></div>';
  }

  function render() {
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!parts.length) return renderTrack();
    if (parts[0] === "t" && parts[1] && parts.length === 2) return renderTopic(parts[1]);
    if (parts[0] === "t" && parts[2] === "a" && parts[3]) return renderArticle(parts[1], parts[3]);
    if (parts[0] === "t" && parts[2] === "problems") return renderProblems(parts[1]);
    if (parts[0] === "t" && parts[2] === "p" && parts[3]) return renderProblem(parts[1], parts[3]);
    if (parts[0] === "t" && parts[2] === "bonus") return renderBonus(parts[1]);
    if (parts[0] === "c" && parts[1] && parts.length === 2) return renderCheckpoint(parts[1]);
    if (parts[0] === "c" && parts[2] === "p" && parts[3]) return renderCheckpointProblem(parts[1], parts[3]);
    renderMissing();
  }

  fetch("data/course.json")
    .then(function (response) {
      if (!response.ok) throw new Error("Course data did not load");
      return response.json();
    })
    .then(function (data) {
      course = data;
      indexCourse();
      render();
      window.addEventListener("hashchange", render);
    })
    .catch(function () {
      main.innerHTML = '<div class="missing"><h1>The course did not load.</h1><p>Serve this folder over HTTP and refresh.</p></div>';
    });
})();
