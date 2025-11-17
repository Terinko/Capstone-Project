import "./app.css";
import "./login.css";

export default function Login() {
    return (
        <div className="app-container">
            <h2>Sign-In:</h2>
            <div className="rectangle">
                <form className="vertical">
                    <div className="form-row">
                        <label>Quinnipiac E-Mail</label>
                    </div>
                    <div className="form-row">
                        <input className="textbox"></input>
                    </div>
                    <div className="form-row">
                        <label>Password</label>
                    </div>
                    <div className="form-row">
                        <input className="textbox"></input>
                    </div>
                    <br></br>
                    <div className="form-row">
                        <button type="submit">
                            Log In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}