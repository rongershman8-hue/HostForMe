const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const projectForm = document.getElementById("projectForm");
const projectError = document.getElementById("projectError");
const projectsEl = document.getElementById("projects");
const welcome = document.getElementById("welcome");

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    const text = await response.text();

    let data;

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {
            error: text || `HTTP ${response.status}`
        };
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            `HTTP ${response.status}`
        );
    }

    return data;
}

async function checkLogin() {
    try {
        const data = await api("/api/auth/me");

        if (data.authenticated) {
            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");

            welcome.textContent =
                `מחובר כ־${data.username}`;

            await loadProjects();

            return true;
        }
    } catch (error) {
        console.error(error);
    }

    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    return false;
}

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    loginError.textContent = "";

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    try {
        await api("/api/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })
        });

        await checkLogin();

    } catch (error) {
        loginError.textContent =
            error.message;
    }
});

document
    .getElementById("logoutBtn")
    .addEventListener("click", async () => {
        try {
            await api("/api/auth/logout", {
                method: "POST"
            });
        } finally {
            location.reload();
        }
    });

projectForm.addEventListener("submit", async event => {
    event.preventDefault();

    projectError.textContent = "";

    try {
        await api("/api/projects", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name:
                    document
                        .getElementById("projectName")
                        .value,

                type:
                    document
                        .getElementById("projectType")
                        .value,

                runtime:
                    document
                        .getElementById("runtime")
                        .value,

                entry:
                    document
                        .getElementById("entry")
                        .value
            })
        });

        projectForm.reset();

        document.getElementById("entry").value =
            "index.js";

        await loadProjects();

    } catch (error) {
        projectError.textContent =
            error.message;
    }
});

document
    .getElementById("refreshBtn")
    .addEventListener(
        "click",
        loadProjects
    );

async function loadProjects() {
    try {
        const projects =
            await api("/api/projects");

        renderProjects(projects);

    } catch (error) {
        if (
            error.message === "Unauthorized"
        ) {
            location.reload();
            return;
        }

        projectsEl.innerHTML =
            `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
}

function renderProjects(projects) {
    if (!projects.length) {
        projectsEl.innerHTML =
            `<div class="card empty">
                אין עדיין פרויקטים.
            </div>`;

        return;
    }

    projectsEl.innerHTML =
        projects.map(project => {
            const running =
                project.status?.running;

            return `
                <div class="project">
                    <div class="project-top">
                        <div class="project-name">
                            ${escapeHtml(project.name)}
                        </div>

                        <div class="badge ${running ? "online" : "offline"}">
                            ${running ? "● ONLINE" : "● OFFLINE"}
                        </div>
                    </div>

                    <div class="meta">
                        סוג: ${escapeHtml(project.type)}
                        <br>
                        Runtime: ${escapeHtml(project.runtime)}
                        <br>
                        Entry: ${escapeHtml(project.entry)}
                        <br>
                        PID: ${running ? project.status.pid : "-"}
                    </div>

                    <div class="actions">
                        <button onclick="startProject('${project.id}')">
                            ▶ הפעל
                        </button>

                        <button onclick="stopProject('${project.id}')">
                            ■ עצור
                        </button>

                        <button onclick="restartProject('${project.id}')">
                            ↻ הפעלה מחדש
                        </button>

                        <button onclick="uploadProject('${project.id}')">
                            📤 העלאה
                        </button>

                        <button onclick="showFiles('${project.id}')">
                            📁 קבצים
                        </button>

                        <button onclick="showLogs('${project.id}')">
                            📜 Logs
                        </button>

                        <button class="danger"
                            onclick="deleteProject('${project.id}')">
                            🗑 מחק
                        </button>
                    </div>

                    <div id="extra-${project.id}"></div>
                </div>
            `;
        }).join("");
}

async function startProject(id) {
    await action(
        `/api/projects/${id}/start`,
        "POST"
    );
}

async function stopProject(id) {
    await action(
        `/api/projects/${id}/stop`,
        "POST"
    );
}

async function restartProject(id) {
    await action(
        `/api/projects/${id}/restart`,
        "POST"
    );
}

async function deleteProject(id) {
    if (!confirm("למחוק את הפרויקט וכל הקבצים שלו?")) {
        return;
    }

    await action(
        `/api/projects/${id}`,
        "DELETE"
    );
}

async function action(url, method) {
    try {
        await api(url, { method });

        await loadProjects();

    } catch (error) {
        alert(error.message);
    }
}

async function uploadProject(id) {
    const input =
        document.createElement("input");

    input.type = "file";

    input.onchange = async () => {
        if (!input.files[0]) return;

        const formData =
            new FormData();

        formData.append(
            "file",
            input.files[0]
        );

        try {
            await api(
                `/api/files/${id}/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            alert("הקובץ הועלה בהצלחה.");

        } catch (error) {
            alert(error.message);
        }
    };

    input.click();
}

async function showFiles(id) {
    const container =
        document.getElementById(
            `extra-${id}`
        );

    try {
        const files =
            await api(
                `/api/files/${id}/list`
            );

        container.innerHTML = `
            <div class="logs">
                ${files.length
                    ? files.map(escapeHtml).join("\n")
                    : "אין קבצים."
                }
            </div>
        `;

    } catch (error) {
        alert(error.message);
    }
}

async function showLogs(id) {
    const container =
        document.getElementById(`extra-${id}`);

    try {
        const logs =
            await api(`/api/projects/${id}/logs`);

        container.innerHTML = `
            <div class="actions" style="margin-top:12px">
                <button onclick="showLogs('${id}')">
                    🔄 רענן Logs
                </button>
                <button class="danger" onclick="clearLogs('${id}')">
                    🧹 נקה Logs
                </button>
            </div>
            <pre class="logs">${escapeHtml(logs)}</pre>
        `;

    } catch (error) {
        alert(error.message);
    }
}

async function clearLogs(id) {
    if (!confirm("לנקות את כל ה-Logs של הפרויקט?")) {
        return;
    }

    try {
        await api(`/api/projects/${id}/logs`, {
            method: "DELETE"
        });

        await showLogs(id);
    } catch (error) {
        alert(error.message);
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

checkLogin();

setInterval(() => {
    if (!appScreen.classList.contains("hidden")) {
        loadProjects();
    }
}, 5000);