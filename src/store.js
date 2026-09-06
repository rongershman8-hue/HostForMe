const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "projects.json");

function ensure() {
    if (!fs.existsSync(file)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, "[]", "utf8");
    }
}

function readProjects() {
    ensure();

    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return [];
    }
}

function writeProjects(projects) {
    ensure();

    fs.writeFileSync(
        file,
        JSON.stringify(projects, null, 2),
        "utf8"
    );
}

module.exports = {
    readProjects,
    writeProjects
};