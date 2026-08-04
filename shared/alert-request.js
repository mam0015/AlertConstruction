(function () {
  "use strict";

  var THEME_KEY = "alert_request_theme_v1";
  var REQUEST_PREFIX = "alert_request_record_";
  var LAST_CODE_KEY = "alert_request_last_code";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var statusSteps = [
    {
      id: "request-received",
      label: "Request submitted",
      detail: "The customer's repair or building request is safely recorded with an Alert code."
    },
    {
      id: "team-review",
      label: "Team review",
      detail: "The Alert team reviews the job type, location, photos and notes."
    },
    {
      id: "site-visit",
      label: "Site visit booking",
      detail: "The customer is contacted to confirm whether a site visit is needed."
    },
    {
      id: "quote-scope",
      label: "Quote and scope",
      detail: "The job details are checked before pricing and scope are issued."
    },
    {
      id: "approved",
      label: "Ready to schedule",
      detail: "The customer approves the next step and the team prepares the job."
    },
    {
      id: "on-site",
      label: "Work in progress",
      detail: "Staff and tradie updates are added as the job progresses."
    },
    {
      id: "quality-check",
      label: "Quality check",
      detail: "Final checks, compliance notes and open items are reviewed."
    },
    {
      id: "handover",
      label: "Handover",
      detail: "The project is ready for handover and customer close-out."
    }
  ];

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
  }

  function setTheme(theme) {
    var next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-ac-theme", next);
    localStorage.setItem(THEME_KEY, next);
    $all("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-label", next === "light" ? "Switch to dark mode" : "Switch to light mode");
      button.dataset.mode = next;
    });
  }

  function installTheme() {
    setTheme(getStoredTheme());
    $all("[data-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        setTheme(document.documentElement.getAttribute("data-ac-theme") === "light" ? "dark" : "light");
      });
    });
  }

  function installNavigation() {
    var header = $("#appTopbar");
    var toggle = $("#menuToggle");
    if (!header) return;

    function refreshHeader() {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    }

    toggle?.addEventListener("click", function () {
      var open = !header.classList.contains("is-open");
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });

    document.addEventListener("click", function (event) {
      if (!header.contains(event.target)) {
        header.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        header.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
      }
    });

    $all(".app-nav a").forEach(function (link) {
      link.addEventListener("click", function () {
        header.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("scroll", refreshHeader, { passive: true });
    refreshHeader();
  }

  function installStory() {
    var scene = $("#requestStory");
    var rig = $("#storyRig");
    var consult = $("#consultCard");
    var phone = $("#phoneCard");
    var overlay = $("#storyOverlayImage");
    var progressBar = $("#storyProgress");
    var percent = $("#storyPercent");
    var state = $("#storyState");
    var title = $("#storyTitle");
    var text = $("#storyText");
    var copy = $("#storyCopy");
    if (!scene || !rig || !consult || !phone) return;

    var ticking = false;
    var copyA = {
      title: "Request a repair or building job.",
      text: "For house owners who need repair, renovation, inspection or building work. Use this panel to understand the request path, then open the form when you are ready."
    };
    var copyB = {
      title: "Get a code and check the next step.",
      text: "After the form is submitted, the customer receives a private Alert code and can check the request situation from a phone."
    };

    function updateScene() {
      ticking = false;
      if (reducedMotion) return;

      var rect = scene.getBoundingClientRect();
      var distance = Math.max(1, scene.offsetHeight - window.innerHeight);
      var raw = clamp(-rect.top / distance, 0, 1);
      var reveal = clamp((raw - 0.08) / 0.74, 0, 1);
      var eased = 1 - Math.pow(1 - reveal, 3);

      rig.style.transform =
        "rotateX(" + (5 - eased * 6).toFixed(2) + "deg) rotateY(" +
        (-7 + eased * 15).toFixed(2) + "deg) translate3d(0," +
        (-eased * 18).toFixed(1) + "px," + (-eased * 70).toFixed(1) + "px)";

      consult.style.opacity = String(clamp(1 - eased * 1.35, 0, 1));
      consult.style.transform =
        "rotateY(" + (-8 - eased * 24).toFixed(2) + "deg) rotateX(4deg) translateX(" +
        (-eased * 44).toFixed(1) + "%) translateZ(" + (22 - eased * 120).toFixed(1) + "px)";

      phone.style.opacity = String(clamp((eased - 0.16) / 0.74, 0, 1));
      phone.style.transform =
        "rotateY(" + (18 - eased * 18).toFixed(2) + "deg) rotateX(" +
        (3 - eased * 3).toFixed(2) + "deg) translateX(" +
        ((1 - eased) * 42).toFixed(1) + "%) translateZ(" + (-80 + eased * 116).toFixed(1) + "px)";

      if (overlay) {
        overlay.style.opacity = String(clamp(eased * 0.86, 0, 0.86));
        overlay.style.clipPath = "inset(0 " + ((1 - eased) * 100).toFixed(2) + "% 0 0)";
      }

      if (progressBar) progressBar.style.width = (eased * 100).toFixed(1) + "%";
      if (percent) percent.textContent = Math.round(eased * 100) + "%";
      if (state) {
        state.textContent = eased < 0.38 ? "House owner starts request" : eased < 0.78 ? "Alert code created" : "Customer checks progress";
      }
      if (title && text) {
        var active = eased > 0.52 ? copyB : copyA;
        title.textContent = active.title;
        text.textContent = active.text;
      }
      if (copy) {
        copy.style.transform = "translate3d(0," + (-raw * 24).toFixed(1) + "px,0)";
      }
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateScene);
      }
    }

    document.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    updateScene();
  }

  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3800);
  }

  function recordKey(code) {
    return REQUEST_PREFIX + String(code || "").toUpperCase();
  }

  function saveRecord(record) {
    localStorage.setItem(recordKey(record.code), JSON.stringify(record));
    localStorage.setItem(LAST_CODE_KEY, record.code);
  }

  function loadRecord(code) {
    if (!code) return null;
    try {
      return JSON.parse(localStorage.getItem(recordKey(code)));
    } catch (_) {
      return null;
    }
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function generateCode() {
    var now = new Date();
    var stamp = String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var suffix = "";
    for (var i = 0; i < 4; i += 1) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return "ATP-" + stamp + "-" + suffix;
  }

  function fieldError(field, message) {
    var wrapper = field.closest(".field") || field.closest(".check-row");
    if (!wrapper) return;
    wrapper.classList.toggle("is-invalid", Boolean(message));
    var error = wrapper.querySelector(".error-message");
    if (error) error.textContent = message || "";
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validateField(field) {
    var value = field.type === "checkbox" ? field.checked : String(field.value || "").trim();
    var message = "";
    if (field.required && !value) {
      message = field.type === "checkbox" ? "Please confirm before submitting." : "This information is required.";
    } else if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = "Enter a valid email address.";
    } else if (field.type === "tel" && value && value.replace(/[^\d]/g, "").length < 8) {
      message = "Enter a valid phone number.";
    }
    fieldError(field, message);
    return !message;
  }

  function installRequestForm() {
    var form = $("#customerRequestForm");
    if (!form) return;
    var status = $("#submitStatus");
    var submit = $("#submitRequest");
    var fields = $all("input, select, textarea", form).filter(function (field) {
      return field.name && field.type !== "file";
    });

    fields.forEach(function (field) {
      field.addEventListener("blur", function () {
        validateField(field);
      });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var valid = fields.every(validateField);
      if (!valid) {
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        firstInvalid?.focus();
        if (status) status.textContent = "Please check the highlighted fields.";
        return;
      }

      if (submit) submit.disabled = true;
      if (status) status.textContent = "Creating your private Alert code...";

      var data = new FormData(form);
      var fileInput = $("#projectFiles");
      var code = generateCode();
      var selectedFiles = fileInput ? Array.prototype.slice.call(fileInput.files).map(function (file) {
        return file.name;
      }) : [];
      var now = new Date();
      var record = {
        code: code,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: "request-received",
        statusNote: "Customer request submitted through the Alert customer request panel.",
        customerName: String(data.get("customerName") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        address: String(data.get("address") || "").trim(),
        suburb: String(data.get("suburb") || "").trim(),
        postcode: String(data.get("postcode") || "").trim(),
        projectType: String(data.get("projectType") || "").trim(),
        projectStage: String(data.get("projectStage") || "").trim(),
        budget: String(data.get("budget") || "").trim(),
        timeframe: String(data.get("timeframe") || "").trim(),
        contactPreference: String(data.get("contactPreference") || "").trim(),
        visitPreference: String(data.get("visitPreference") || "").trim(),
        description: String(data.get("description") || "").trim(),
        files: selectedFiles,
        notes: [
          {
            date: now.toISOString(),
            title: "Request received",
            body: "Alert team to review the details and contact the customer."
          }
        ]
      };

      saveRecord(record);
      window.setTimeout(function () {
        window.location.assign("../project-status/index.html?code=" + encodeURIComponent(code));
      }, 520);
    });
  }

  function getCurrentStatusIndex(statusId) {
    var index = statusSteps.findIndex(function (item) {
      return item.id === statusId;
    });
    return index < 0 ? 0 : index;
  }

  function fallbackRecord(code) {
    var now = new Date();
    return {
      code: code || "ATP-DEMO-260803",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: "team-review",
      statusNote: "Demo request loaded for preview.",
      customerName: "Customer preview",
      email: "customer@example.com",
      phone: "0460 006 004",
      address: "Suite 40/541 Blackburn Road",
      suburb: "Mount Waverley",
      postcode: "3149",
      projectType: "Home renovation",
      projectStage: "Planning",
      budget: "$50k to $100k",
      timeframe: "Next 1 to 3 months",
      contactPreference: "Phone",
      visitPreference: "Weekday morning",
      description: "Preview record for a house owner repair or building request.",
      files: [],
      notes: [
        {
          date: now.toISOString(),
          title: "Preview status created",
          body: "Use the staff update panel to change the project situation."
        }
      ]
    };
  }

  function renderStatus(record) {
    var index = getCurrentStatusIndex(record.status);
    var percent = Math.round((index / (statusSteps.length - 1)) * 100);
    var activeStep = statusSteps[index];

    $all("[data-record]").forEach(function (node) {
      var value = record[node.dataset.record] || "";
      node.textContent = value || "Not supplied";
    });

    var code = $("#projectCode");
    if (code) code.textContent = record.code;
    $all("[data-customer-link]").forEach(function (link) {
      link.setAttribute("href", "../project-status/index.html?code=" + encodeURIComponent(record.code));
    });
    var current = $("#currentStatus");
    if (current) current.textContent = activeStep.label;
    var note = $("#currentStatusNote");
    if (note) note.textContent = record.statusNote || activeStep.detail;
    var updated = $("#lastUpdated");
    if (updated) updated.textContent = formatDate(new Date(record.updatedAt || record.createdAt));
    var created = $("#createdAt");
    if (created) created.textContent = formatDate(new Date(record.createdAt));
    var progress = $("#projectProgress");
    if (progress) progress.style.width = percent + "%";
    var progressText = $("#projectProgressText");
    if (progressText) progressText.textContent = percent + "% through the Alert project path";

    var timeline = $("#statusTimeline");
    if (timeline) {
      timeline.innerHTML = statusSteps.map(function (step, stepIndex) {
        var stateClass = stepIndex < index ? "is-complete" : stepIndex === index ? "is-current" : "";
        var marker = String(stepIndex + 1);
        return '<li class="' + stateClass + '"><span class="timeline-marker">' + marker + '</span><span class="timeline-copy"><strong>' +
          step.label + '</strong><span>' + step.detail + '</span></span></li>';
      }).join("");
    }

    var notes = $("#statusNotes");
    if (notes) {
      notes.innerHTML = (record.notes || []).slice().reverse().map(function (item) {
        return '<li><strong>' + item.title + ' - ' + formatDate(new Date(item.date)) + '</strong><span>' + item.body + '</span></li>';
      }).join("");
    }

    var select = $("#staffStatus");
    if (select) select.value = record.status;
    var staffNote = $("#staffNote");
    if (staffNote && !staffNote.value) staffNote.value = record.statusNote || "";
  }

  function installStatusPage() {
    var holder = $("#projectCode");
    if (!holder) return;

    var params = new URLSearchParams(window.location.search);
    var requestedCode = params.get("code") || localStorage.getItem(LAST_CODE_KEY) || "";
    var record = loadRecord(requestedCode) || fallbackRecord(requestedCode);
    saveRecord(record);
    renderStatus(record);

    var select = $("#staffStatus");
    if (select) {
      select.innerHTML = statusSteps.map(function (item) {
        return '<option value="' + item.id + '">' + item.label + '</option>';
      }).join("");
      select.value = record.status;
    }

    $("#staffUpdateForm")?.addEventListener("submit", function (event) {
      event.preventDefault();
      var nextStatus = $("#staffStatus")?.value || record.status;
      var note = String($("#staffNote")?.value || "").trim();
      var step = statusSteps[getCurrentStatusIndex(nextStatus)];
      var now = new Date();
      record.status = nextStatus;
      record.statusNote = note || step.detail;
      record.updatedAt = now.toISOString();
      record.notes = record.notes || [];
      record.notes.push({
        date: now.toISOString(),
        title: step.label,
        body: record.statusNote
      });
      saveRecord(record);
      renderStatus(record);
      showToast("Project situation updated for code " + record.code + ".");
    });

    $("#lookupForm")?.addEventListener("submit", function (event) {
      event.preventDefault();
      var code = String($("#lookupCode")?.value || "").trim().toUpperCase();
      if (!code) return;
      var found = loadRecord(code);
      if (!found) {
        showToast("No local preview record found for " + code + ".");
        return;
      }
      window.location.assign("index.html?code=" + encodeURIComponent(code));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    installTheme();
    installNavigation();
    installStory();
    installRequestForm();
    installStatusPage();
  });
})();
