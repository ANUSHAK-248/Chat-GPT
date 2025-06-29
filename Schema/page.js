const mongoose  = require("mongoose");

const Schema = mongoose.Schema;

const pageSchema = new Schema({
    chats : [
        {
            type : Schema.Types.ObjectId,
            ref: "Chat",
        }
    ],
    user: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    } // Links to a user
    
})


const Page = mongoose.model("Page", pageSchema);
module.exports = Page;