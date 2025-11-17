import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./app.css";
import "./login.css";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Query your users table
      const { data, error } = await supabase
        .from("Student") // Replace 'users' with your actual table name
        .select("*")
        .eq("Student_Qu_Email", email)
        .eq("Password", password)
        .single();

      if (error || !data) {
        throw new Error("Invalid email or password");
      }

      // Successfully logged in
      console.log("Logged in:", data);
      // Store user data or redirect here
      // Example: localStorage.setItem('user', JSON.stringify(data));
      // Example: navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="app-container">
      <h2>Sign-In:</h2>
      <div className="rectangle">
        <form className="vertical" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Quinnipiac E-Mail</label>
          </div>
          <div className="form-row">
            <input
              className="textbox"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            ></input>
          </div>
          <div className="form-row">
            <label>Password</label>
          </div>
          <div className="form-row">
            <input
              className="textbox"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            ></input>
          </div>
          <br></br>
          <div className="form-row">
            <button type="submit" disabled={loading}>
              {loading ? "Logging In..." : "Log In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
