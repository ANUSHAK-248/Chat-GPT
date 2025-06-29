// requires will not work here they will work only in app.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Size switching of windows by hamburger button
let h = document.querySelectorAll(".history");
let h1 = document.querySelector("#h1");
let h2 = document.querySelector("#h2");

let leftboxouter = document.querySelector(".leftboxouter")
let leftbox = document.querySelector(".leftbox")
let rightbox = document.querySelector(".rightbox")
let bottombox = document.querySelector(".bottom")
let textarea = document.querySelector("textarea")
let filecheck = document.querySelector("#filecheck")

let start = 0;

textarea.addEventListener("input", function () {
  this.style.height = "auto"; // Reset height to measure correctly
  const newHeight = Math.min(this.scrollHeight, 100);
  this.style.height = newHeight + "px";

  if (this.scrollHeight > 100) {
    this.style.overflowY = "scroll";
  } else {
    this.style.overflowY = "hidden";
  }
});

function setcapwidth() {
    if (window.getComputedStyle(leftboxouter).display == "none") {
        leftboxouter.style.display = "flex";
        rightbox.style.width = "79%";
        rightbox.style.border = " .001rem solid white";
        h2.style.display = "none";
        bottombox.style.width = "72%";
        bottombox.style.marginBottom = ".55%";
    } else {
        leftboxouter.style.display = "none";
        rightbox.style.width = "100%";
        rightbox.style.border = " none ";
        h2.style.display = "flex";
        bottombox.style.width = "80%";
    }
}

h.forEach(element => {
    element.addEventListener("click", setcapwidth);
});

// ----------------------------------------------- FILE HANDLING -------------------------------------------
let fileName = "";
let extension = "";
let filetext = "";
let files;

textarea.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow drop
});

textarea.addEventListener('drop', (e) => {
    e.preventDefault();
    files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

textarea.addEventListener('paste', (e) => {
    const item = e.clipboardData.items[0];

    if (item.kind === 'file') {
        const file = item.getAsFile();
        handleFile(file);
        e.preventDefault();
    }

});

function handleFile(file) {

    fileName = file.name;
    console.log('File Name:', fileName);
    extension = fileName.split('.').pop().toLowerCase();

    filecheck.style.display = "flex";
    filecheck.innerHTML = file.name;

    switch (extension) {
        case "doc":
        case "docx": readDOC(file);
            break;
        case "pdf": readPDF(file);
            break;
        case "txt": readTXT(file);
            break
    }

}

// Reading pdf
async function readPDF(file) {

    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided."));
            return;
        }

        if (!(file instanceof File)) {
            reject(new Error("Invalid file type. Must be a File object."));
            return;
        }

        // Check if pdf.js is loaded
        if (typeof pdfjsLib === 'undefined') {
            reject(new Error("pdf.js library not loaded. Make sure the CDN is correctly linked."));
            return;
        }

        const fileReader = new FileReader();

        fileReader.onload = async function () {
            try {
                const typedArray = new Uint8Array(this.result);
                // Load the PDF document
                const pdfDocument = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = "";
                // Iterate through pages
                for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                    const page = await pdfDocument.getPage(pageNum);
                    // Extract text content
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n"; // Add page break for readability
                }
                filetext = fullText;
                console.log(filetext);
                resolve(fullText);

            } catch (error) {
                reject(error);
            }
        };
        fileReader.onerror = function (error) {
            reject(error);
        };
        fileReader.readAsArrayBuffer(file); // Read file as ArrayBuffer
    });
}

// Reading doc usig mammoth
async function readDOC(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;

        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(function (result) {
                const html = result.value;
                filetext = html.substring(3, html.length - 4);
                console.log(filetext);
                const messages = result.messages;
                console.log(messages);
            })
            .catch(function (error) {
                console.error('Mammoth error:', error);
            });
    };
    reader.readAsArrayBuffer(file);

}

async function readTXT(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        filetext = e.target.result;
    };
    reader.readAsText(file);
}

// ----------------------------------------------------------------------------

let question = "";
let answer = "";
let greeting = document.querySelector(".greeting");
let responsebox = document.querySelector(".response");
responsebox.scrollTop = responsebox.scrollHeight;
// console.log(responsebox.scrollTop, responsebox.scrollHeight);


async function fetchAIResponse(data) {
    try {
        const response = await fetch("http://localhost:8000/process-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }) // ✅ Passing argument
        });
        const result = await response.json();
        answer = result.result
        answer = answer.replace(/\*\*/g, '').replace(/\n/g, '<br>');
    } catch (error) {
        console.log("Error in making call:", error);
    }
}

// ---------------------------------------------------------------------------

let currentpage = ""

