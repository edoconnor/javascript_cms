const express = require("express"); // server software
const bodyParser = require("body-parser"); // parser middleware
const session = require("express-session"); // session middleware
const passport = require("passport"); // authentication
const connectEnsureLogin = require("connect-ensure-login"); //authorization
const methodOverride = require("method-override");
const Article = require("./models/article");

const User = require("./user.js"); // User Model

const app = express();

PORT = process.env.PORT;

app.use(
  session({
    secret: "e0ee1c265d41fa0c16ed3a5d3f08f8cec962d17fd8c2858ea1560a5d0be874c9",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 hour
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.set("view engine", "ejs");

app.use(methodOverride("_method"));
app.use(express.static("public"));

function saveArticleAndRedirect(path) {
  return async (req, res) => {
    let article = req.article;
    article.title = req.body.title;
    article.subtitle = req.body.subtitle;
    article.image = req.body.image;
    article.content = req.body.content;
    try {
      article = await article.save();
      res.redirect(`/${article.slug}`);
    } catch (e) {
      res.render(`/admin-index/${path}`, { article: article });
    }
  };
}

app.get("/", async (req, res) => {
  const articles = await Article.find().sort({ createdAt: "desc" });
  res.render("index", { articles: articles });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/admin-home", (req, res) => {
  res.render("admin-home");
});

app.get(
  "/admin-index",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const articles = await Article.find().sort({ createdAt: "desc" });
    res.render("admin-index", { articles: articles });
  }
);

app.get("/new", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  res.render("new");
});

app.get("/edit/:id", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const article = await Article.findById(req.params.id);
  res.render("edit", { article: article });
});

app.get("/show/:slug", async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug });
  if (article == null) res.redirect("/");
  res.render("show", { article: article });
});

app.get(
  "/admin-show/:slug",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const article = await Article.findOne({ slug: req.params.slug });
    if (article == null) res.redirect("/");
    res.render("admin-show", { article: article });
  }
);

app.post(
  "/",
  async (req, res, next) => {
    req.article = new Article();
    next();
  },
  saveArticleAndRedirect("/index")
);

app.put(
  "/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res, next) => {
    req.article = await Article.findById(req.params.id);
    next();
  },
  saveArticleAndRedirect("edit")
);

app.delete("/:id", async (req, res) => {
  await Article.findByIdAndDelete(req.params.id);
  res.redirect("/");
});

app.post("logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/" }),
  function (req, res) {
    console.log(req.user);
    res.redirect("/admin-index");
  }
);
