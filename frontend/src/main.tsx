import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "bg-popover text-popover-foreground border border-border shadow-md",
            },
          }}
        />
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>
);
