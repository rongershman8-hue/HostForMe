const express = require("express");

const router = express.Router();

const USERNAME =
    process.env.PANEL_USERNAME || "ron";

const PASSWORD =
    process.env.PANEL_PASSWORD || "CHANGE_THIS_PASSWORD";

router.get("/me", (req, res) => {
    if (req.session?.authenticated === true) {
        return res.json({
            authenticated: true,
            username: req.session.username
        });
    }

    return res.json({
        authenticated: false
    });
});

router.post("/login", (req, res) => {
    const { username, password } = req.body || {};

    if (
        username !== USERNAME ||
        password !== PASSWORD
    ) {
        return res.status(401).json({
            error: "שם משתמש או סיסמה שגויים"
        });
    }

    req.session.regenerate(err => {
        if (err) {
            console.error("SESSION REGENERATE ERROR:", err);
            return res.status(500).json({
                error: "Session error"
            });
        }

        req.session.authenticated = true;
        req.session.username = username;

        req.session.save(saveError => {
            if (saveError) {
                console.error("SESSION SAVE ERROR:", saveError);
                return res.status(500).json({
                    error: "Failed to save session"
                });
            }

            console.log(`LOGIN SUCCESS: ${username}`);

            return res.json({
                ok: true,
                authenticated: true,
                username
            });
        });
    });
});

router.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("LOGOUT ERROR:", err);
            return res.status(500).json({
                error: "Failed to logout"
            });
        }

        res.clearCookie("private-hosting-session");

        return res.json({
            ok: true
        });
    });
});

module.exports = { router };