import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./app.css";
import "./login.css";

export default function CreateAccount() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [major, setMajor] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    //Validate password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    //If we want to enforce password strength we should decide on how to enforce it, but this is a way to do it later.
    // if (password.length < 6) {
    //   setError("Password must be at least 6 characters");
    //   setLoading(false);
    //   return;
    // }

    try {
      //Test user doesn't already exist
      const { data: existingUser } = await supabase
        .from("Student")
        .select("*")
        .eq("Student_Qu_Email", email)
        .single();

      if (existingUser) {
        throw new Error("An account with this email already exists");
      }

      //Insert new student account
      const { data, error } = await supabase
        .from("Student")
        .insert({
          Student_Qu_Email: email,
          Password: password,
          FirstName: firstName,
          LastName: lastName,
          Major: major,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      //Successfully created account
      console.log("Account created:", data);
      alert("Account created successfully!");
      //navigate('/login');
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container login-page d-flex flex-column align-items-center justify-content-center">
      <h2>Create Account</h2>
      <div className="rectangle">
        <form className="vertical" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>First Name</label>
          </div>
          <div className="form-row">
            <input
              className="textbox"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label>Last Name</label>
          </div>
          <div className="form-row">
            <input
              className="textbox"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label>Major</label>
          </div>
          <div className="form-row">
            <input
              className="textbox"
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              required
            />
          </div>

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
            />
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
            />
          </div>

          <div className="form-row">
            <label>Confirm Password</label>
          </div>
          <div className="form-row">
            <input
              className="textbox"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="form-row">
              <p style={{ color: "red" }}>{error}</p>
            </div>
          )}

          <br />
          <div className="form-row">
            <button type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
