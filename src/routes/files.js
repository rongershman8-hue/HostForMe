const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const unzipper = require("unzipper");

const { requireAuth } = require("../auth");

const router = express.Router();

router.use(requireAuth);

const upload = multer({
    dest: path.join(
        __dirname,
        "..",
        "..",
        "storage",
        "uploads"
    )
});

function root(id) {
    return path.join(
        __dirname,
        "..",
        "..",
        "storage",
        "projects",
        id
    );
}

function safeRelative(value) {
    const normalized = path.normalize(
        String(value || "")
    );

    if (
        path.isAbsolute(normalized) ||
        normalized.includes("..")
    ) {
        throw new Error("Unsafe path");
    }

    return normalized;
}

router.post(
    "/:id/upload",
    upload.single("file"),
    async (req, res) => {
        try {
            const dir = root(req.params.id);

            if (!fs.existsSync(dir)) {
                throw new Error("Project not found");
            }

            if (!req.file) {
                throw new Error("No file uploaded");
            }

            const targetName = safeRelative(
                req.body.filename ||
                req.file.originalname
            );

            const target = path.join(
                dir,
                targetName
            );

            const resolvedDir = path.resolve(dir);
            const resolvedTarget = path.resolve(target);

            if (
                resolvedTarget !== resolvedDir &&
                !resolvedTarget.startsWith(
                    resolvedDir + path.sep
                )
            ) {
                throw new Error("Unsafe path");
            }

            if (
                req.file.originalname
                    .toLowerCase()
                    .endsWith(".zip")
            ) {
                await fs
                    .createReadStream(req.file.path)
                    .pipe(
                        unzipper.Extract({
                            path: dir
                        })
                    )
                    .promise();
            } else {
                fs.mkdirSync(
                    path.dirname(target),
                    { recursive: true }
                );

                fs.copyFileSync(
                    req.file.path,
                    target
                );
            }

            fs.rmSync(
                req.file.path,
                { force: true }
            );

            res.json({
                ok: true
            });
        } catch (error) {
            if (req.file) {
                fs.rmSync(
                    req.file.path,
                    { force: true }
                );
            }

            res.status(400).json({
                error: error.message
            });
        }
    }
);

router.get("/:id/list", (req, res) => {
    const dir = root(req.params.id);

    if (!fs.existsSync(dir)) {
        return res.status(404).json({
            error: "Project not found"
        });
    }

    function walk(current, prefix = "") {
        const result = [];

        for (
            const item of fs.readdirSync(
                current,
                { withFileTypes: true }
            )
        ) {
            const relative = path.join(
                prefix,
                item.name
            );

            if (item.isDirectory()) {
                result.push(
                    ...walk(
                        path.join(
                            current,
                            item.name
                        ),
                        relative
                    )
                );
            } else {
                result.push(relative);
            }
        }

        return result;
    }

    res.json(walk(dir));
});

module.exports = { router };