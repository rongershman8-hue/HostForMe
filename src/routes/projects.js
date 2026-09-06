const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { requireAuth } = require("../auth");
const { readProjects, writeProjects } = require("../store");
const manager = require("../processManager");

const router = express.Router();

router.use(requireAuth);

function safeName(name) {
    return String(name || "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .slice(0, 100);
}

router.get("/", (req, res) => {
    const projects = readProjects().map(project => ({
        ...project,
        status: manager.status(project.id)
    }));

    res.json(projects);
});

router.post("/", (req, res) => {
    const name = safeName(req.body.name);

    const type = [
        "bot",
        "website",
        "script"
    ].includes(req.body.type)
        ? req.body.type
        : "script";

    const runtime = [
        "node",
        "python",
        "php",
        "ruby",
        "lua",
        "java",
        "shell"
    ].includes(req.body.runtime)
        ? req.body.runtime
        : "node";

    const entry = safeName(req.body.entry) ||
        (runtime === "python" ? "main.py" : "index.js");

    if (!name) {
        return res.status(400).json({
            error: "שם פרויקט לא תקין"
        });
    }

    const projects = readProjects();

    const project = {
        id: crypto.randomUUID(),
        name,
        type,
        runtime,
        entry,
        autoRestart: type !== "website",
        createdAt: new Date().toISOString()
    };

    fs.mkdirSync(
        path.join(
            __dirname,
            "..",
            "..",
            "storage",
            "projects",
            project.id
        ),
        { recursive: true }
    );

    projects.push(project);
    writeProjects(projects);

    res.json(project);
});

router.post("/:id/start", (req, res) => {
    const project = readProjects()
        .find(p => p.id === req.params.id);

    if (!project) {
        return res.status(404).json({
            error: "Project not found"
        });
    }

    try {
        const pid = manager.startProject(project);

        res.json({
            ok: true,
            pid
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

router.post("/:id/stop", (req, res) => {
    res.json({
        ok: manager.stopProject(req.params.id)
    });
});

router.post("/:id/restart", (req, res) => {
    const project = readProjects()
        .find(p => p.id === req.params.id);

    if (!project) {
        return res.status(404).json({
            error: "Project not found"
        });
    }

    try {
        manager.restartProject(project);

        res.json({
            ok: true
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

router.get("/:id/status", (req, res) => {
    res.json(
        manager.status(req.params.id)
    );
});

router.get("/:id/logs", (req, res) => {
    const project = readProjects().find(
        p => p.id === req.params.id
    );

    if (!project) {
        return res.status(404).type("text").send("Project not found.");
    }

    const file = path.join(
        __dirname,
        "..",
        "..",
        "storage",
        "logs",
        `${req.params.id}.log`
    );

    if (!fs.existsSync(file)) {
        return res.type("text").send(
            "No logs yet. Start the project to create logs."
        );
    }

    const text = fs.readFileSync(file, "utf8");

    res.type("text").send(
        text.slice(-100000)
    );
});

router.delete("/:id/logs", (req, res) => {
    const project = readProjects().find(
        p => p.id === req.params.id
    );

    if (!project) {
        return res.status(404).json({
            error: "Project not found"
        });
    }

    manager.clearLogs(req.params.id);

    res.json({
        ok: true
    });
});

router.delete("/:id", (req, res) => {
    const projects = readProjects();

    const project = projects.find(
        p => p.id === req.params.id
    );

    if (!project) {
        return res.status(404).json({
            error: "Project not found"
        });
    }

    manager.stopProject(project.id);

    const dir = path.join(
        __dirname,
        "..",
        "..",
        "storage",
        "projects",
        project.id
    );

    fs.rmSync(dir, {
        recursive: true,
        force: true
    });

    fs.rmSync(
        path.join(
            __dirname,
            "..",
            "..",
            "storage",
            "logs",
            `${project.id}.log`
        ),
        { force: true }
    );

    writeProjects(
        projects.filter(
            p => p.id !== project.id
        )
    );

    res.json({
        ok: true
    });
});

module.exports = { router };