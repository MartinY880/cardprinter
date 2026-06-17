import { useEffect, useState } from "react";
import { useLogto, useHandleSignInCallback } from "@logto/react";

const REQUIRED_ROLE = "card-printer-user";

function Callback() {
  const { isLoading, error } = useHandleSignInCallback(() => {
    window.location.replace("/");
  });

  useEffect(() => {
    if (error) {
      console.error("Logto callback error:", error);
      window.location.replace("/");
    }
  }, [error]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#09090b", color: "#555",
      fontFamily: "'Outfit', sans-serif", fontSize: 13,
    }}>
      {isLoading ? "Signing in..." : "Redirecting..."}
    </div>
  );
}

export default function AuthGate({ children }) {
  const { isAuthenticated, isLoading, signIn, getIdTokenClaims, signOut } = useLogto();
  const isCallback = window.location.pathname === "/callback";
  const [hasRole, setHasRole] = useState(null);

  useEffect(() => {
    if (!isCallback && !isLoading && !isAuthenticated) {
      signIn(`${window.location.origin}/callback`);
    }
  }, [isLoading, isAuthenticated, isCallback, signIn]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getIdTokenClaims().then((claims) => {
      const roles = claims?.roles ?? [];
      setHasRole(roles.includes(REQUIRED_ROLE));
    }).catch(() => setHasRole(false));
  }, [isAuthenticated, getIdTokenClaims]);

  if (isCallback) return <Callback />;

  if (isLoading || !isAuthenticated || hasRole === null) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#09090b", color: "#555",
        fontFamily: "'Outfit', sans-serif", fontSize: 13,
      }}>
        Loading...
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, height: "100vh", background: "#09090b", color: "#888",
        fontFamily: "'Outfit', sans-serif", fontSize: 13,
      }}>
        <div>You don't have access to this application.</div>
        <button
          onClick={() => signOut(window.location.origin)}
          style={{ background: "none", border: "1px solid #333", color: "#666", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return children;
}
