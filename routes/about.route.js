import express from "express";
const router = express.Router();

// GET /about
router.get("/aboutus", (req, res) => {
    res.render("vwAbout/aboutus", {
        title: "About Us",
    });
});

router.get("/contactus", (req, res) => {
    res.render("vwAbout/contactus", {
        title: "Contact Us",
    });
});

router.get("/faq", (req, res) => {
    res.render("vwAbout/faq", {
        title: "FAQs",
    });
});

router.get("/policy", (req, res) => {
    res.render("vwAbout/policy", {
        title: "Policy",
    });
});

export default router;