//   Adding a chat in a page as soon as we send a qn
async function qnmaker(event) {
    if (event.shiftKey && event.code === "Enter") {
        return;
    }

    if (event.code === "Enter" && textarea.value !== "") {
        event.preventDefault();
        greeting.style.display = "none";

        if (fileName !== "") {
            let fil = document.createElement("img");
            fil.src = "pics/file6.jpg";
            fil.style.width = "30px";
            fil.style.marginRight = "5px";

            let fbox = document.createElement("div");
            fbox.classList.add("file");
            fbox.append(fil);
            fbox.append(fileName);
            responsebox.append(fbox);
        }

        let qn = document.createElement("div");
        qn.classList.add("qn");

        question = textarea.value;
        if (filetext === "") { // no file 
            // we got nth to do
        } else { // file

            if (question === "") { // no question but file exists
                question = "FILE CONTENT = " + "<br>" + "\"" + filetext + "\"" + "<br> <br>" + "give summary";
            } else { // question and file both exist
                question = "FILE CONTENT = " + "<br>" + "\"" + filetext + "\"" + "<br>" + question;
            }

        }

        qn.innerHTML = question;
        textarea.value = "";
        responsebox.append(qn);
        await fetchAIResponse(question);

        let ans = await document.createElement("div");
        await ans.classList.add("ans");
        ans.innerHTML = answer;

        // ans.textContent = answer;
        setTimeout(() => {
            responsebox.append(ans);
        }, 100);
        filecheck.style.display = "none";

        const activePageId = currentpage;

        if (activePageId) {
            await fetch("http://localhost:8000/addchat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pageId: activePageId, qn: question, ans: answer })
            });
        }
        fileName = "";
        extension = "";
        filetext = "";
        question = "";
        answer = "";
    }
}
textarea.addEventListener("keypress", qnmaker);


//  Loading all chats of a page in responsebox
async function loadChats(pageId) {
    console.log();
    currentpage = pageId
    console.log("Loading chats for page:", pageId);

    try {
        const response = await fetch(`http://localhost:8000/getchats/${pageId}`);
        const result = await response.json();

        responsebox.innerHTML = "";
        if (result.chats && result.chats.length > 0) {

            result.chats.forEach(chat => {
                let qn = document.createElement("div");
                qn.classList.add("qn");
                qn.innerHTML = chat.qn;
                responsebox.append(qn);

                let ans = document.createElement("div");
                ans.classList.add("ans");
                ans.innerHTML = chat.ans;
                responsebox.append(ans);
            });

            responsebox.dataset.activePageId = pageId;

        }
        else {
            greeting.style.display = "flex";
        }
    } catch (error) {
        console.error("Error loading chats:", error);
    }

    window.addEventListener("load", () => {
                responsebox.scrollTop = responsebox.scrollHeight;
    });

}
document.querySelectorAll(".page").forEach(page => {
    page.addEventListener("click", () => {
        loadChats(page.dataset.pageId);
    });
});
// ----------------------------------------------------------------------------



//  Creating a new page in leftbox
const newpage = document.querySelector("#newpage");
async function newpagefc() {
    console.log();
    const response = await fetch("http://localhost:8000/newpage", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();
    // console.log("new page created = " + result.pageId)
    if (result.pageId) {
        let pg = document.createElement("div");
        pg.classList.add("page");
        pg.style.marginTop = "10px";
        pg.dataset.pageId = result.pageId;
        pg.textContent = "New Page";
        pg.style.position = "relative";

        let bin = document.createElement("img");
        bin.src = "pics/bin.png";
        bin.style.width = "20px";
        bin.style.position = "absolute";
        bin.style.bottom = "5px";
        bin.style.right = "5px";
        bin.addEventListener("click", () => deletepage(pg.dataset.pageId));

        pg.appendChild(bin);
        leftbox.prepend(pg);

        pg.addEventListener("click", () => {
            loadChats(pg.dataset.pageId);
        });

        loadChats(result.pageId);
        
    }
}
newpage.addEventListener("click", newpagefc);


//  Deleting a page in leftbox
async function deletepage(pageId) {
    console.log();
    const response = await fetch("http://localhost:8000/deletepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId })
    });

    if (response.ok) {
        document.querySelector(`[data-page-id="${pageId}"]`).remove();
    }
    console.log("deleted page : "+pageId);
    greeting.style.display = "flex";
    greeting.style.zIndex = "10";
    console.log("greeting made "+greeting.style.display);
}


//  load all pages in leftbox 
async function loadPages() {
    try {        
        const response = await fetch("http://localhost:8000/getpages", {method : "GET", credentials: "include"});
                
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Fetch failed: ${response.status} — ${errorText}`);
        }
        const result = await response.json();

        leftbox.innerHTML = ""; // Clear previous pages

        result.pages.forEach(page => {
            let pg = document.createElement("div");
            pg.classList.add("page");

            pg.dataset.pageId = page._id;

            let firstChat = page.chats.length > 0 ? page.chats[0].qn : "New Page";
            pg.innerHTML = firstChat;
            pg.style.position = "relative";

            let bin = document.createElement("img");
            bin.src = "pics/bin.png";
            bin.style.width = "20px";
            bin.style.position = "absolute";
            bin.style.bottom = "5px";
            bin.style.right = "5px";
            bin.addEventListener("click", () => deletepage(page._id));

            pg.appendChild(bin);
            leftbox.prepend(pg);

            pg.addEventListener("click", () => {
                loadChats(pg.dataset.pageId);
            });
        });
    } catch (error) {
        console.error("Error loading pages:", error);
    }
}
document.addEventListener("DOMContentLoaded", loadPages);
// h2.addEventListener("click", loadPages);
// ----------------------------------------------------------------------------

