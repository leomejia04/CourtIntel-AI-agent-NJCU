import React, { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

interface RegisterProps {
  onRegister: (username: string, password: string) => Promise<void>;
  goToLogin: () => void;
  loading: boolean;
  error?: string;
}

export const Register: React.FC<RegisterProps> = ({ onRegister, goToLogin, loading, error }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      alert("Passwords must match");
      return;
    }
    await onRegister(username.trim(), password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#F3F4F6]">Create an account</h1>
          <p className="text-[#F3F4F6BF] mt-2">Sign up to explore the CourtIntel demo.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#000000] bg-opacity-75 rounded-2xl p-8 shadow-2xl space-y-5">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="Minimum 6 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
          <div className="text-center text-sm text-[#F3F4F6BF]">
            Already registered?{" "}
            <button type="button" className="text-[#1F4FFF]" onClick={goToLogin}>
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

