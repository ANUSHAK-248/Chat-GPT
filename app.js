if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}
const express = require("express")
const app = express()
const port = 8000

const path = require("path");
app.set("view engine", "ejs");// for ejs files
app.set("views", path.join(__dirname, "views"))

app.use(express.json()); // Middleware to parse JSON requests
app.use(express.urlencoded({ extended: true }));

const mongoose = require("mongoose");
const mongourl = process.env.mongourl;

const Chat = require("./Schema/chat.js")
const Page = require("./Schema/page.js")
const User = require("./Schema/user.js")

const methodOverride = require("method-override")
app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "/public"))); // for static files like js and css

const cookieParser= require("cookie-parser");
app.use(cookieParser(process.env.cookieSecret));

const session = require("express-session")
const sessionoptions = {
    secret: process.env.secretstring,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week  takes time in ms
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true, // prevents cross scripting attacks
    }
};
app.use(session(sessionoptions));

const passport = require("passport")
const LocalStrategy = require("passport-local")
app.use(passport.initialize());
app.use(passport.session()); // keep the session logged in 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser()); 
passport.deserializeUser(User.deserializeUser())  

const apiKey = process.env.GOOGLE_GENAI_API_KEY;
async function loadGoogleGenAI() {
    const { GoogleGenAI } = await import("@google/genai");
    return new GoogleGenAI({ apiKey: apiKey });
}

function checkAuthenticated(req, res, next) {
    if (!req.user) {
        console.log("please login / signup");
        return res.status(401).json({ error: "User not logged in to fetch pages" });
    }
    next();
}

// Optional: globally force JSON error on auth failure
app.use((err, req, res, next) => {
    if (err && err.name === 'AuthenticationError') {
        return res.status(401).json({ error: "Authentication failed" });
    }
    next(err);
});


const cors = require("cors");

app.use(cors({
  origin: "http://localhost:3000", // or the port where your frontend runs
  credentials: true
}));










app.get("/", (req, res) => {
    let username = ", you are not logged in";
    if (req.user) {
        username = req.user.username;
    }
    res.render("index.ejs",{username :username });
})

app.get("/signup", (req, res) => {
    res.render("signup.ejs");
})
app.post("/signingup", async (req, res) => {
    try {
        // To be made as per schema
        const newuser = new User({            
            username: req.body.username,
            email: req.body.email,            
        });

        let registeredUser = await User.register(newuser, req.body.pass);
        console.log("new sign up = ", registeredUser);
        // auto login after signup
        req.login(registeredUser, (err) => {
            if (err) {
                res.redirect("/login");
            }
            req.session.user = req.user.username;
            res.redirect("/")
        })
    } catch (err) {
        res.redirect("/signup");
    }
    
})

app.get("/login", (req, res) => {
    res.render("login.ejs");
})
app.post("/loggingin", passport.authenticate("local", { failureRedirect: "/signup" }), async(req, res) => {
    res.redirect("/");
})

app.post("/newpage", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "User not logged in to make a new page" });
    }

    try {
        const newPage = new Page({ user: req.user._id, chats: [] });
        await newPage.save();

        req.user.pages.push(newPage._id);
        await req.user.save();

        res.status(201).json({ message: "Page created", pageId: newPage._id });
    } catch (error) {
        res.status(500).json({ error: "Failed to create page" });
    }
});


app.get("/getpages", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "User not logged in to fetch pages" });
    }
    
    try {
        // const pages = await Page.find({ user: req.user._id }).populate("chats"); // alt command

        let user = await User.findById(req.user._id).populate({
            path: "pages",
            populate: { path: "chats" }
        });
        let pages = user.pages;
        
        res.status(200).json({pages});
        // let pages=  [ {qn : "What is your name", ans : "Anu" }, { qn : "What is your name", ans : "Anu"  }]        
        // res.status(200).json( { pages : [ {qn : "What is your name", ans : "Anu" }, { qn : "What is your name", ans : "Anu"  }] });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch pages" });
    }
});

app.post("/addchat", async (req, res) => {
    const { pageId, qn, ans } = req.body;

    if (!req.user) {
        return res.status(401).json({ error: "User not logged in to add a chat" });
    }

    try {
        const page = await Page.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }

        const newChat = new Chat({ qn, ans, page: pageId });
        await newChat.save();
        
        page.chats.push(newChat._id);
        await page.save();
        
        res.status(201).json({ message: "Chat added", chatId: newChat._id });
    } catch (error) {
        res.status(500).json({ error: "Failed to add chat" });
    }
});


app.get("/getchats/:pageId", async (req, res) => {
    const { pageId } = req.params;

    if (!req.user) {
        return res.status(401).json({ error: "User not logged in to get chats of the page" });
    }

    try {
        const page = await Page.findById(pageId).populate("chats");
        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }

        res.status(200).json({ chats: page.chats });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch chats" });
    }
});


app.post("/deletepage", async (req, res) => {
    const { pageId } = req.body;

    if (!req.user) {
        return res.status(401).json({ error: "User not logged in to delte pages" });
    }

    try {
        const page = await Page.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }

        await Chat.deleteMany({ page: pageId }); // Delete all chats in the page
        await Page.findByIdAndDelete(pageId); // Delete the page itself

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { pages: pageId }
        });


        req.user.pages = req.user.pages.filter(id => id.toString() !== pageId);
        await req.user.save();

        res.status(200).json({ message: "Page and chats deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete page and its chats" });
    }
});


let answer = "";

async function fetchAIResponse(question) {

    async function main2() {
        const ai = await loadGoogleGenAI();
        const response = await ai.models.generateContent({
            model: process.env.model,
            contents: [{ role: "user", parts: [{ text: question }] }],
            // contents: question,
        });
        answer = response.text;
        // console.log("answer received in api function = " + answer);
    }

    await main2();
    return answer;
    // return "faked response";
}

app.post("/process-data", async (req, res) => {
    const question = req.body.data; // Extracting argument from request body ( question basically )
    // await console.log("received data in call = " + req.body.data);
    if (!question) {
        return res.status(400).json({ error: "No data received" });
    }

    const answer = await fetchAIResponse(question);

    res.json({ message: "Data processed successfully!", result: answer });
});

app.listen(port, () => {
    console.log("server listening on port " + port)
})

async function main() {
    await mongoose.connect(mongourl);
}

main().then(() => {
    console.log("Connection with mongo successful");
}).catch((err) => {
    console.log("could not connect with mongo, error : " + err);
})