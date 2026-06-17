import React from "react";
import ReactDOM from "react-dom/client";
import { LogtoProvider } from "@logto/react";
import App from "./App.jsx";
import AuthGate from "./components/AuthGate.jsx";
import "./styles/global.css";

const logtoConfig = {
  endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
  appId: import.meta.env.VITE_LOGTO_APP_ID,
  scopes: ["openid", "email", "roles"],
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LogtoProvider config={logtoConfig}>
      <AuthGate>
        <App />
      </AuthGate>
    </LogtoProvider>
  </React.StrictMode>
);
