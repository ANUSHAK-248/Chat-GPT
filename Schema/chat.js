const mongoose  = require("mongoose");

const Schema = mongoose.Schema;

const chatSchema = new Schema({
    qn : {
        type : String,
        required: true
    },
    ans : {
        type : String,
        required: true
    },
    page: { 
        type: Schema.Types.ObjectId, 
        ref: "Page", required: true 
    }
});


const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;