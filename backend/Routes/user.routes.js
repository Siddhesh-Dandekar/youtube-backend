import {registerUser , loginUser , fetchUser} from "../Controller/user.controller.js";
import VerifyToken from "../Middleware/verifytoken.js";

function userroutes(app){
    app.post('/signup', registerUser);
    app.post('/login', loginUser);
    // app.get('/user', fetchUser)
    app.get("/validuser",VerifyToken, fetchUser)
}


export default userroutes;