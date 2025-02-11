import mongoose from "mongoose";

const UserAppsSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    apps: [{ type: mongoose.Schema.Types.ObjectId, ref: "App" }]
});

export default mongoose.model("UserApps", UserAppsSchema);
