require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const { router: authRoutes } = require("./src/routes/auth");
const { router: projectRoutes } = require("./src/routes/projects");
const { router: fileRoutes } = require("./src/routes/files");

const app = express();
const PORT = Number(process.env.PORT || 3000);

for (const dir of [
    "data",
    "storage/projects",
    "storage/uploads",
    "storage/logs"
]) {
    fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
}

app.disable("x-powered-by");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(session({
    name: "private-hosting-session",
    secret: process.env.SESSION_SECRET || "CHANGE_THIS_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}));

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        authenticated: !!req.session?.authenticated,
        uptime: process.uptime()
    });
});

app.use("/api", (req, res) => {
    res.status(404).json({ error: "API route not found" });
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).json({
        error: err.message || "Internal server error"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("==========================================");
    console.log("       PRIVATE HOSTING PANEL v3");
    console.log("==========================================");
    console.log(`Local: http://localhost:${PORT}`);
    console.log("Status: ONLINE");
    console.log("==========================================");
});