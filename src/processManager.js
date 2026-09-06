const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const running = new Map();

function logPath(id) {
    return path.join(
        __dirname,
        "..",
        "storage",
        "logs",
        `${id}.log`
    );
}

function writeLog(id, text) {
    fs.mkdirSync(
        path.dirname(logPath(id)),
        { recursive: true }
    );

    fs.appendFileSync(
        logPath(id),
        String(text),
        "utf8"
    );
}

function getCommand(project) {
    const entry = project.entry;

    switch (project.runtime) {
        case "node":
            return {
                command: process.platform === "win32" ? "node.exe" : "node",
                args: [entry]
            };

        case "python":
            return {
                command: process.platform === "win32" ? "python" : "python3",
                args: [entry]
            };

        case "php":
            return {
                command: "php",
                args: [entry]
            };

        case "ruby":
            return {
                command: "ruby",
                args: [entry]
            };

        case "lua":
            return {
                command: "lua",
                args: [entry]
            };

        case "shell":
            if (process.platform === "win32") {
                return {
                    command: "cmd.exe",
                    args: ["/c", entry]
                };
            }

            return {
                command: "sh",
                args: [entry]
            };

        case "java":
            if (entry.toLowerCase().endsWith(".jar")) {
                return {
                    command: "java",
                    args: ["-jar", entry]
                };
            }

            return {
                command: "java",
                args: [entry]
            };

        default:
            throw new Error(`Unsupported runtime: ${project.runtime}`);
    }
}

function startProject(project) {
    if (running.has(project.id)) {
        throw new Error("Project is already running");
    }

    const projectDir = path.join(
        __dirname,
        "..",
        "storage",
        "projects",
        project.id
    );

    if (!fs.existsSync(projectDir)) {
        throw new Error(
            `Project directory not found: ${projectDir}`
        );
    }

    const entryPath = path.join(
        projectDir,
        project.entry
    );

    if (!fs.existsSync(entryPath)) {
        writeLog(
            project.id,
            `\n[START ERROR] Entry file was not found.\n` +
            `Expected: ${entryPath}\n` +
            `Runtime: ${project.runtime}\n` +
            `Entry: ${project.entry}\n`
        );

        throw new Error(
            `Entry file not found: ${project.entry}`
        );
    }

    const { command, args } = getCommand(project);

    writeLog(
        project.id,
        `\n\n========================================\n` +
        `[START] ${new Date().toISOString()}\n` +
        `[PROJECT] ${project.name}\n` +
        `[RUNTIME] ${project.runtime}\n` +
        `[COMMAND] ${command} ${args.join(" ")}\n` +
        `[DIRECTORY] ${projectDir}\n` +
        `========================================\n`
    );

    let child;

    try {
        child = spawn(command, args, {
            cwd: projectDir,
            shell: false,
            windowsHide: true,
            env: {
                ...process.env,
                PROJECT_ID: project.id,
                PROJECT_NAME: project.name
            }
        });
    } catch (error) {
        writeLog(
            project.id,
            `\n[SPAWN ERROR]\n${error.stack || error}\n`
        );
        throw error;
    }

    const item = {
        child,
        startedAt: Date.now(),
        command,
        args
    };

    running.set(project.id, item);

    child.stdout.on("data", data => {
        writeLog(
            project.id,
            `[STDOUT] ${data}`
        );
    });

    child.stderr.on("data", data => {
        writeLog(
            project.id,
            `[STDERR] ${data}`
        );
    });

    child.on("error", error => {
        writeLog(
            project.id,
            `\n[PROCESS ERROR]\n${error.stack || error}\n`
        );
    });

    child.on("close", (code, signal) => {
        const runtime = Date.now() - item.startedAt;

        writeLog(
            project.id,
            `\n[PROCESS EXIT]\n` +
            `Code: ${code}\n` +
            `Signal: ${signal || "none"}\n` +
            `Runtime: ${Math.round(runtime / 1000)}s\n` +
            `Time: ${new Date().toISOString()}\n`
        );

        running.delete(project.id);

        if (
            project.autoRestart &&
            code !== 0
        ) {
            writeLog(
                project.id,
                `\n[AUTO RESTART] Restarting in 3 seconds...\n`
            );

            setTimeout(() => {
                try {
                    startProject(project);
                } catch (error) {
                    writeLog(
                        project.id,
                        `\n[AUTO RESTART ERROR]\n${error.stack || error}\n`
                    );
                }
            }, 3000);
        }
    });

    return child.pid;
}

function stopProject(id) {
    const item = running.get(id);

    if (!item) {
        writeLog(
            id,
            `\n[STOP] Project is not currently running.\n`
        );
        return false;
    }

    writeLog(
        id,
        `\n[STOP] Stopping process PID ${item.child.pid}...\n`
    );

    item.child.kill();

    return true;
}

function restartProject(project) {
    stopProject(project.id);

    setTimeout(() => {
        try {
            startProject(project);
        } catch (error) {
            writeLog(
                project.id,
                `\n[RESTART ERROR]\n${error.stack || error}\n`
            );
        }
    }, 500);
}

function status(id) {
    const item = running.get(id);

    if (!item) {
        return {
            running: false
        };
    }

    return {
        running: true,
        pid: item.child.pid,
        startedAt: item.startedAt,
        command: item.command,
        args: item.args
    };
}

function clearLogs(id) {
    const file = logPath(id);

    if (fs.existsSync(file)) {
        fs.writeFileSync(file, "", "utf8");
    }
}

function stopAll() {
    for (const id of running.keys()) {
        stopProject(id);
    }
}

process.on("SIGINT", () => {
    stopAll();
    process.exit(0);
});

process.on("SIGTERM", () => {
    stopAll();
    process.exit(0);
});

module.exports = {
    startProject,
    stopProject,
    restartProject,
    status,
    clearLogs,
    stopAll
};